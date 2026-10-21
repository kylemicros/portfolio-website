import { GLOW_REACH, moonAt, skyNow, type MoonMotion } from "@/lib/moon-arc";

/**
 * The night sky's WebGL layer: one full-screen fragment shader that draws the sky's gradient,
 * two layers of drifting stars, the moon and four layers of clouds in front of it. It runs in a
 * worker where the browser can hand it the canvas (see `sky.worker.ts`), so creating the WebGL
 * context, which can stall for tens of milliseconds, never blocks the page; elsewhere it runs in
 * the page. Either way it loads once the page is idle, and since everything is drawn on the
 * canvas, none of it can become the page's largest contentful paint.
 */

// Share of CSS pixels the canvas renders at (at most one canvas pixel per CSS pixel, whatever
// the screen's density). The sky is soft, so CSS scaling it up loses nothing that shows.
const RESOLUTION = 0.55;
// About 30 frames a second: the drift and twinkle are slow, so more frames buy nothing.
const FRAME_INTERVAL = 1000 / 30;
// How quickly the clouds catch up with the scroll position: the share of the gap closed per second
// is 1 - e^-EASE_RATE.
const EASE_RATE = 3.2;
// The time shown when motion is reduced: a still frame with the stars mid-twinkle.
const STILL_TIME = 12;
// Seconds the clouds take to fade in once they have loaded.
const CLOUD_FADE = 1;

interface CloudLayer {
  src: string;
  /** Top edge, as a share of the sky's height. */
  top: number;
  /** Height, as a share of the sky's height. */
  height: number;
  opacity: number;
  /** Seconds to drift one image width to the left. */
  drift: number;
  /** How far the layer slides left over the whole page, as a share of the sky's width. */
  parallax: number;
  /** How far it rises over the whole page, as a share of the sky's height. */
  lift: number;
}

// Pre-tinted from GOBI Studio's hand-painted clouds (credited in public/sky/CREDITS.txt). Back to
// front: scattered far clouds, a bank, the nearest bank, then low wisps. All sit in the lower half
// of the sky, clear of the moon's climb and of most headings. Each image tiles sideways.
const CLOUDS: readonly CloudLayer[] = [
  { src: "/sky/clouds-3.webp", top: 0.44, height: 0.26, opacity: 0.45, drift: 150, parallax: 0.08, lift: 0.03 },
  { src: "/sky/clouds-2.webp", top: 0.62, height: 0.36, opacity: 0.7, drift: 200, parallax: 0.14, lift: 0.05 },
  { src: "/sky/clouds-1.webp", top: 0.72, height: 0.4, opacity: 0.85, drift: 95, parallax: 0.22, lift: 0.07 },
  { src: "/sky/clouds-4.webp", top: 0.88, height: 0.2, opacity: 0.55, drift: 70, parallax: 0.3, lift: 0.09 },
];

const VERTEX_SHADER = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

// y runs up from the bottom in gl_FragCoord, so the sky's gradient reads from the horizon up.
// High precision where the device has it: the star hash runs on pixel coordinates, which overflow
// the 16-bit floats some phones use for medium precision.
const FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uMoon;
uniform sampler2D uCloud0;
uniform sampler2D uCloud1;
uniform sampler2D uCloud2;
uniform sampler2D uCloud3;
// Per layer: top, height, image aspect, opacity; then seconds per image width, parallax, lift.
uniform vec4 uLayer[4];
uniform vec4 uMotion[4];
uniform float uCloudTime;
uniform float uCloudShift;
uniform float uCloudAlpha;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
  return v;
}

float starLayer(vec2 frag, float cell, float t, float density) {
  vec2 g = floor(frag / cell), f = fract(frag / cell);
  float h = hash(g);
  if (h < density) return 0.0;
  vec2 pos = vec2(hash(g + 1.3), hash(g + 7.1)) * 0.7 + 0.15;
  float d = length(f - pos) * cell;
  float twinkle = 0.55 + 0.45 * sin(t * (0.8 + hash(g + 2.0) * 2.5) + h * 40.0);
  float size = 0.6 + hash(g + 4.0) * 1.1;
  return smoothstep(size, 0.0, d) * twinkle;
}

// One cloud layer over the colour so far. "below" is measured down from the top of the sky.
vec3 cloud(vec3 col, sampler2D tex, vec4 layer, vec4 motion, float x, float below) {
  float h = layer.y * uResolution.y;
  float v = (below - (layer.x - motion.z * uCloudShift) * uResolution.y) / h;
  if (v < 0.0 || v > 1.0) return col;
  float tile = h * layer.z;
  float u = fract((x + uCloudTime * tile / motion.x + uCloudShift * motion.y * uResolution.x) / tile);
  // The images are uploaded with premultiplied alpha.
  vec4 c = texture2D(tex, vec2(u, v));
  float k = layer.w * uCloudAlpha;
  return col * (1.0 - c.a * k) + c.rgb * k;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / uResolution;
  float y = uv.y;

  // Maroon-black overhead, oxblood, a deep red, a crimson band on the horizon, plum haze below.
  vec3 top = vec3(0.039, 0.008, 0.016), oxblood = vec3(0.165, 0.02, 0.035), deep = vec3(0.306, 0.035, 0.07);
  vec3 band = vec3(0.647, 0.102, 0.125), haze = vec3(0.204, 0.141, 0.204);
  vec3 col = mix(band, deep, smoothstep(0.0, 0.22, y));
  col = mix(col, oxblood, smoothstep(0.18, 0.5, y));
  col = mix(col, top, smoothstep(0.45, 1.0, y));
  col = mix(col, haze, (1.0 - smoothstep(0.0, 0.08, y)) * 0.45);

  // Sparse warm stars in the upper sky, drifting slowly left.
  vec2 sf = frag + vec2(uTime * 4.0, 0.0);
  float stars = starLayer(sf, 11.0, uTime, 0.975) + starLayer(sf + 37.0, 27.0, uTime * 0.7, 0.93) * 1.3;
  col += vec3(1.0, 0.9, 0.86) * stars * smoothstep(0.35, 0.75, y) * 0.8;

  // The moon: a crimson disc with a softer rim, darker blood-red patches and a red glow. The glow
  // fades out over its last radius to nothing at GLOW_REACH radii, so the loop knows when the
  // moon has wholly left the sky.
  vec2 d = (frag - uMoon.xy) / uMoon.z;
  float r = length(d);
  float glow = 1.0 - smoothstep(${(GLOW_REACH - 1).toFixed(1)}, ${GLOW_REACH.toFixed(1)}, r);
  col += (vec3(0.91, 0.28, 0.23) * exp(-max(r - 1.0, 0.0) * 3.2) * 0.45 + vec3(0.6, 0.06, 0.08) * exp(-max(r - 1.0, 0.0) * 0.7) * 0.25) * glow;
  if (r < 1.02) {
    vec3 core = vec3(0.702, 0.071, 0.106), rim = vec3(0.91, 0.278, 0.227);
    vec3 patchColor = vec3(0.45, 0.03, 0.06), deepPatch = vec3(0.30, 0.01, 0.04);
    vec3 m = mix(core, rim, smoothstep(0.35, 1.0, r) * 0.55 + (1.0 - smoothstep(0.0, 0.5, r)) * 0.15);
    float f = fbm(d * 1.2 + vec2(3.1, 7.3));
    float f2 = fbm(d * 2.4 + vec2(9.2, 1.7));
    m = mix(m, patchColor, smoothstep(0.5, 0.62, f) * 0.45);
    m = mix(m, deepPatch, smoothstep(0.64, 0.74, f) * 0.3 + smoothstep(0.68, 0.78, f2) * 0.15);
    m *= 1.0 - pow(r, 5.0) * 0.2;
    col = mix(col, m, 1.0 - smoothstep(0.985, 1.0, r));
  }

  // The clouds, in front of the moon, back to front.
  if (uCloudAlpha > 0.0) {
    float below = uResolution.y - frag.y;
    col = cloud(col, uCloud0, uLayer[0], uMotion[0], frag.x, below);
    col = cloud(col, uCloud1, uLayer[1], uMotion[1], frag.x, below);
    col = cloud(col, uCloud2, uLayer[2], uMotion[2], frag.x, below);
    col = cloud(col, uCloud3, uLayer[3], uMotion[3], frag.x, below);
  }

  // A slight vignette.
  vec2 v = uv - 0.5;
  col *= 1.0 - smoothstep(0.35, 0.95, length(v * vec2(uResolution.x / uResolution.y, 1.0))) * 0.25;

  gl_FragColor = vec4(col, 1.0);
}
`;

export interface SkyCallbacks {
  /** The first frame is on the canvas. */
  onReady: () => void;
  /** WebGL is missing, the shader failed or the context was lost: the CSS sky shows instead. */
  onFallback: () => void;
}

export interface SkyOptions {
  /** The canvas's size in CSS pixels. */
  width: number;
  height: number;
  /** The scroll progress when the sky starts, so the first frame already has the clouds in place. */
  progress: number;
  /** The moon's clock and the visitor's hold on it (see `moon-arc.ts`). */
  motion: MoonMotion;
  reducedMotion: boolean;
}

export interface SkyHandle {
  /** The page's scroll progress, 0 to 1. The clouds' parallax eases toward it. */
  setProgress: (progress: number) => void;
  /** The moon's clock and the visitor's hold on it, whenever either changes. */
  setMoon: (motion: MoonMotion) => void;
  /** Still frame, moved only by the visitor dragging the moon (true), or moving (false). */
  setReducedMotion: (reduced: boolean) => void;
  /** The canvas's new size in CSS pixels. */
  setSize: (width: number, height: number) => void;
  /** Pauses drawing while the page is hidden. */
  setHidden: (hidden: boolean) => void;
  /** Stops drawing and releases the context's listeners. */
  destroy: () => void;
}

/** The page's own canvas, or one handed to a worker. */
export type SkyCanvas = HTMLCanvasElement | OffscreenCanvas;

interface Program {
  resolution: WebGLUniformLocation | null;
  time: WebGLUniformLocation | null;
  moon: WebGLUniformLocation | null;
  cloudTime: WebGLUniformLocation | null;
  cloudShift: WebGLUniformLocation | null;
  cloudAlpha: WebGLUniformLocation | null;
}

// Workers in some browsers have no requestAnimationFrame: a timer at the frame rate stands in.
function nextFrame(callback: (now: number) => void): number {
  if (typeof requestAnimationFrame === "function") return requestAnimationFrame(callback);
  return self.setTimeout(() => callback(performance.now()), FRAME_INTERVAL);
}

function cancelFrame(id: number): void {
  if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(id);
  else self.clearTimeout(id);
}

// HTMLCanvasElement does not exist inside a worker.
function isPageCanvas(canvas: SkyCanvas): canvas is HTMLCanvasElement {
  return typeof HTMLCanvasElement !== "undefined" && canvas instanceof HTMLCanvasElement;
}

function webglContext(canvas: SkyCanvas): WebGLRenderingContext | null {
  const attributes: WebGLContextAttributes = {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: "low-power",
  };
  // The two canvas types declare getContext separately.
  return isPageCanvas(canvas) ? canvas.getContext("webgl", attributes) : canvas.getContext("webgl", attributes);
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

/**
 * Starts the program's compile and link. With `KHR_parallel_shader_compile` the driver works on
 * its own thread and the result is polled once a frame, so the compile never blocks a frame.
 */
function buildProgram(gl: WebGLRenderingContext, done: (program: WebGLProgram | null) => void): () => void {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) {
    done(null);
    return () => {};
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);

  const finish = () => {
    const linked = gl.getProgramParameter(program, gl.LINK_STATUS) === true;
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    done(linked ? program : null);
  };

  const parallel = gl.getExtension("KHR_parallel_shader_compile");
  if (!parallel) {
    finish();
    return () => {};
  }
  let frame = 0;
  const poll = () => {
    if (gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR) === true) finish();
    else frame = nextFrame(poll);
  };
  frame = nextFrame(poll);
  return () => cancelFrame(frame);
}

/**
 * Fetches the cloud images at low priority, after the sky is up, and decodes them off the main
 * thread. Premultiplied and without colour conversion, they upload to the GPU without the browser
 * converting every pixel first.
 */
function loadClouds(): Promise<ImageBitmap[]> {
  return Promise.all(
    CLOUDS.map(async (cloud) => {
      const response = await fetch(cloud.src, { priority: "low" });
      if (!response.ok) throw new Error(`${cloud.src}: ${response.status}`);
      const blob = await response.blob();
      return createImageBitmap(blob, { premultiplyAlpha: "premultiply", colorSpaceConversion: "none" });
    })
  );
}

/**
 * Starts the sky on the canvas, in the page or in a worker. Returns null when WebGL is not
 * available. The caller reports size, visibility, scroll progress, the moon's motion and the
 * motion preference.
 */
export function startSky(canvas: SkyCanvas, options: SkyOptions, callbacks: SkyCallbacks): SkyHandle | null {
  const context = webglContext(canvas);
  if (!context) {
    callbacks.onFallback();
    return null;
  }
  const gl = context;

  let cssWidth = options.width;
  let cssHeight = options.height;
  let reduced = options.reducedMotion;
  let motion = options.motion;
  let hidden = false;
  let target = options.progress;
  let eased = options.progress;
  // The first frame places the moon where it belongs, rather than sweeping it there.
  let placed = false;
  let program: Program | null = null;
  let builtProgram: WebGLProgram | null = null;
  let cancelBuild = () => {};
  let frame = 0;
  let lastDraw = 0;
  let lastTime = 0;
  let elapsed = 0;
  let ready = false;
  let lost = false;
  let destroyed = false;

  // The cloud images, once decoded, are kept so a restored context can upload them again.
  let cloudImages: ImageBitmap[] = [];
  let cloudsLoading = false;
  let texturesUploaded = 0;
  let cloudFade = 0;

  const resize = () => {
    const width = Math.max(1, Math.round(cssWidth * RESOLUTION));
    const height = Math.max(1, Math.round(cssHeight * RESOLUTION));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
  };

  // One texture per frame, so no single frame carries all four uploads.
  const uploadNextCloud = (built: WebGLProgram) => {
    const index = texturesUploaded;
    const image = cloudImages[index];
    const cloud = CLOUDS[index];
    if (!image || !cloud) return;
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + index);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // The images are not powers of two: no mipmaps, clamped edges (the shader wraps them itself).
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.uniform1i(gl.getUniformLocation(built, `uCloud${index}`), index);
    gl.uniform4f(
      gl.getUniformLocation(built, `uLayer[${index}]`),
      cloud.top,
      cloud.height,
      image.width / Math.max(1, image.height),
      cloud.opacity
    );
    gl.uniform4f(gl.getUniformLocation(built, `uMotion[${index}]`), cloud.drift, cloud.parallax, cloud.lift, 0);
    texturesUploaded += 1;
  };

  const draw = (now: number) => {
    if (!program || !builtProgram) return;
    const dt = lastTime ? Math.min(0.1, (now - lastTime) / 1000) : 0;
    lastTime = now;
    if (!reduced) elapsed += dt;

    if (reduced || !placed) eased = target;
    else eased += (target - eased) * (1 - Math.exp(-EASE_RATE * dt));
    placed = true;

    if (texturesUploaded < cloudImages.length) uploadNextCloud(builtProgram);
    const cloudsReady = cloudImages.length > 0 && texturesUploaded === cloudImages.length;
    if (cloudsReady) cloudFade = reduced ? 1 : Math.min(1, cloudFade + dt / CLOUD_FADE);

    // The moon is placed in CSS pixels, then scaled to the canvas, whose y runs upward.
    const scale = canvas.width / Math.max(1, cssWidth);
    const moon = moonAt(motion, skyNow(), cssWidth, cssHeight, reduced);
    const time = reduced ? STILL_TIME : STILL_TIME + elapsed;
    gl.uniform2f(program.resolution, canvas.width, canvas.height);
    gl.uniform1f(program.time, time);
    gl.uniform3f(program.moon, moon.x * scale, canvas.height - moon.y * scale, moon.r * scale);
    gl.uniform1f(program.cloudTime, time);
    // With reduced motion the clouds hold still, whatever the scroll.
    gl.uniform1f(program.cloudShift, reduced ? 0 : eased);
    gl.uniform1f(program.cloudAlpha, cloudsReady ? cloudFade : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (!ready) {
      ready = true;
      callbacks.onReady();
      startClouds();
    }
  };

  const loop = (now: number) => {
    frame = 0;
    if (now - lastDraw < FRAME_INTERVAL - 2) {
      frame = nextFrame(loop);
      return;
    }
    lastDraw = now;
    draw(now);
    // A still sky draws once each time the visitor moves the moon, and until its clouds are in.
    const settling = texturesUploaded < cloudImages.length;
    if (!reduced || settling) frame = nextFrame(loop);
  };

  const schedule = () => {
    if (destroyed || lost || hidden || !program || frame) return;
    frame = nextFrame(loop);
  };

  const stop = () => {
    if (frame) cancelFrame(frame);
    frame = 0;
  };

  // The clouds are fetched once the first frame is up, and never again.
  const startClouds = () => {
    if (cloudsLoading) return;
    cloudsLoading = true;
    loadClouds().then(
      (images) => {
        if (destroyed) return;
        cloudImages = images;
        schedule();
      },
      // Without the clouds the sky still works; nothing to report.
      () => {}
    );
  };

  const setUp = () => {
    cancelBuild = buildProgram(gl, (built) => {
      if (destroyed || lost) return;
      if (!built) {
        callbacks.onFallback();
        return;
      }
      gl.useProgram(built);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(built, "position");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      builtProgram = built;
      program = {
        resolution: gl.getUniformLocation(built, "uResolution"),
        time: gl.getUniformLocation(built, "uTime"),
        moon: gl.getUniformLocation(built, "uMoon"),
        cloudTime: gl.getUniformLocation(built, "uCloudTime"),
        cloudShift: gl.getUniformLocation(built, "uCloudShift"),
        cloudAlpha: gl.getUniformLocation(built, "uCloudAlpha"),
      };
      resize();
      schedule();
    });
  };

  const onLost = (event: Event) => {
    // Lets the browser restore the context later.
    event.preventDefault();
    lost = true;
    stop();
    cancelBuild();
    program = null;
    builtProgram = null;
    // The textures went with the context; the images are kept for the restore.
    texturesUploaded = 0;
    cloudFade = 0;
    ready = false;
    callbacks.onFallback();
  };

  const onRestored = () => {
    lost = false;
    placed = false;
    setUp();
  };

  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);
  setUp();

  return {
    setProgress(progress) {
      // A moving sky draws every frame anyway, and a still one ignores the scroll.
      target = progress;
    },
    setMoon(next) {
      motion = next;
      schedule();
    },
    setReducedMotion(next) {
      reduced = next;
      placed = false;
      lastTime = 0;
      schedule();
    },
    setSize(width, height) {
      cssWidth = width;
      cssHeight = height;
      if (!program) return;
      resize();
      // Drawn straight away, so a resized canvas is never shown blank.
      draw(performance.now());
    },
    setHidden(next) {
      hidden = next;
      if (hidden) stop();
      else {
        // The hidden time does not count: the stars carry on from where they were.
        lastTime = 0;
        schedule();
      }
    },
    destroy() {
      destroyed = true;
      stop();
      cancelBuild();
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
    },
  };
}
