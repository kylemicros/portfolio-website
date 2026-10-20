# Personal Portfolio

![Portfolio Screenshot](src/assets/img/portfolio-snapshot.png)

This is a personal portfolio website built with Next.js.

You can view the live version at [https://marlowe-portfolio.vercel.app/](https://marlowe-portfolio.vercel.app/).

## Stack

- [Next.js](https://nextjs.org/) 16 (App Router) with React 19
- TypeScript 5 (strict mode)
- Tailwind CSS 4 and [shadcn/ui](https://ui.shadcn.com/) components
- [Lucide](https://lucide.dev/) icons
- Deployed on [Vercel](https://vercel.com/)

## Requirements

- Node.js 20.9 or later
- [pnpm](https://pnpm.io/) 9 or later

## Getting started

```bash
git clone https://github.com/kylemicros/portfolio-website.git
cd portfolio-website
pnpm install
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000).

The site's content (profile, projects, experience and contact details) lives in `src/lib/site.ts`.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Starts the development server |
| `pnpm build` | Creates a production build |
| `pnpm start` | Serves the production build (run `pnpm build` first) |
| `pnpm lint` | Lints the code with ESLint |
| `pnpm typecheck` | Type-checks the code with the TypeScript compiler |
