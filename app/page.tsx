import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { Problem } from "@/components/Problem";
import { StickyShowcase } from "@/components/StickyShowcase";
import { Platforms } from "@/components/Platforms";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative z-10 overflow-x-hidden">
      <Nav />
      <Hero />

      {/* Giant horizontal marquee */}
      <Marquee
        text="Brief · Generate · Test · Ship · Scale"
        speed={600}
      />

      <Problem />

      {/* second marquee, reversed */}
      <Marquee
        text="Always shipping · Always learning"
        speed={500}
        reverse
      />

      <StickyShowcase />
      <Platforms />
      <CTA />
      <Footer />
    </main>
  );
}
