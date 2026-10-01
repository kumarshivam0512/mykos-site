import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDown, ArrowRight, ArrowUpRight, Plus } from "lucide-react";
import styles from "./research.module.css";

export const metadata: Metadata = {
  title: "Mykos Research Labs | Creative Intelligence",
  description:
    "Mykos Research Labs explores how AI can understand creative context, generate with intention, and support human judgment.",
  openGraph: {
    title: "Mykos Research Labs | Creative Intelligence",
    description:
      "Exploring creative intelligence through context, generative systems, and human-centered evaluation.",
    type: "website",
  },
};

const research = [
  {
    title: "01 / Context",
    question: "How can a system understand creative intent?",
    description:
      "Connecting language, visual references, and brand context so creative decisions begin with a shared understanding.",
    detail:
      "Our focus is the relationship between what a person asks for and what a system produces. Brand context, audience insights, and visual references give a model more than a prompt to work from.",
    href: "/brand",
    link: "Explore brand context",
  },
  {
    title: "02 / Generative systems",
    question: "How can generated work stay coherent?",
    description:
      "Exploring consistency across images, characters, and scenes while keeping creative direction in human hands.",
    detail:
      "A useful creative system needs continuity, not just individual images. The Mykos workspace brings characters, locations, scene generation, and video assembly into one workflow where people can review and refine the result.",
    href: "/creative",
    link: "Explore creative tools",
  },
  {
    title: "03 / Evaluation",
    question: "What makes an output useful in practice?",
    description:
      "Looking beyond generation quality to relevance, editability, and the performance of creative work in context.",
    detail:
      "Evaluation should connect an output to its intended use. We are interested in how creative feedback and campaign analytics can inform the next iteration without replacing human judgment.",
    href: "/performance/analytics",
    link: "Explore analytics",
  },
];

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Existing campaign/brand bookmarks should still open the workspace.
  if (params.c || params.brandId || params.view === "workspace") {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
      else if (value !== undefined) query.set(key, value);
    }
    redirect(`/workspace?${query.toString()}`);
  }

  return (
    <div className={styles.site}>
      <a className={styles.skipLink} href="#main">Skip to content</a>
      <header className={styles.header}>
        <div className={`${styles.container} ${styles.headerInner}`}>
          <Link href="/" className={styles.brand} aria-label="Mykos Research Labs home">
            <span className={styles.brandMark} aria-hidden="true">M</span>
            <span className={styles.brandName}>Mykos<span>Research Labs</span></span>
          </Link>
          <nav className={styles.navigation} aria-label="Main navigation">
            <a href="#research">Research</a>
            <a href="#approach">Our approach</a>
            <Link href="/workspace" prefetch={false}>Workspace</Link>
          </nav>
          <Link href="/workspace" className={styles.headerLink} prefetch={false}>
            Enter workspace <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <main id="main">
        <section className={`${styles.container} ${styles.hero}`} aria-labelledby="hero-title">
          <div className={styles.heroMasthead}>
            <p className={styles.eyebrow}><span /> Independent research · Creative intelligence</p>
            <h1 id="hero-title">
              <span>MYKOS</span>
              <span>RESEARCH LABS</span>
            </h1>
            <p className={styles.heroDescription}>
              We explore how AI can understand creative context, generate with intention,
              and help people make better work.
            </p>
            <div className={styles.heroActions}>
              <a href="#research" className={styles.primaryLink}>
                Explore our research <ArrowDown size={16} aria-hidden="true" />
              </a>
              <Link href="/workspace" className={styles.secondaryLink} prefetch={false}>
                Open workspace <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <figure className={styles.heroFigure}>
            <div className={styles.heroImage}>
              <Image
                src="/research/ocean-simulation.jpg"
                alt="Currents in a NASA simulation of North Atlantic ocean turbulence"
                fill
                sizes="(max-width: 767px) calc(100vw - 40px), 1280px"
                preload
              />
              <span className={styles.imageLabel}>SYSTEMS / 001</span>
            </div>
            <figcaption>
              Patterns emerge across complex systems.
              <a href="https://images.nasa.gov/details/PIA22256">
                NASA / JPL-Caltech <ArrowUpRight size={12} aria-hidden="true" />
              </a>
            </figcaption>
          </figure>
        </section>

        <section id="about" className={`${styles.container} ${styles.about}`} aria-labelledby="about-title">
          <div className={styles.aboutHeading}>
            <p className={styles.eyebrow}>The lab</p>
            <h2 id="about-title">Intelligence for <span>human creativity.</span></h2>
          </div>
          <div className={styles.aboutCopy}>
            <p>
              Creative work begins with intent, context, and a point of view—not a prompt alone.
            </p>
            <p>
              Mykos Research Labs explores systems that connect those ingredients to useful
              creative work. We study the process by building tools, testing ideas, and keeping
              human judgment in the loop.
            </p>
          </div>
        </section>

        <section id="research" className={`${styles.container} ${styles.research}`} aria-labelledby="research-title">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>Research directions / 2026</p>
            <h2 id="research-title">Questions worth working on.</h2>
            <p>
              A connected line of inquiry: understand the idea, shape what gets made,
              then learn from how people use it.
            </p>
          </div>
          <div className={styles.researchList}>
            {research.map((area) => (
              <details className={styles.researchItem} key={area.title}>
                <summary>
                  <span className={styles.researchCategory}>{area.title}</span>
                  <span className={styles.researchQuestion}>{area.question}</span>
                  <Plus className={styles.expandIcon} size={22} aria-hidden="true" />
                </summary>
                <div className={styles.researchDetail}>
                  <p className={styles.researchLead}>{area.description}</p>
                  <p>{area.detail}</p>
                  <Link href={area.href} className={styles.textLink} prefetch={false}>
                    {area.link} <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              </details>
            ))}
          </div>
        </section>

        <section id="approach" className={styles.approach} aria-labelledby="approach-title">
          <div className={`${styles.container} ${styles.approachInner}`}>
            <figure className={styles.approachFigure}>
              <Image
                src="/research/discover-supercomputer.jpg"
                alt="Rows of cabinets in NASA's Discover supercomputer facility"
                width={1280}
                height={757}
                sizes="(max-width: 767px) calc(100vw - 40px), 42vw"
              />
              <figcaption>
                Scientific computing, in practice.
                <a href="https://images.nasa.gov/details/GSFC_20171208_Archive_e002030">
                  NASA / Pat Izzo <ArrowUpRight size={12} aria-hidden="true" />
                </a>
              </figcaption>
            </figure>
            <div className={styles.approachCopy}>
              <p className={styles.eyebrow}>How we work</p>
              <h2 id="approach-title">Research through making.</h2>
              <p>
                We treat making as a way to investigate. A prototype makes an idea
                tangible; using it helps reveal the next question.
              </p>
              <dl className={styles.principles}>
                <div>
                  <dt>Human direction</dt>
                  <dd>Keep people in control of intent, review, and refinement.</dd>
                </div>
                <div>
                  <dt>Context before output</dt>
                  <dd>Understand the brief before generating the work.</dd>
                </div>
                <div>
                  <dt>Learning through use</dt>
                  <dd>Test ideas against real creative workflows, not isolated demos.</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <section className={`${styles.container} ${styles.workspace}`} aria-labelledby="workspace-title">
          <div>
            <p className={styles.eyebrow}>From research to practice</p>
            <h2 id="workspace-title">Ideas are better when you can work with them.</h2>
            <p>
              The Mykos workspace brings brand context, creative generation, and campaign
              analytics together—a place to put these questions into practice.
            </p>
          </div>
          <Link href="/workspace" className={styles.primaryLink} prefetch={false}>
            Open workspace <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <Link href="/" className={styles.brand} aria-label="Mykos home">
            <span className={styles.brandMark} aria-hidden="true">M</span>
            <span className={styles.brandName}>Mykos<span>Research Labs</span></span>
          </Link>
          <p>Research for creative intelligence.</p>
          <a href="#research">Research directions <ArrowUpRight size={16} aria-hidden="true" /></a>
        </div>
        <div className={`${styles.container} ${styles.credits}`}>
          Scientific imagery courtesy of NASA and NASA/JPL-Caltech. Images illustrate
          scientific inquiry, not Mykos facilities or research results. No affiliation or endorsement implied.
        </div>
      </footer>
    </div>
  );
}
