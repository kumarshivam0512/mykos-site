"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Copy, Menu, X } from "lucide-react";
import { marketingPages } from "@/lib/marketing";
import MatrixRain from "@/components/ui/matrix-code";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import styles from "@/app/marketing.module.css";

const stages = {
  Capture: {
    title: "Keep the finding, not the transcript.",
    description: "Store a concise, structured observation with its declared source files. Hidden reasoning and full conversations are not captured.",
    image: "/research/ocean-simulation.jpg",
  },
  Recall: {
    title: "Bring back only eligible context.",
    description: "Recall checks the question, assumptions, scope, policy, dependency set, and current source hashes before returning findings.",
    image: "/research/discover-supercomputer.jpg",
  },
  Verify: {
    title: "Tie reuse to a passed check.",
    description: "A host-approved receipt can authorize checked-result reuse only while its declared inputs and scope still match.",
    image: "/research/ocean-simulation.jpg",
  },
} as const;

const examples = {
  "Source recall": ["Search before repeating an investigation", "Match the exact question and declared evidence", "Treat returned findings as unverified until checked"],
  "Checked result": ["Run a host-approved command", "Sign its outcome against declared inputs", "Reject reuse when inputs or scope change"],
  "Host integration": ["Install the optional MCP extra", "Review generated host configuration", "Commit agent-staged findings after freshness checks"],
} as const;

type Example = keyof typeof examples;
type Stage = keyof typeof stages;

const setupSteps = [
  { label: "Install", command: 'python -m pip install -e ".[integration]"', description: "Run this from the reasoning-checkpoints checkout with Python 3.11 or newer. The SDK core remains dependency-free." },
  { label: "Export", command: '$repo = (Get-Location).Path\n$state = Join-Path $repo ".checkpoints\\agent"\nreasoning-checkpoints-agent --repository $repo --state $state config --output ".checkpoints\\integration-config"', description: "From the checkout root, export reviewable MCP and Codex configuration with repository and state paths." },
  { label: "Connect", command: null, description: "Inspect the generated files, then merge them into your host configuration and explicitly review or trust the integration. Exporting does not enable hooks." },
] as const;

function LocalSetup() {
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const current = setupSteps[step];
  const select = (index: number) => { setStep(index); setCopied(false); setError(false); };
  const copy = async () => {
    if (!current.command) return;
    try {
      await navigator.clipboard.writeText(current.command);
      setCopied(true);
      setError(false);
    } catch {
      setCopied(false);
      setError(true);
    }
  };
  return <section className={styles.setupSection} id="local-setup" aria-labelledby="setup-heading">
    <div className={styles.wrap}>
      <h2 id="setup-heading">Run the integration in your environment.</h2>
      <p className={styles.sectionIntro}>The SDK is experimental and local-first. It is not a hosted memory service; connect it through a reviewed agent-host configuration.</p>
      <div className={styles.setupLayout}>
        <div className={styles.setupSteps} role="tablist" aria-label="Local setup steps">
          {setupSteps.map((item, index) => <button key={item.label} role="tab" id={`setup-tab-${index}`} aria-selected={step === index} aria-controls="setup-panel" tabIndex={step === index ? 0 : -1} className={step === index ? styles.selectedSetup : ""} onClick={() => select(index)} onKeyDown={event => {
            const next = event.key === "ArrowRight" || event.key === "ArrowDown" ? (index + 1) % setupSteps.length : event.key === "ArrowLeft" || event.key === "ArrowUp" ? (index + setupSteps.length - 1) % setupSteps.length : event.key === "Home" ? 0 : event.key === "End" ? setupSteps.length - 1 : null;
            if (next === null) return;
            event.preventDefault();
            select(next);
            document.getElementById(`setup-tab-${next}`)?.focus();
          }}><span>{index + 1}</span>{item.label}<ArrowRight size={16} /></button>)}
        </div>
        <div className={styles.setupPanel} id="setup-panel" role="tabpanel" aria-labelledby={`setup-tab-${step}`} tabIndex={0}>
          <h3>{current.label === "Export" ? "Generate host configuration." : current.label === "Install" ? "Install the optional MCP integration." : "Review before you enable it."}</h3>
          <p>{current.description}</p>
          {current.command && <div className={styles.commandRow}><code>{current.command}</code><button onClick={copy} aria-label={`Copy ${current.command}`}>{copied ? <Check size={16} /> : <Copy size={16} />}<span role="status">{copied ? "Copied" : "Copy"}</span></button></div>}
          {error && <p className={styles.setupError} role="alert">Unable to copy. Select and copy the command.</p>}
        </div>
      </div>
    </div>
  </section>;
}

export function MarketingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link className={styles.logo} href="/" aria-label="Mykos home">
          <Image src="/mykos-mushroom.svg" alt="" width={33} height={33} />
          <span>mykos<span className={styles.logoSuffix}> research labs</span></span>
        </Link>
        <nav className={styles.desktopNav} aria-label="Main navigation">
          <Link href="/discover/platform">Platform</Link>
          <Link href="/discover/context">Recall</Link>
          <Link href="/discover/creative">Workflow</Link>
          <Link href="/discover/insights">Checks</Link>
          <Link href="/discover/research">Research</Link>
          <Link href="/discover/pricing">Setup</Link>
        </nav>
        <InteractiveHoverButton className={styles.headerCta} href="https://github.com/hugemonkey/reasoning-checkpoints" text="View source" compact />
        <button className={styles.menuButton} onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {menuOpen && <nav className={styles.mobileNav} aria-label="Mobile navigation">
        {(["platform", "context", "creative", "insights", "research", "pricing"] as const).map((slug) =>
          <Link key={slug} href={`/discover/${slug}`} onClick={() => setMenuOpen(false)}>{marketingPages[slug].label}</Link>
        )}
        <Link href="https://github.com/hugemonkey/reasoning-checkpoints">View source</Link>
      </nav>}
    </header>
  );
}

export function MarketingFooter() {
  return <footer className={styles.footer}>
    <div className={styles.wrap}>
      <div className={styles.footerTop}>
        <div className={styles.footerIdentity}>
          <div className={styles.dictionaryEntry}>
            <span className={styles.footerWordmark}>mykos</span>
            <span className={styles.dictionaryDetails}>
              <span className={styles.brandPronunciation} aria-label="Pronounced MY-koss">/ˈmaɪ.kɒs/</span>
              <span className={styles.brandPartOfSpeech}>noun</span>
            </span>
          </div>
          <p>A memory layer for agentic work, grounded in source evidence.</p>
        </div>
        <div className={styles.footerLinks}>
          <div><strong>Explore</strong><Link href="/discover/platform">Platform</Link><Link href="/discover/context">Recall</Link><Link href="/discover/creative">Workflow</Link><Link href="/discover/insights">Checks</Link></div>
          <div><strong>Capabilities</strong><Link href="/discover/healthcare">Source recall</Link><Link href="/discover/education">Checked results</Link><Link href="/discover/sales">Agent hosts</Link></div>
          <div><strong>Project</strong><Link href="/discover/research">Research</Link><Link href="/discover/enterprise">Limits</Link><Link href="/discover/journal">Evidence</Link><Link href="/discover/pricing">Setup</Link></div>
        </div>
      </div>
      <div className={styles.footerBottom}><span>© {new Date().getFullYear()} Mykos Research Labs</span><Link href="https://github.com/hugemonkey/reasoning-checkpoints">Reasoning Checkpoints source <ArrowUpRight size={14} /></Link></div>
    </div>
  </footer>;
}

export default function MarketingHome() {
  const [example, setExample] = useState<Example>("Source recall");
  const [stage, setStage] = useState<Stage>("Capture");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [announcement, setAnnouncement] = useState(true);
  const [installCopied, setInstallCopied] = useState(false);
  const [installError, setInstallError] = useState(false);
  const steps = examples[example];
  const selectExample = (name: Example) => {
    setExample(name);
    setCopied(false);
    setCopyError(false);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText("https://github.com/hugemonkey/reasoning-checkpoints");
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  };
  const copyInstall = async () => {
    try {
      await navigator.clipboard.writeText('python -m pip install -e ".[integration]"');
      setInstallCopied(true);
      setInstallError(false);
    } catch {
      setInstallCopied(false);
      setInstallError(true);
    }
  };
  return <div className={styles.site}>
    <a className={styles.skip} href="#content">Skip to content</a>
    <MarketingHeader />
    {announcement && <div className={styles.announcement}><span>An experimental local memory SDK and MCP integration for coding agents.</span><Link href="/discover/platform">Explore the platform <ArrowRight size={14} /></Link><button aria-label="Dismiss announcement" onClick={() => setAnnouncement(false)}><X size={18} /></button></div>}
    <main id="content">
      <section className={styles.hero}>
        <MatrixRain
          className={styles.heroCanvas}
          fontSize={14}
          color="#7894d8"
          characters="01"
          fadeOpacity={0.08}
          speed={0.7}
          backgroundColor="#e8ebed"
        />
        <div className={styles.heroIntro}>
          <span className={styles.badge}>Experimental local-first memory for coding agents</span>
          <h1>Give coding agents a memory.</h1>
          <p>Mykos stores source-grounded findings and can reuse host-approved checks when their declared inputs still match.</p>
          <div className={styles.actions}><Link className={styles.primaryButton} href="https://github.com/hugemonkey/reasoning-checkpoints">Read the project <ArrowRight size={17} /></Link><button className={styles.installCommand} onClick={copyInstall} aria-label="Copy local install command"><code>python -m pip install -e &quot;.[integration]&quot;</code>{installCopied ? <Check size={16} /> : <Copy size={16} />}<span className={styles.srOnly} role="status">{installCopied ? "Install command copied" : ""}</span></button></div>
          <a className={styles.setupLink} href="#local-setup">Review local setup <ArrowRight size={14} /></a>
          {installError && <p className={styles.setupError} role="alert">Unable to copy. Select and copy the Python install command.</p>}
        </div>
      </section>
      <LocalSetup />
      <section className={styles.workflowSection} aria-label="Example coding-agent workflows">
        <div className={styles.demo}>
          <div className={styles.demoTabs} role="tablist" aria-label="Example memory workflows">
            {(Object.keys(examples) as Example[]).map((name, index, names) => <button key={name} id={`example-tab-${index}`} role="tab" aria-selected={example === name} aria-controls="example-panel" tabIndex={example === name ? 0 : -1} className={example === name ? styles.activeTab : ""} onClick={() => selectExample(name)} onKeyDown={(event) => {
              const next = event.key === "ArrowRight" ? (index + 1) % names.length : event.key === "ArrowLeft" ? (index + names.length - 1) % names.length : event.key === "Home" ? 0 : event.key === "End" ? names.length - 1 : null;
              if (next === null) return;
              event.preventDefault();
              selectExample(names[next]);
              document.getElementById(`example-tab-${next}`)?.focus();
            }}>{name}</button>)}
          </div>
          <div className={styles.demoBody} id="example-panel" role="tabpanel" aria-labelledby={`example-tab-${Object.keys(examples).indexOf(example)}`} tabIndex={0}>
            <div className={styles.demoTop}><span>MYKOS / AGENT FLOW</span><button onClick={copy} aria-label={copied ? "Copied" : "Copy project link"}>{copied ? <Check size={16} /> : <Copy size={16} />}<span role="status">{copied ? "Copied" : "Copy link"}</span></button></div>
            <div className={styles.demoLines}>{steps.map((step, i) => <div key={step}><span className={styles.lineNumber}>0{i + 1}</span><span className={styles.lineText}>{step}</span><span className={styles.lineArrow}>↗</span></div>)}</div>
            <p className={styles.demoFoot}>A recalled finding is a candidate, not proof of correctness. Validate answers against current evidence.</p>
            {copyError && <p className={styles.copyError} role="alert">Unable to copy. Open the project source from the button above.</p>}
          </div>
        </div>
      </section>
      <section className={styles.signal}><div className={styles.wrap}><span>REUSE HAS AN EVIDENCE BOUNDARY</span><p>Question <span>→</span> Scope <span>→</span> Inputs <span>→</span> Recheck</p><p className={styles.signalNote}>Similarity alone does not authorize reuse. Mykos checks declared scope and evidence freshness; the host remains responsible for judging answers.</p></div></section>
      <section className={styles.featureSection}>
        <div className={styles.wrap}>
          <h2>Memory with a freshness check.</h2>
          <p className={styles.sectionIntro}>Findings are tied to declared source files. Changed evidence or scope blocks reuse instead of silently serving stale results.</p>
          <div className={styles.featurePanel}>
            <div className={styles.featureTabs}>{(Object.keys(stages) as Stage[]).map((name) => <button key={name} onClick={() => setStage(name)} aria-pressed={stage === name} className={stage === name ? styles.selectedFeature : ""}>{name}</button>)}</div>
            <div className={styles.featureContent}><div><h3>{stages[stage].title}</h3><p>{stages[stage].description}</p><Link href={`/discover/${stage === "Capture" ? "creative" : stage === "Recall" ? "context" : "insights"}`}>Explore {stage.toLowerCase()} <ArrowUpRight size={16} /></Link></div><figure className={styles.featureFigure}><div className={styles.featureImage}><Image src={stages[stage].image} alt={stage === "Recall" ? "NASA Discover supercomputer" : "NASA visualization of ocean turbulence"} fill sizes="(max-width: 700px) 100vw, 420px" /></div><figcaption>Illustrative NASA imagery. <a href={stage === "Recall" ? "https://images.nasa.gov/details/GSFC_20171208_Archive_e002030" : "https://images.nasa.gov/details/PIA22256"}>View image source <ArrowUpRight size={12} /></a></figcaption></figure></div>
          </div>
        </div>
      </section>
      <section className={styles.process}><div className={styles.wrap}><h2>Capture, bind, then revalidate.</h2><div className={styles.processGrid}>{["Capture a structured finding", "Bind it to source or a check", "Revalidate before reuse"].map((title, i) => <div key={title}><h3>{title}</h3><p>{["Save a short finding and declared dependencies, not a transcript or hidden reasoning.", "For approved checks, capture a signed receipt with scope and input fingerprints.", "Changes, incomplete evidence, or scope mismatches block checked-result reuse."][i]}</p></div>)}</div></div></section>
      <section className={styles.useCases}><div className={styles.wrap}><h2>Where findings can be reused.</h2><p className={styles.sectionIntro}>A recalled finding is not a verified answer. Reuse depends on the question, scope, and evidence.</p><div className={styles.useGrid}>{(["healthcare", "education", "sales"] as const).map((slug) => <Link href={`/discover/${slug}`} key={slug}><span>{marketingPages[slug].label}</span><h3>{marketingPages[slug].title}</h3><p>{marketingPages[slug].description}</p><span className={styles.cardAction}>Read how it works <ArrowUpRight size={16} /></span></Link>)}</div></div></section>
      <section className={styles.researchBand}><div className={styles.wrap}><span>EXPERIMENTAL, LOCAL-FIRST RESEARCH</span><h2>What the current evidence supports.</h2><p>Current experiments are small and local. They do not establish general task-quality gains or end-to-end token savings over a strong cache.</p><Link className={styles.outlineButton} href="/discover/research">Review current evidence <ArrowUpRight size={16} /></Link></div></section>
      <section className={styles.team}><div className={styles.wrap}><div><h2>Local control, not a hosted black box.</h2><p>The host chooses which checks can run and declares the source scope. Memory does not read hidden reasoning or verify every explanation.</p><Link href="/discover/enterprise">Read the integration limits <ArrowUpRight size={16} /></Link></div><div className={styles.teamPoints}><p>Host-approved checks</p><p>Declared source inputs</p><p>Human review remains necessary</p></div></div></section>
      <section className={styles.finalCta}><div className={styles.wrap}><h2>Start with the code. Test it against your work.</h2><div className={styles.actions}><Link className={styles.primaryButton} href="https://github.com/hugemonkey/reasoning-checkpoints">View the project on GitHub <ArrowRight size={17} /></Link><Link className={styles.outlineButton} href="/discover/pricing">Read the setup guide <ArrowUpRight size={16} /></Link></div></div></section>
    </main>
    <MarketingFooter />
  </div>;
}
