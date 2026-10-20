import type { NavbarLink } from "@/components/Navbar";
import type { ProjectCardProps } from "@/components/ProjectCard";
import type { SocialLink } from "@/components/SocialLinks";
import { dynamicIconImports } from "lucide-react/dynamic";
import {
  SevenElevenImage,
  TheLawSocietyImage,
  GlowEditImage,
  ClinicEzImage,
  ConexusImage,
  MeImage,
  RubatoLifeLogo,
  NextStepLogo,
  LogicallLogo,
  ApollotechLogo,
} from "@/assets/img";
import { StaticImageData } from "next/image";

export interface HeroAction {
  label: string;
  href: string;
  icon: keyof typeof dynamicIconImports;
  variant?: "default" | "outline" | "ghost";
}

export interface HeroHighlight {
  label: string;
  value: string;
}

export interface HeroContent {
  eyebrow: string;
  title: string;
  /** Part of `title` shown in red. A display hint only: it must appear in `title` word for word. */
  titleEmphasis?: string;
  subtitle: string;
  description: string;
  portrait: string | StaticImageData;
  portraitAlt: string;
  /** The short line under the fields of the hero's ID card. */
  portraitCaption: string;
  actions: HeroAction[];
  highlights: HeroHighlight[];
}

export interface AboutHighlight {
  title: string;
  description: string;
}

export interface AboutContent {
  title: string;
  description: string;
  highlights: AboutHighlight[];
  values: HeroHighlight[];
}

export interface ExperienceItem {
  company: string;
  /** The company's logo, shown on a white tile. Companies without one get a seal instead. */
  logo?: StaticImageData;
  role: string;
  start: string;
  end: string;
  summary: string;
  achievements: string[];
  technologies: string[];
  url?: string;
}

// The skills, in the order the owner listed them. The toolkit groups them, and its groups can
// only name skills from this list.
const skills = [
  "Next.js",
  "React",
  "React Native",
  "NestJS",
  "C#",
  "ASP.NET Core",
  "Expo",
  "Node.js",
  "Express",
  "Prisma",
  "TypeScript",
  "Java",
  "Spring Boot",
  "Quasar",
  "Vue",
  "Tailwind CSS",
  "Radix UI",
  "ShadCN UI",
  "TanStack Router",
  "PostgreSQL",
  "Neon",
  "Docker",
  "Kubernetes",
  "Azure",
  "AWS",
  "GitHub Actions",
  "Playwright",
  "Puppeteer",
  "Vitest",
  "CI/CD",
  "Figma",
] as const;

export type Skill = (typeof skills)[number];

export interface SkillGroup {
  label: string;
  /** Every skill appears in exactly one group. */
  skills: Skill[];
}

export interface ContactInfo {
  /** The Brief's title, set small at the end of its section head. */
  title: string;
  /** The paragraph under the Brief's section head. */
  intro?: string;
  /** The closing line under the contact box. */
  signoff?: string;
  email: string;
  calendarUrl?: string;
  availability?: string;
  location: string;
  note?: string;
}

export interface SectionIntro {
  /** The section title, set small at the end of its section head. */
  title: string;
  /** The paragraph under the section head. */
  intro?: string;
}

export interface SiteConfig {
  name: string;
  role: string;
  location: string;
  navLinks: NavbarLink[];
  socialLinks: SocialLink[];
  hero: HeroContent;
  about: AboutContent;
  /** The Cases section's head. */
  projectsHead: SectionIntro;
  projects: ProjectCardProps[];
  skills: Skill[];
  skillGroups: SkillGroup[];
  experiences: ExperienceItem[];
  contact: ContactInfo;
  githubProfile?: string;
}

export const siteConfig: SiteConfig = {
  name: "Kyle Marlowe Moreno",
  role: "Full Stack Developer",
  location: "Cagayan de Oro, PH",
  navLinks: [
    // The home page's sections, so the links work from any page.
    { label: "Home", href: "/#home" },
    { label: "Profile", href: "/#about" },
    { label: "Cases", href: "/#projects" },
    { label: "Record", href: "/#experience" },
    { label: "Brief", href: "/#contact" },
  ],
  socialLinks: [
    { icon: "github", url: "https://github.com/kylemicros" },
    { icon: "linkedin", url: "https://linkedin.com/in/marlowe-moreno" },
    { icon: "mail", url: "mailto:kyle.marlowe.pacana.moreno@gmail.com" },
  ],
  hero: {
    eyebrow: "Full Stack Developer",
    title: "Shipping reliable platforms for teams that move fast",
    titleEmphasis: "move fast",
    subtitle: "I plan, design, and build web and mobile products that balance product vision with dependable engineering.",
    description:
      "From multi-tenant suites to startup MVPs, I work with founders and cross-functional teams to design architectures that hold up, speed up delivery, and ship features users trust.",
    portrait: MeImage,
    portraitAlt: "Portrait of Kyle Marlowe Moreno",
    portraitCaption: "Focused on dependable healthcare, fintech, and platform experiences.",
    actions: [
      {
        label: "View selected work",
        href: "#projects",
        icon: "arrow-up-right",
      },
      {
        label: "Book a strategy call",
        href: "https://cal.com/kyle-marlowe-moreno-g4jnsr/30min",
        icon: "calendar",
        variant: "outline",
      },
    ],
    highlights: [
      { label: "Experience", value: "4+ years" },
    ],
  },
  about: {
    title: "Pairing product empathy with dependable engineering",
    description:
      "I stay close to the business context, mapping operations, refining developer workflows, and delivering software that scales responsibly. My focus is on building maintainable systems without slowing teams down.",
    highlights: [
      {
        title: "Multi-tenant platform leadership",
        description:
          "Guiding the rebuild of a healthcare management suite, covering architecture decisions, shared component libraries, and automated QA across web and mobile.",
      },
      {
        title: "Delivery enablement",
        description:
          "Partnered with agencies and startups to introduce CI/CD pipelines, observability, and documentation that keep product growth sustainable.",
      },
    ],
    values: [
      { label: "Focus", value: "SaaS platforms" },
      { label: "Collaboration", value: "Open, async-friendly communication" },
      { label: "Mindset", value: "Continuous improvement & learning" },
    ],
  },
  projectsHead: {
    title: "Work spanning healthcare, fintech, CRM, and platform launches",
    intro:
      "Worked on multiple projects with multiple companies ranging from startups to established enterprises, delivering impactful solutions that drive user engagement and business growth.",
  },
  projects: [
    {
      src: ClinicEzImage,
      title: "ClinicEZ",
      description: "A cross-platform, multi-tenant healthcare information management system (HIMS) for institutional clinics, serving over 10,000 users.",
      technologies: ["Next.js", "TypeScript", "Prisma", "Neon", "Vercel"],
      category: "Cross-Platform",
      year: "2025",
      liveDemoLink: "https://www.clinicez.net/v2",
    },
    {
      src: TheLawSocietyImage,
      title: "Solicitor Web Scraper",
      description: "A 'The Law Society' web scraping tool that can extract 10,000 emails in a span of 2 hours, capable of bypassing CAPTCHAs.",
      technologies: ["TypeScript", "Puppeteer", "Crawlee"],
      category: "Web Scraping",
      year: "2025",
      githubLink: "https://github.com/kylemicros/solicitor-scraper-eu",
    },
    {
      src: GlowEditImage,
      title: "GlowEdit",
      description: "A static spa & salon web app for a UK-based salon.",
      technologies: ["Next.js", "TypeScript", "Tailwind CSS", "Prisma", "PostgreSQL", "Vercel"],
      category: "Web App",
      year: "2025",
      liveDemoLink: "https://www.glowedit.co.uk/"
    },
    {
      src: SevenElevenImage,
      title: "7/11 Admin Web Apps",
      description: "Administrative web applications developed for 7/11 to manage rewards systems and inventory across multiple locations.",
      technologies: ["Spring Boot", "Quasar", "TypeScript", "ShadCN UI", "Java", "Docker", "Kubernetes", "Rancher"],
      category: "Microservice",
      year: "2025",
    },
    {
      src: ConexusImage,
      title: "Conexus CRM",
      description: "A customer relations management platform tailored for call centers, enhancing client interactions and operational efficiency.",
      technologies: ["Bubble.io", "Xano", "Postman", "Stripe", "PayPal"],
      category: "B2B SaaS",
      year: "2025",
      liveDemoLink: "https://tryconexus.com/",
    }
  ],
  skills: [...skills],
  skillGroups: [
    {
      label: "Frontend",
      skills: ["Next.js", "React", "Vue", "Quasar", "TypeScript", "Tailwind CSS", "Radix UI", "ShadCN UI", "TanStack Router"],
    },
    { label: "Mobile", skills: ["React Native", "Expo"] },
    { label: "Backend", skills: ["NestJS", "ASP.NET Core", "C#", "Spring Boot", "Java", "Node.js", "Express"] },
    { label: "Data", skills: ["PostgreSQL", "Prisma", "Neon"] },
    { label: "Infra", skills: ["Docker", "Kubernetes", "GitHub Actions", "Azure", "AWS", "CI/CD"] },
    { label: "Testing and tools", skills: ["Vitest", "Playwright", "Puppeteer", "Figma"] },
  ],
  experiences: [
    {
      company: "Rubato Life",
      logo: RubatoLifeLogo,
      role: "Full Stack Developer",
      start: "December 2025",
      end: "Present",
      summary: "",
      achievements: [],
      technologies: ["NestJS", "TypeScript", "Docker", "Docker Compose", "MySQL", "CircleCI", "Google Cloud Platform", "CLI Apps"],
    },
    {
      company: "Recruiting 360 Ltd.",
      role: "Full Stack App Developer",
      start: "October 2025",
      end: "January 2026",
      summary: "Lead developer for a multi-tenant mobile app and admin dashboard for a workforce management SaaS platform, also contributing to backend scripting efforts such as automation workflows, data extraction/scraping, and integration tooling.",
      achievements: [
        "Created multiple scripts using Puppeteer and Node.js to automate data extraction and integration tasks, reducing manual effort by 70% and improving data accuracy for client reporting",
        "Built and designed a marketing and promotional web app for a fashion retail client.",
        "Collaborated with cross-functional teams to gather requirements, design user interfaces, and implement features that enhanced user engagement and retention.",
        "Developed multiple webscraping tools to gather email leads and contact information for marketing campaigns, increasing lead generation by 40%",
      ],
      technologies: [
        "Next.js",
        "Tailwind CSS",
        "ShadCN UI",
        "TypeScript",
        "React Native",
        "Expo",
        "NestJS",
        "PostgreSQL",
        "AWS",
        "GitHub Actions",
        "Laravel",
        "Puppeteer",
      ],
    },
    {
      company: "NextStep Software Solutions, Inc.",
      logo: NextStepLogo,
      role: "Full Stack Developer",
      start: "June 2025",
      end: "December 2025",
      summary:
        "Leading the rebuild of a multi-tenant cross-platform healthcare management suite that powers clinics, partner hospitals, and patient-facing channels.",
      achievements: [
        "Architected domain-driven service boundaries with shared React/React Native component libraries, so web and mobile share one consistent UX",
        "Built Azure and AWS CI/CD pipelines integrated with automated testing (Vitest, Playwright), accelerating release cycles from weekly to daily deployments",
        "Mentored engineering teams on TypeScript best practices, accessibility-first UI design, and comprehensive documentation standards that raised code quality across squads",
      ],
      technologies: ["Next.js", "TypeScript", "C#", "ASP.NET Core", "React", "React Native", "Expo", "Node.js", "Prisma", "Tailwind CSS", "Vitest", "Azure", "AWS", "Figma"],
      url: "#",
    },
    {
      company: "Logicall",
      logo: LogicallLogo,
      role: "DevOps Engineer",
      start: "March 2025",
      end: "June 2025",
      summary:
        "Worked on a customer relations management SaaS platform for multiple call centers in the Philippines.",
      achievements: [
        "Analyzed and optimized Bubble.io and Xano workflows, refactoring critical business logic into monitored microservices to minimize downtime and improve reliability",
        "Implemented environment-specific deployment scripts, real-time usage monitoring dashboards, and automated alerting systems that protect transaction integrity and keep the business running",
      ],
      technologies: ["Bubble.io", "Xano", "Postman", "Stripe", "PayPal", "AWS"],
      url: "https://northwind.vc",
    },
    {
      company: "Apollotech Software Corporation",
      logo: ApollotechLogo,
      role: "Software Developer",
      start: "July 2024",
      end: "June 2025",
      summary:
        "Delivered fintech products spanning Vue/Quasar frontends and Spring Boot microservices for enterprise partners.",
      achievements: [
        "Implemented secure onboarding flows and internal admin tooling that supported thousands of daily transactions",
        "Containerized services with Docker and Kubernetes, orchestrated via Rancher, to improve deployment reliability and traceability",
      ],
      technologies: ["Node.js", "Vue", "Quasar", "TypeScript", "Java", "Spring Boot", "Docker", "Kubernetes", "Rancher", "Cypress"],
    },
    {
      company: "Freelance",
      role: "Full Stack Developer",
      start: "February 2021",
      end: "Present",
      summary:
        "Partner with founders and SMEs to ideate, prototype, and ship cross-platform products from discovery to hand-off.",
      achievements: [
        "Launched web and mobile apps for retail, hospitality, and nonprofit clients with reusable codebases their teams can maintain",
        "Document product decisions, design systems, and runbooks so stakeholders can run things on their own after launch",
      ],
      technologies: ["Next.js", "React", "React Native", "Expo", "Node.js", "Express", "Tailwind CSS", "AWS", "Azure", "PostgreSQL"],
    }
  ],
  contact: {
    title: "Let’s shape your next product milestone",
    intro:
      "I collaborate with teams who value strong design partnerships, clear communication, and a culture of experimentation. Tell me about your goals and we’ll explore how to reach them together.",
    signoff:
      "Building dependable healthcare, fintech, and platform experiences with teams that value thoughtful engineering and sustainable delivery. Inspired and motivated by my ever loving wife.",
    email: "kyle.marlowe.pacana.moreno@gmail.com",
    calendarUrl: "https://cal.com/kyle-marlowe-moreno-g4jnsr/30min",
    availability: "Booking new collaborations for Q4 2025",
    location: "Cagayan de Oro, Philippines",
    note: "Excited to collaborate with teams building healthcare, fintech, and platform-focused products that value thoughtful engineering.",
  },
  githubProfile: "https://github.com/kylemicros",
};
