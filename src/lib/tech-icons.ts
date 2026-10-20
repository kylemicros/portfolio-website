import type { Skill } from "@/lib/site";

// The toolkit's one-colour marks and the seal live in one static sprite,
// `public/sprites/dossier.svg`, one `<symbol>` per id below. Each is drawn on the server as
// `<svg><use href="/sprites/dossier.svg#id"/></svg>`, filled with `currentColor`. The sprite is a same-origin
// file the browser caches, so the path data is not repeated in every page's HTML and payload.
//
// Sources and licences (also noted in the sprite):
// - Simple Icons 16.35.0 (simpleicons.org), released under CC0 1.0. The marks themselves remain the
//   trademarks of their owners.
// - Devicon (devicon.dev), MIT licence, Copyright (c) 2015 konpa: C#, Azure, AWS and Playwright,
//   which Simple Icons does not carry.
// - "pipeline": drawn for this site, for skills with no brand mark of their own.
// - "seal-nazo": the glyph 謎 from Noto Serif JP (SIL Open Font License 1.1).
// Brand path numbers in the sprite are rounded (two decimals in a 24-unit box, one in a 128-unit
// box), which changes nothing visible at the sizes used.

/** The sprite's URL. */
export const SPRITE = "/sprites/dossier.svg";

/** Every symbol id in the sprite. */
export type SpriteId =
  | "nextdotjs"
  | "react"
  | "vuedotjs"
  | "quasar"
  | "typescript"
  | "tailwindcss"
  | "radixui"
  | "shadcnui"
  | "tanstack"
  | "expo"
  | "nestjs"
  | "dotnet"
  | "csharp"
  | "springboot"
  | "openjdk"
  | "nodedotjs"
  | "express"
  | "postgresql"
  | "prisma"
  | "neon"
  | "docker"
  | "kubernetes"
  | "githubactions"
  | "azure"
  | "aws"
  | "pipeline"
  | "vitest"
  | "playwright"
  | "puppeteer"
  | "figma"
  | "seal-nazo";

/** One mark for every skill. React Native shares React's; CI/CD uses the generic pipeline glyph. */
export const TECH_ICONS: Record<Skill, SpriteId> = {
  "Next.js": "nextdotjs",
  React: "react",
  Vue: "vuedotjs",
  Quasar: "quasar",
  TypeScript: "typescript",
  "Tailwind CSS": "tailwindcss",
  "Radix UI": "radixui",
  "ShadCN UI": "shadcnui",
  "TanStack Router": "tanstack",
  "React Native": "react",
  Expo: "expo",
  NestJS: "nestjs",
  "ASP.NET Core": "dotnet",
  "C#": "csharp",
  "Spring Boot": "springboot",
  Java: "openjdk",
  "Node.js": "nodedotjs",
  Express: "express",
  PostgreSQL: "postgresql",
  Prisma: "prisma",
  Neon: "neon",
  Docker: "docker",
  Kubernetes: "kubernetes",
  "GitHub Actions": "githubactions",
  Azure: "azure",
  AWS: "aws",
  "CI/CD": "pipeline",
  Vitest: "vitest",
  Playwright: "playwright",
  Puppeteer: "puppeteer",
  Figma: "figma",
};

/** The `href` for a symbol in the sprite. */
export function spriteHref(id: SpriteId): string {
  return `${SPRITE}#${id}`;
}
