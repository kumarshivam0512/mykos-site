import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing-home";
import { marketingPages, type MarketingSlug } from "@/lib/marketing";
import styles from "@/app/marketing.module.css";

export function generateStaticParams() {
  return Object.keys(marketingPages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = marketingPages[slug as MarketingSlug];
  return { title: page ? `${page.label} | Mykos Research Labs` : "Not found", description: page?.description };
}

export default async function DiscoverPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(slug in marketingPages)) notFound();
  const page = marketingPages[slug as MarketingSlug];
  return <div className={styles.site}>
    <a className={styles.skip} href="#content">Skip to content</a>
    <MarketingHeader />
    <main id="content" className={`${styles.wrap} ${styles.subpage}`}>
      <span className={styles.badge}>{page.label} / Mykos Research Labs</span>
      <h1>{page.title}</h1>
      <p className={styles.subpageLead}>{page.description}</p>
      <div className={styles.actions}>
        <Link href={page.href} className={styles.primaryButton} prefetch={false}>{page.action} <ArrowUpRight size={16} /></Link>
        <Link href="/" className={styles.outlineButton}>Back to home <ArrowUpRight size={16} /></Link>
      </div>
      <div className={styles.subpageDetails}>{page.points.map((point, index) => <article key={point}><span>0{index + 1}</span><h2>{point}</h2></article>)}</div>
    </main>
    <MarketingFooter />
  </div>;
}
