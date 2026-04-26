import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Problem } from "@/components/Problem";
import { HowItWorks } from "@/components/HowItWorks";
import { Platforms } from "@/components/Platforms";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative z-10 overflow-x-hidden">
      <Nav />
      <Hero />
      <Problem />
      <HowItWorks />
      <Platforms />
      <CTA />
      <Footer />
    </main>
  );
}
