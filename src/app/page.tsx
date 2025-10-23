import { AboutSection } from "@/components/sections/AboutSection";
import { ContactSection } from "@/components/sections/ContactSection";
import { ExperienceSection } from "@/components/sections/ExperienceSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { ProjectsSection } from "@/components/sections/ProjectsSection";
import { siteConfig } from "@/lib/site";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col bg-background">
      <HeroSection />
      <AboutSection about={siteConfig.about} skills={siteConfig.skills} />
      <ProjectsSection projects={siteConfig.projects} githubUrl={siteConfig.githubProfile} />
      <ExperienceSection experiences={siteConfig.experiences} />
      <ContactSection contact={siteConfig.contact} />
    </main>
  );
}
