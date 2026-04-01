import React, { useEffect, useId, useState } from "react";
import photo from "./assets/photo.png";

const EXPERIENCE = [
  {
    title: "Software Engineer II",
    company: "Adobe",
    location: "San Jose",
    range: "Dec 2024 - Present",
    highlights: [
      "Architected and integrated core backend components for the Marketo Fulfillment Service (MFS), including DNS routing, fragment services, subscription provisioning, and Orion subprocess orchestration, building and consuming REST APIs across 15+ downstream dependencies.",
      "Designed and debugged multi-step workflows in a distributed environment, coordinating Camunda flows, REST orchestrators, and backend services to isolate root causes and reduce integration errors.",
      "Built ETL pipelines and SQL transformations for analytics; designed relational schemas for subscription metadata, bundle mappings, and service pod configurations.",
      "Led migration of ajob2bprovisioner to M1.5 architecture, achieving a 100% pass rate in staging through rapid adoption and creative problem-solving.",
      "Performed data fixups and deployed upgrades via Git and Jenkins, resolving critical production bugs and supporting high uptime.",
    ],
  },
  {
    title: "Software Development Engineer",
    company: "CVS Health",
    location: "Chicago",
    range: "Oct 2023 - Dec 2024",
    highlights: [
      "Led UX redesign for the myPBM platform with advanced AG Grid features and Angular components for criteria filtering and creation, improving task completion speed for pharmacy technicians by ~30%.",
      "Developed front-end features that improved accessibility and navigation for pharmacy staff while optimizing interactions with large backend databases.",
      "Partnered on utilization management (UM) digitization of drug formularies, delivering 100+ accurate clinical evaluations per week and improving turnaround time by 40% while reducing manual errors.",
    ],
  },
];

const INTERNSHIPS = [
  {
    title: "Software Development Intern",
    company: "CVS Health",
    location: "Remote",
    range: "May 2023 - Aug 2023",
    highlights: [
      "Built full-stack web features (React, Java, SQL) supporting formulary workflows.",
      "Automated regression tests and collaborated with product owners using Agile/Scrum.",
    ],
  },
  {
    title: "Software Engineer Intern",
    company: "Adobe",
    location: "San Jose",
    range: "May 2022 - Aug 2022",
    highlights: [
      "Created React/Node components for automated marketing workflows, increasing user activity 26%.",
      "Built Rails-based staging environments for privacy request processing.",
      "Improved Kafka pipeline debugging with QE using Postman and token logs.",
    ],
  },
  {
    title: "Software Engineer Intern",
    company: "Specific Diagnostics",
    location: "Mountain View",
    range: "May 2021 - Aug 2021",
    highlights: [
      "Developed barcode query tools and foreign-object detection modules.",
      "Implemented lossless CV-based compression, improving analytics traffic speed 30%.",
    ],
  },
];

const SKILLS = [
  "Java",
  "JavaScript",
  "TypeScript",
  "Python",
  "SQL",
  "Camunda",
  "Spring Boot",
  "REST APIs",
  "Jenkins",
  "Docker",
  "Git",
  "Postman",
  "Bash",
  "HTML",
  "CSS",
  "MCP",
  "Claude & ChatGPT APIs",
  "Prompt engineering",
];

const EDUCATION = [
  {
    school: "University of Illinois Urbana-Champaign",
    detail: "B.S. Computer Science - Graduated with High Honors",
    range: "Aug 2020 - Aug 2023",
  },
  {
    school: "Saratoga High School",
    detail: "Graduated with High Honors",
    range: "Aug 2016 - May 2020",
  },
];

const LEADERSHIP = [
  "Adobe Express Ambassador",
  "NJB Basketball Coach",
  "Citizen Schools Student Teacher",
  "DMA Teaching Assistant",
];

const GITHUB_REPO =
  import.meta.env.VITE_GITHUB_REPO ?? "https://github.com/SonaliShanbhag/portfolio";

/** Deployed Reward Optimizer on Vercel. Override with `VITE_REWARD_OPTIMIZER_DEMO` in `.env` if the URL changes. */
const REWARD_OPTIMIZER_DEMO =
  import.meta.env.VITE_REWARD_OPTIMIZER_DEMO?.trim() ||
  "https://portfolio-tau-three-jcci2viy7z.vercel.app/";

/** Structured "Why?" body: personal angle, bullet list, personal tie-in. */
function WhySections({ angle, listIntro, bullets, tieIn }) {
  return (
    <div className="mt-4 space-y-5 text-sm leading-relaxed text-zinc-400">
      <section>
        <div className="[&>p]:leading-relaxed">
          {typeof angle === "string" ? <p>{angle}</p> : angle}
        </div>
      </section>
      <section>
        <p className="mb-2 text-zinc-500">{listIntro}</p>
        <ul className="list-disc space-y-1.5 pl-5 marker:text-zinc-600">
          {bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section>
        <div className="[&_p+p]:mt-3">{typeof tieIn === "string" ? <p>{tieIn}</p> : tieIn}</div>
      </section>
    </div>
  );
}

function ProjectCard({ title, description, bullets, demoHref, sourceHref, why }) {
  const [whyOpen, setWhyOpen] = useState(false);
  const whyTitleId = useId();

  useEffect(() => {
    if (!whyOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setWhyOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [whyOpen]);

  return (
    <article className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-fuchsia-500/30 hover:shadow-[0_0_48px_-16px_rgba(217,70,239,0.25)]">
      <h3 className="font-display text-xl font-bold text-white">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">{description}</p>
      <ul className="mt-4 space-y-1.5 text-sm text-zinc-300">
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-3">
        {demoHref ? (
        <a
          href={demoHref}
          {...(/^https?:\/\//i.test(demoHref)
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
          className="inline-flex items-center justify-center rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-500"
        >
          Open demo
        </a>
        ) : null}
        <a
          href={sourceHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-fuchsia-500/40 hover:text-white"
        >
          View source
        </a>
        <button
          type="button"
          onClick={() => setWhyOpen(true)}
          className="inline-flex items-center justify-center rounded-lg border border-fuchsia-500/25 bg-fuchsia-500/5 px-4 py-2 text-sm font-medium text-fuchsia-200/90 transition hover:border-fuchsia-400/50 hover:bg-fuchsia-500/10 hover:text-fuchsia-100"
        >
          Why?
        </button>
      </div>

      {whyOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby={whyTitleId}
        >
          <button
            type="button"
            className="absolute inset-0 bg-zinc-950/50"
            aria-label="Close"
            onClick={() => setWhyOpen(false)}
          />
          <div className="relative z-10 max-h-[min(90vh,40rem)] w-full max-w-xl overflow-y-auto rounded-xl border border-zinc-700/40 bg-zinc-900/95 p-6 shadow-lg shadow-black/20 ring-1 ring-white/[0.04]">
            <h4 id={whyTitleId} className="font-display pr-10 text-base font-semibold tracking-tight text-zinc-200">
              {title}
            </h4>
            <div className="text-sm">{why}</div>
            <button
              type="button"
              onClick={() => setWhyOpen(false)}
              className="mt-6 w-full rounded-lg bg-zinc-800/60 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function NavLink({ href, children }) {
  return (
    <a
      href={href}
      className="text-sm text-zinc-400 transition hover:text-fuchsia-300"
    >
      {children}
    </a>
  );
}

function SectionTitle({ children, id }) {
  return (
    <h2
      id={id}
      className="font-display text-2xl font-bold tracking-tight text-white md:text-3xl"
    >
      {children}
    </h2>
  );
}

export default function Portfolio() {
  const base = import.meta.env.BASE_URL;
  const projects = [
    {
      title: "Distributed system simulator",
      description:
        "Simulates service failures and visualizes cascading issues across a distributed request chain.",
      bullets: ["Retry & timeout simulation", "Request flow visualization", "Failure injection"],
      demoHref: `${base}simulator/`,
      sourceHref: `${GITHUB_REPO}/tree/main/projects/distributed-simulator`,
      why: (
        <WhySections
          angle={
            <>
              I built this because I kept running into vague discussions about &quot;resilience&quot; and
              &quot;timeouts&quot; that were hard to internalize without seeing them in action. This
              simulator lets me <em className="italic text-zinc-300">experiment with failure</em>. I can
              literally watch how one slow service cascades into system-wide issues.
            </>
          }
          listIntro="It's been especially useful for:"
          bullets={[
            "Developing intuition around retries, backoff, and circuit breakers",
            "Understanding how small latency spikes can snowball",
            "Practicing debugging distributed systems without needing a real production environment",
          ]}
          tieIn={
            <>
              Instead of just reading about distributed systems, I wanted a sandbox where I could break
              things safely and actually <em className="italic text-zinc-300">see</em> why best practices
              exist.
            </>
          }
        />
      ),
    },
    {
      title: "Async job queue",
      description:
        "Queue and worker simulation with retries, exponential backoff, and dead-letter handling.",
      bullets: ["Queue + worker architecture", "Retry strategies", "Monitoring-oriented design"],
      demoHref: `${base}queue/`,
      sourceHref: `${GITHUB_REPO}/tree/main/projects/async-job-queue`,
      why: (
        <WhySections
          angle={
            <>
              I built this after realizing how many real-world systems rely on background
              processing, but tutorials rarely go beyond simple examples. I wanted to understand what
              happens <em className="italic text-zinc-300">after</em> you add a queue: retries, dead letters,
              monitoring, and failure modes.
            </>
          }
          listIntro="It's useful for:"
          bullets={[
            "Learning how to design reliable background job systems",
            "Exploring tradeoffs in retry strategies and backoff",
            "Thinking in terms of eventual consistency instead of synchronous flows",
          ]}
          tieIn='This project reflects my shift from building "toy apps" to thinking like a backend engineer, designing systems that keep working even when parts fail.'
        />
      ),
    },
    {
      title: "Personal librarian",
      description:
        "Local Ollama chat that recommends books from genres, comp titles, and mood, then enriches picks with Google Books covers, blurbs, and aggregate ratings.",
      bullets: ["Ollama (local LLM)", "Google Books metadata", "Goodreads links for community scores"],
      demoHref: `${base}librarian/`,
      sourceHref: `${GITHUB_REPO}/tree/main/projects/book-librarian`,
      why: (
        <WhySections
          angle={
            <>
              I built this because I often struggle to decide what to read next. Recommendations are
              everywhere, but they&apos;re rarely{" "}
              <em className="italic text-zinc-300">personalized to my mood</em>. This tool lets me describe
              what I feel like reading and get curated suggestions enriched with real-world metadata.
            </>
          }
          listIntro="It's useful for:"
          bullets={[
            'Turning vague preferences (“something thoughtful but not heavy”) into concrete recommendations',
            "Combining LLM reasoning with structured data (Google Books, Goodreads)",
            "Running locally, so I can experiment with AI without relying on cloud APIs",
          ]}
          tieIn={
            <>
              This is the most <span className="text-zinc-300">&quot;me&quot;</span> project. It solves a real habit in my life, and it let me explore how AI can feel genuinely helpful rather than gimmicky.
            </>
          }
        />
      ),
    },
    {
      title: "Mock interview coach",
      description:
        "Hiring-manager practice for a chosen company and role: curated behavioral and technical prompts, or a dynamic session with your own Groq API key (free tier). Offline mode needs no backend.",
      bullets: ["Company-themed question tracks", "Offline or Groq (BYOK)", "Static-hosting friendly"],
      demoHref: `${base}interview/`,
      sourceHref: `${GITHUB_REPO}/tree/main/projects/mock-interview`,
      why: (
        <WhySections
          angle="I built this to practice interviews in a way that feels realistic and repeatable. Preparing for interviews is stressful, and I wanted something that adapts to different companies and roles without needing another person."
          listIntro="It's useful for:"
          bullets={[
            "Practicing behavioral and technical questions on demand",
            "Simulating real interview pressure with structured prompts",
            "Running offline or with your own API key, making it flexible and accessible",
          ]}
          tieIn="This project came directly from my own interview prep. It's something I wish I had earlier. It turns a stressful, inconsistent process into something I can iterate on and improve."
        />
      ),
    },
    {
      title: "Card Fit",
      description:
        "CSV or PDF with in-browser parsing and edits, merchant overrides, fee and break-even hints, ranked cards. Web Worker analysis and JSON export.",
      bullets: ["PDF or CSV ingest", "Merchant overrides and fee break-even", "Local-first; no bank linking"],
      demoHref: `${base}card-fit/`,
      sourceHref: `${GITHUB_REPO}/tree/main/projects/card-fit`,
      why: (
        <WhySections
          angle={
            <>
              Ads quote great multipliers, not how much <em className="italic text-zinc-300">you</em> spend on groceries,
              travel, or dining. Card Fit scores cards from your own export using rules you can read, so it stays a
              spreadsheet-style comparison, not an opaque score.
            </>
          }
          listIntro="What I focused on:"
          bullets={[
            "Use files people already have (CSV or PDF), not bank linking",
            "Show why a card ranks: categories, fees, caps, and assumptions",
            "Run analysis in the browser unless a later feature clearly needs opt-in cloud",
          ]}
          tieIn="It pulls together what I like building in production: shaping messy exports into something reliable, keeping the logic explainable, and UX that has to earn trust when the inputs are personal."
        />
      ),
    },
    {
      title: "Reward Optimizer",
      description:
        "Card Fit add-on: upload transactions or paste rows, pick the best card per category from fixed reward rates, see totals per card. Next.js API on Vercel; no accounts in MVP.",
      bullets: ["CSV or manual rows", "Category-based best card", "Serverless /api/optimize"],
      demoHref: REWARD_OPTIMIZER_DEMO,
      sourceHref: `${GITHUB_REPO}/tree/main/projects/reward-optimizer`,
      why: (
        <WhySections
          angle={
            <>
              Card Fit ranks cards from your spending file; Reward Optimizer answers a narrower question:{" "}
              <em className="italic text-zinc-300">for each purchase</em>, which card wins on that category?
              It reuses the same mental model (rates × spend) in a transaction-first UI.
            </>
          }
          listIntro="Why a separate deploy:"
          bullets={[
            "The portfolio site on GitHub Pages is static; this app needs a host that runs Next.js serverless routes.",
            "The live demo is on Vercel; you can override the link with VITE_REWARD_OPTIMIZER_DEMO if you change deployments.",
          ]}
          tieIn="It is intentionally small: prove the scoring path end-to-end, then grow with auth and storage when the workflow deserves it."
        />
      ),
    },
  ];

  return (
    <div className="bg-site min-h-screen text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(217,70,239,0.12),transparent)]" />

      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#070708]/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <a href="#" className="font-display text-lg font-bold tracking-tight text-white">
            Sonali Shanbhag
          </a>
          <div className="flex max-w-[70%] flex-wrap items-center justify-end gap-x-3 gap-y-1 sm:max-w-none sm:gap-x-6">
            <NavLink href="#about">About</NavLink>
            <NavLink href="#experience">Experience</NavLink>
            <NavLink href="#skills">Skills</NavLink>
            <NavLink href="#projects">Projects</NavLink>
            <NavLink href="#contact">Contact</NavLink>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative mx-auto max-w-5xl px-6 pb-20 pt-16 md:pb-28 md:pt-24">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-fuchsia-400/90">
            Software Engineer · San Jose
          </p>
          <h1 className="font-display max-w-4xl text-4xl font-extrabold leading-[1.1] tracking-tight text-white md:text-6xl md:leading-[1.05]">
            <span className="text-gradient">Full-stack & platform</span>
            <br />
            <span className="text-white">systems that hold up in production</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-zinc-400">
            Distributed systems, service orchestration, and data workflows. I debug cross-service
            issues, ship scalable APIs, and care about reliability, scale, and performance.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="#projects"
              className="inline-flex items-center justify-center rounded-full bg-fuchsia-500 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_0_40px_-8px_rgba(217,70,239,0.55)] transition hover:bg-fuchsia-400"
            >
              View projects
            </a>
            <a
              href="#contact"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-medium text-zinc-200 backdrop-blur-sm transition hover:border-fuchsia-500/40 hover:bg-white/[0.08]"
            >
              Get in touch
            </a>
          </div>
        </section>

        <div className="glow-line mx-auto max-w-5xl opacity-60" />

        {/* About */}
        <section id="about" className="mx-auto max-w-5xl scroll-mt-24 px-6 py-20 md:py-28">
          <SectionTitle>About</SectionTitle>
          <div className="mt-10 grid gap-12 md:grid-cols-[minmax(0,280px)_1fr] md:items-start md:gap-16">
            <div className="mx-auto w-full max-w-[280px] md:mx-0">
              <div className="relative">
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-fuchsia-500/40 via-transparent to-violet-600/30 blur-sm" />
                <img
                  src={photo}
                  alt="Sonali Shanbhag"
                  className="relative aspect-[4/5] w-full rounded-3xl object-cover object-top shadow-2xl ring-1 ring-white/10"
                />
              </div>
              <p className="mt-4 text-center text-xs text-zinc-500 md:text-left">
                San Jose, California
              </p>
            </div>
            <div className="space-y-6">
              <p className="text-lg leading-relaxed text-zinc-300">
                I&apos;m a full-stack and platform-focused engineer with experience in distributed
                systems, service orchestration, and data workflows. I&apos;m strongest when tracing
                issues across services, shipping APIs that scale, and delivering systems that matter
                in production.
              </p>
              <p className="leading-relaxed text-zinc-400">
                I gravitate toward roles that emphasize design, reliability, scale, and performance,
                and toward teams that treat observability and pragmatic tradeoffs as first-class.
              </p>
              <div>
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-fuchsia-400/90">
                  Education
                </h3>
                <ul className="mt-4 space-y-4 border-l border-white/10 pl-5">
                  {EDUCATION.map((e) => (
                    <li key={e.school} className="relative">
                      <span className="absolute -left-[21px] top-2 h-2 w-2 rounded-full bg-fuchsia-500/80 ring-4 ring-[#070708]" />
                      <p className="font-medium text-white">{e.school}</p>
                      <p className="text-sm text-zinc-400">{e.detail}</p>
                      <p className="text-xs text-zinc-500">{e.range}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-fuchsia-400/90">
                  Leadership & community
                </h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {LEADERSHIP.map((item) => (
                    <li
                      key={item}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Experience */}
        <section
          id="experience"
          className="border-y border-white/5 bg-black/20 py-20 md:py-28"
        >
          <div className="mx-auto max-w-5xl px-6">
            <SectionTitle>Experience</SectionTitle>
            <p className="mt-3 max-w-2xl text-zinc-400">
              Roles aligned with my resume (impact, stack, and scope).
            </p>

            <div className="mt-14 space-y-14">
              {EXPERIENCE.map((job) => (
                <article key={`${job.company}-${job.range}`} className="relative pl-0 md:pl-8">
                  <div className="absolute left-0 top-2 hidden h-[calc(100%-0.5rem)] w-px bg-gradient-to-b from-fuchsia-500/50 to-transparent md:block" />
                  <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <div>
                      <h3 className="font-display text-xl font-bold text-white">
                        {job.title}{" "}
                        <span className="font-normal text-fuchsia-300/90">· {job.company}</span>
                      </h3>
                      <p className="text-sm text-zinc-500">
                        {job.location} · {job.range}
                      </p>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-400">
                    {job.highlights.map((line) => (
                      <li key={line.slice(0, 48)} className="flex gap-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-500/70" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            <h3 className="font-display mt-20 text-lg font-bold text-white">Internships</h3>
            <div className="mt-8 space-y-12">
              {INTERNSHIPS.map((job) => (
                <article key={`${job.company}-${job.range}`} className="relative pl-0 md:pl-8">
                  <div className="mb-2">
                    <h4 className="font-display text-lg font-semibold text-white">
                      {job.title}{" "}
                      <span className="font-normal text-zinc-400">· {job.company}</span>
                    </h4>
                    <p className="text-sm text-zinc-500">
                      {job.location} · {job.range}
                    </p>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-400">
                    {job.highlights.map((line) => (
                      <li key={line.slice(0, 40)} className="flex gap-3">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Skills */}
        <section id="skills" className="mx-auto max-w-5xl scroll-mt-24 px-6 py-20 md:py-28">
          <SectionTitle>Technical skills</SectionTitle>
          <p className="mt-3 max-w-2xl text-zinc-400">
            Tools and languages I use regularly in production and on the path to shipping.
          </p>
          <div className="mt-10 flex flex-wrap gap-2">
            {SKILLS.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-fuchsia-500/20 bg-fuchsia-500/5 px-4 py-2 text-sm text-zinc-200 transition hover:border-fuchsia-400/40 hover:bg-fuchsia-500/10"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>

        {/* Projects */}
        <section
          id="projects"
          className="border-t border-white/5 bg-black/15 py-20 md:py-28"
        >
          <div className="mx-auto max-w-5xl px-6">
            <SectionTitle>Selected work</SectionTitle>
            <p className="mt-3 max-w-2xl text-zinc-400">
              Personal and conceptual projects that mirror how I think about systems.
            </p>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {projects.map((p) => (
                <ProjectCard key={p.title} {...p} />
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="mx-auto max-w-5xl scroll-mt-24 px-6 py-24 text-center">
          <SectionTitle>Let&apos;s connect</SectionTitle>
          <p className="mx-auto mt-4 max-w-lg text-zinc-400">
            Open to conversations about platform engineering, reliability, and high-impact product
            work.
          </p>
          <a
            href="mailto:sendsonali@gmail.com"
            className="mt-8 inline-block font-display text-xl font-semibold text-fuchsia-300 transition hover:text-fuchsia-200 md:text-2xl"
          >
            sendsonali@gmail.com
          </a>
          <p className="mt-2 text-sm text-zinc-500">408-429-3421 · San Jose, California</p>
          <div className="mt-10 flex justify-center gap-8 text-sm">
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 underline-offset-4 transition hover:text-white hover:underline"
            >
              GitHub
            </a>
            <a href="#" className="text-zinc-400 underline-offset-4 transition hover:text-white hover:underline">
              LinkedIn
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-8 text-center text-xs text-zinc-600">
        © {new Date().getFullYear()} Sonali Shanbhag
      </footer>
    </div>
  );
}
