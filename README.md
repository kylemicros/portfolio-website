# Personal Portfolio

A modern, responsive portfolio website built with Next.js, React, and TypeScript. Features a clean design with smooth animations, accessibility-first UI components, and optimized performance.

## Tech Stack

- **Framework:** Next.js 15 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI primitives with shadcn/ui
- **Icons:** Lucide React
- **Fonts:** Geist Sans and Geist Mono
- **Package Manager:** pnpm

## Features

- Responsive design optimized for all devices
- Smooth scroll navigation between sections
- Interactive project cards with hover effects
- Timeline-based experience section
- Accessibility-first component library
- Dark mode support via CSS variables
- Type-safe configuration with TypeScript

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- pnpm (recommended) or npm

### Installation

1.Clone the repository:

```bash
git clone https://github.com/yourusername/personal-portfolio.ui.git
cd personal-portfolio.ui
```

2.Install dependencies:

```bash
pnpm install
```

3.Run the development server:

```bash
pnpm dev
```

4.Open [http://localhost:3000](http://localhost:3000) in your browser to see the site.

## Project Structure

```bash
src/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout with fonts and metadata
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles and theme variables
├── components/            # React components
│   ├── sections/         # Page sections (Hero, About, Projects, etc.)
│   ├── ui/               # Reusable UI components (shadcn/ui)
│   └── ...               # Feature components
└── lib/
    ├── site.ts           # Site configuration and content
    └── utils.ts          # Utility functions
```

## Customization

### Update Site Content

Edit the `siteConfig` object in `src/lib/site.ts` to update:

- Personal information (name, role, location)
- Navigation links
- Social media links
- Hero section content
- About section details
- Project listings
- Experience timeline
- Contact information

### Modify Styling

- Theme colors are defined as CSS variables in `src/app/globals.css`
- Component styles use Tailwind utility classes
- Customize the theme by modifying the color values in the `:root` and `.dark` selectors

## Building for Production

```bash
pnpm build
```

The optimized production build will be created in the `.next` directory.

## Deployment

This project is ready to deploy on Vercel:

1. Push your code to a GitHub repository
2. Import the project in [Vercel](https://vercel.com)
3. Vercel will automatically detect Next.js and configure the build settings
4. Your site will be deployed with automatic HTTPS and global CDN

Alternative deployment platforms include Netlify, AWS Amplify, and Cloudflare Pages.

## License

MIT License. Feel free to use this project as a template for your own portfolio.
