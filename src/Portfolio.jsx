import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import photo from "./assets/photo.png";

/**
 * Bubble grid areas: sm+ uses About & Skills top corners and Experience / Projects / Contact on the bottom.
 * Below sm, the top grid row is empty (hero stays clear); all five orbs sit in two bottom rows.
 */
const BUBBLE_SECTIONS = [
  { id: "about", label: "About", orbit: "bubble-orbit-1", area: "about" },
  { id: "skills", label: "Skills", orbit: "bubble-orbit-2", area: "skills" },
  { id: "experience", label: "Experience", orbit: "bubble-orbit-3", area: "experience" },
  { id: "projects", label: "Projects", orbit: "bubble-orbit-4", area: "projects" },
  { id: "contact", label: "Contact", orbit: "bubble-orbit-5", area: "contact" },
];

/** Append ?deck= so embedded demos can link back to the right project card. */
function withDeckQuery(href, projectKey) {
  if (!href || !projectKey) return href;
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}deck=${encodeURIComponent(projectKey)}`;
}

function readProjectsDeepLink() {
  if (typeof window === "undefined") return { openProjects: false, deckKey: null };
  const p = new URLSearchParams(window.location.search);
  return {
    openProjects: p.get("open_projects") === "1",
    deckKey: p.get("deck"),
  };
}

function deckIndexFromKey(projects, key) {
  if (!key) return 0;
  const i = projects.findIndex((p) => p.projectKey === key);
  return i >= 0 ? i : 0;
}

/** Deterministic PRNG for stable star positions across renders. */
function mulberry32(seed) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function StarField() {
  const stars = useMemo(() => {
    const rand = mulberry32(0x2f6c1a8b);
    const n = 130;
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({
        x: rand() * 100,
        y: rand() * 100,
        w: rand() * 1.75 + 0.45,
        delay: rand() * 9,
        duration: 2.6 + rand() * 5.5,
        accent: rand() > 0.9,
      });
    }
    return out;
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden>
      {stars.map((s, i) => (
        <span
          key={i}
          className={`star-dot absolute rounded-full ${s.accent ? "bg-fuchsia-200/90" : "bg-white"}`}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.w}px`,
            height: `${s.w}px`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
            boxShadow: s.accent
              ? `0 0 ${Math.round(s.w * 4)}px rgba(232, 121, 249, 0.45)`
              : s.w > 1.15
                ? `0 0 ${Math.round(s.w * 2.5)}px rgba(255, 255, 255, 0.2)`
                : undefined,
          }}
        />
      ))}
    </div>
  );
}

function SectionDrawer({ open, titleId, title, children, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (document.querySelector("[data-why-expanded]")) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/55 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[min(96dvh,44rem)] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-zinc-900/95 p-4 shadow-2xl shadow-black/30 ring-1 ring-white/[0.06] sm:max-h-[min(92vh,44rem)] sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <h2
            id={titleId}
            className="font-display min-w-0 flex-1 text-2xl font-bold tracking-tight text-white md:text-3xl"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-m-2 shrink-0 rounded-lg p-2 text-2xl leading-none text-zinc-500 transition hover:bg-white/10 hover:text-white"
          >
            <span aria-hidden>×</span>
          </button>
        </div>
        <div className="mt-4 sm:mt-6">{children}</div>
      </div>
    </div>
  );
}

function BubbleField({ onSelect, openPanelId }) {
  return (
    <nav
      aria-label="Explore sections"
      className="bubble-field-nav pointer-events-none absolute inset-0 z-[35] grid h-full w-full grid-cols-3 overflow-visible px-2 pb-2 pt-1 gap-x-1 gap-y-3 min-[400px]:gap-x-2 min-[400px]:gap-y-3 sm:gap-x-4 sm:gap-y-4 sm:px-4 sm:py-3"
    >
      {BUBBLE_SECTIONS.map((s) => (
        <div
          key={s.id}
          className={`flex min-h-0 min-w-0 items-center justify-center ${s.orbit}`}
          style={{ gridArea: s.area }}
        >
          <div className="relative">
            <div
              className="bubble-halo pointer-events-none absolute max-sm:-inset-3 max-sm:blur-xl sm:-inset-6 md:-inset-8 rounded-full bg-gradient-to-br from-fuchsia-500/35 to-violet-600/20 blur-2xl"
              aria-hidden
            />
            <button
              type="button"
              onClick={() => onSelect(s.id)}
              aria-label={`Open ${s.label}`}
              aria-pressed={openPanelId === s.id}
              className={[
                "pointer-events-auto relative flex h-[4.25rem] w-[4.25rem] cursor-pointer touch-manipulation items-center justify-center rounded-full border px-1.5 py-1.5 text-center shadow-lg transition min-[400px]:h-[5.25rem] min-[400px]:w-[5.25rem] min-[400px]:px-2 min-[400px]:py-2 sm:h-[6.25rem] sm:w-[6.25rem] md:h-[7.5rem] md:w-[7.5rem] lg:h-[8.25rem] lg:w-[8.25rem]",
                "active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-400",
                openPanelId === s.id
                  ? "border-fuchsia-400/80 bg-gradient-to-br from-fuchsia-500/55 to-violet-600/50 text-white shadow-[0_0_36px_-4px_rgba(217,70,239,0.7)] ring-2 ring-fuchsia-400/50"
                  : "border-white/25 bg-gradient-to-br from-white/18 to-white/[0.06] text-zinc-50 backdrop-blur-md hover:border-fuchsia-400/50 hover:from-fuchsia-500/40 hover:to-violet-600/35 hover:shadow-[0_0_28px_-6px_rgba(217,70,239,0.55)]",
              ].join(" ")}
            >
              <span className="font-display text-[9px] font-bold leading-tight tracking-tight text-balance min-[400px]:text-[10px] sm:text-[11px] md:text-xs lg:text-[13px]">
                {s.label}
              </span>
            </button>
          </div>
        </div>
      ))}
    </nav>
  );
}

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

const LINKEDIN_URL = "https://www.linkedin.com/in/sonali-shanbhag-b73052180/";

/** Used only for mailto: (not shown on the page). Override with `VITE_CONTACT_EMAIL` in `.env` if needed. */
const CONTACT_EMAIL =
  import.meta.env.VITE_CONTACT_EMAIL?.trim() || "sendsonali@gmail.com";

/** Deployed Reward Optimizer on Vercel. Override with `VITE_REWARD_OPTIMIZER_DEMO` in `.env` if the URL changes. */
const REWARD_OPTIMIZER_DEMO =
  import.meta.env.VITE_REWARD_OPTIMIZER_DEMO?.trim() ||
  "https://portfolio-tau-three-jcci2viy7z.vercel.app/";

/** Structured "Why?" body: personal angle, bullet list, personal tie-in. */
function WhySections({ angle, listIntro, bullets, tieIn, compact = false }) {
  const rootClass = compact
    ? "mt-0 space-y-4 text-sm leading-relaxed text-zinc-300 sm:text-[15px] sm:leading-relaxed"
    : "mt-4 space-y-5 text-sm leading-relaxed text-zinc-400";
  const intro = compact
    ? "mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-fuchsia-400/80"
    : "mb-2 text-zinc-500";
  const ul = compact
    ? "list-none space-y-2.5 pl-0 text-zinc-200 [&>li]:relative [&>li]:pl-5 [&>li]:before:absolute [&>li]:before:left-0 [&>li]:before:top-[0.55em] [&>li]:before:h-1.5 [&>li]:before:w-1.5 [&>li]:before:rounded-full [&>li]:before:bg-fuchsia-400/70"
    : "list-disc space-y-1.5 pl-5 marker:text-zinc-600";
  const tieGap = compact ? "[&_p+p]:mt-2" : "[&_p+p]:mt-3";
  const angleLead = compact ? "[&>p]:leading-normal" : "[&>p]:leading-relaxed";

  return (
    <div className={rootClass}>
      <section>
        <div className={angleLead}>
          {typeof angle === "string" ? <p>{angle}</p> : angle}
        </div>
      </section>
      <section>
        <p className={intro}>{listIntro}</p>
        <ul className={ul}>
          {bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section>
        <div className={tieGap}>{typeof tieIn === "string" ? <p>{tieIn}</p> : tieIn}</div>
      </section>
    </div>
  );
}

function ProjectCard({
  title,
  description,
  bullets,
  demoHref,
  sourceHref,
  why,
  isActive = true,
  projectKey: _projectKey,
}) {
  const [whyOpen, setWhyOpen] = useState(false);
  const whyTitleId = useId();

  useEffect(() => {
    if (!isActive) setWhyOpen(false);
  }, [isActive]);

  useEffect(() => {
    if (!whyOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setWhyOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [whyOpen]);

  return (
    <div
      className="w-full [perspective:1200px]"
      data-why-expanded={whyOpen ? "" : undefined}
    >
      <div className="relative w-full max-md:h-[min(72dvh,32rem)] md:min-h-[min(64vh,24rem)] lg:min-h-[min(68vh,26rem)] xl:min-h-[min(72vh,28rem)]">
        <article
          className={[
            "relative h-full min-h-[inherit] w-full transition-transform duration-700 ease-out motion-reduce:duration-0 [transform-style:preserve-3d]",
            whyOpen ? "[transform:rotateY(180deg)]" : "",
          ].join(" ")}
          aria-label={whyOpen ? `${title}: why I built this` : title}
        >
          {/* Front — scroll inside on small screens so actions stay reachable */}
          <div
            className="project-card-scroll group/front absolute inset-0 flex flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain rounded-3xl border border-white/[0.14] bg-gradient-to-br from-zinc-900/95 via-zinc-900/90 to-fuchsia-950/35 p-4 pb-5 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.04)_inset] [backface-visibility:hidden] [transform:rotateY(0deg)] transition-[border-color,box-shadow] duration-300 [scrollbar-gutter:stable] hover:border-fuchsia-400/35 hover:shadow-[0_28px_70px_-24px_rgba(168,85,247,0.22),0_0_0_1px_rgba(217,70,239,0.12)_inset] [touch-action:pan-y] sm:p-6 md:p-7"
            aria-hidden={whyOpen}
          >
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-fuchsia-500/12 blur-3xl transition-opacity duration-300 group-hover/front:opacity-90"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-violet-600/10 blur-3xl"
              aria-hidden
            />
            <div className="relative">
              <div
                className="h-1 w-14 rounded-full bg-gradient-to-r from-fuchsia-400 to-violet-500 shadow-[0_0_20px_rgba(217,70,239,0.45)] sm:w-16"
                aria-hidden
              />
              <h3 className="font-display mt-3 text-lg font-extrabold leading-[1.15] tracking-tight text-white sm:mt-4 sm:text-xl md:mt-5 md:text-2xl">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300 sm:mt-3 sm:text-base md:text-lg md:leading-relaxed">
                {description}
              </p>
              <ul className="mt-3 list-none space-y-2 text-sm leading-snug text-zinc-100 sm:mt-4 sm:space-y-2.5 sm:text-base md:space-y-3 md:text-[17px] md:leading-snug">
                {bullets.map((b) => (
                  <li key={b} className="relative pl-5 before:absolute before:left-0 before:top-[0.55em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-gradient-to-br before:from-fuchsia-400 before:to-violet-500 before:shadow-[0_0_8px_rgba(217,70,239,0.5)]">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative mt-4 flex flex-wrap gap-2 sm:mt-5 sm:gap-2.5 md:mt-6">
              {demoHref ? (
                <a
                  href={demoHref}
                  {...(/^https?:\/\//i.test(demoHref)
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_28px_-8px_rgba(217,70,239,0.55)] transition hover:from-fuchsia-500 hover:to-fuchsia-400 hover:shadow-[0_12px_32px_-6px_rgba(217,70,239,0.45)] sm:px-5 sm:py-2.5 sm:text-base"
                >
                  Open demo
                </a>
              ) : null}
              <a
                href={sourceHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/[0.06] px-4 py-2 text-sm font-medium text-zinc-100 backdrop-blur-sm transition hover:border-fuchsia-400/45 hover:bg-white/[0.1] hover:text-white sm:px-5 sm:py-2.5 sm:text-base"
              >
                View source
              </a>
              <button
                type="button"
                onClick={() => setWhyOpen(true)}
                className="inline-flex items-center justify-center rounded-xl border border-fuchsia-400/35 bg-fuchsia-500/10 px-4 py-2 text-sm font-semibold text-fuchsia-100 transition hover:border-fuchsia-300/50 hover:bg-fuchsia-500/[0.18] hover:text-white sm:px-5 sm:py-2.5 sm:text-base"
              >
                Why?
              </button>
            </div>
          </div>

          {/* Back (why): header / scroll body / footer so button never overlaps text */}
          <div
            className="absolute inset-0 flex min-h-0 flex-col overflow-hidden rounded-3xl border border-fuchsia-500/25 bg-gradient-to-b from-zinc-900/98 to-zinc-950/98 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] [backface-visibility:hidden] [transform:rotateY(180deg)]"
            aria-hidden={!whyOpen}
          >
            <div className="flex shrink-0 items-start justify-between gap-2 border-b border-white/10 bg-fuchsia-950/20 px-5 pb-3.5 pt-5 sm:px-6">
              <h4
                id={whyTitleId}
                className="font-display min-w-0 flex-1 text-base font-bold leading-snug tracking-tight text-white sm:text-lg"
              >
                Why {title}?
              </h4>
              <button
                type="button"
                onClick={() => setWhyOpen(false)}
                aria-label="Flip back to project"
                className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-xl leading-none text-zinc-500 transition hover:bg-white/10 hover:text-white"
              >
                <span aria-hidden>×</span>
              </button>
            </div>
            <div className="project-card-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 [touch-action:pan-y] sm:px-6">
              {why}
            </div>
            <div className="shrink-0 border-t border-white/10 bg-zinc-950/60 px-5 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => setWhyOpen(false)}
                className="w-full rounded-xl border border-white/12 bg-white/[0.06] py-2.5 text-center text-sm font-medium text-zinc-200 transition hover:border-fuchsia-400/35 hover:text-white"
              >
                ← Back to project
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

function ProjectsDeck({ projects, initialDeckKey }) {
  const n = projects.length;
  const [index, setIndex] = useState(() => deckIndexFromKey(projects, initialDeckKey));
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const go = useCallback(
    (delta) => {
      setIndex((i) => (i + delta + n) % n);
    },
    [n]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.target instanceof Element && e.target.closest("[data-why-expanded]")) return;
      e.preventDefault();
      go(e.key === "ArrowLeft" ? -1 : 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e) => {
    if (touchStartX.current == null || touchStartY.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(dx) < 48) return;
    /* Prefer vertical scrolling inside the card over horizontal deck swipe */
    if (Math.abs(dx) <= Math.abs(dy)) return;
    if (dx > 0) go(-1);
    else go(1);
  };

  return (
    <div className="mt-4 sm:mt-6">
      <div className="flex items-stretch gap-1.5 sm:gap-3">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous project"
          className="flex w-9 shrink-0 items-center justify-center self-center rounded-xl border border-white/15 bg-white/[0.04] text-lg text-zinc-300 transition hover:border-fuchsia-500/40 hover:bg-white/[0.08] hover:text-white sm:w-10"
        >
          ‹
        </button>

        <div
          className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-3xl"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="flex transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{
              width: `${n * 100}%`,
              transform: `translateX(-${(index * 100) / n}%)`,
            }}
            aria-live="polite"
            aria-atomic="true"
          >
            {projects.map((p, i) => (
              <div
                key={p.title}
                className={`shrink-0 px-0.5 sm:px-1 ${
                  i === index ? "pointer-events-auto" : "pointer-events-none"
                }`}
                style={{ width: `${100 / n}%` }}
                {...(i !== index ? { inert: "" } : {})}
              >
                <ProjectCard {...p} demoHref={withDeckQuery(p.demoHref, p.projectKey)} isActive={i === index} />
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next project"
          className="flex w-9 shrink-0 items-center justify-center self-center rounded-xl border border-white/15 bg-white/[0.04] text-lg text-zinc-300 transition hover:border-fuchsia-500/40 hover:bg-white/[0.08] hover:text-white sm:w-10"
        >
          ›
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {projects.map((p, i) => (
          <button
            key={p.title}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Show project ${i + 1}: ${p.title}`}
            aria-current={i === index ? "true" : undefined}
            className={[
              "h-2 rounded-full transition-all",
              i === index
                ? "w-6 bg-fuchsia-500"
                : "w-2 bg-zinc-600 hover:bg-zinc-500",
            ].join(" ")}
          />
        ))}
      </div>

      <p className="mt-3 text-center text-xs text-zinc-500">
        Use arrows on your keyboard or swipe on touch screens. {index + 1} / {n}
      </p>
    </div>
  );
}

function NavButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md px-1 py-1.5 text-sm text-zinc-400 transition hover:text-fuchsia-300 sm:px-2"
    >
      {children}
    </button>
  );
}

function ConnectForm() {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    const mailSubject = encodeURIComponent(
      trimmedSubject ? `[Portfolio] ${trimmedSubject}` : "Portfolio: message from site"
    );
    const mailBody = encodeURIComponent(
      `${trimmedName ? `Name: ${trimmedName}\n\n` : ""}${trimmedMessage}`
    );
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${mailSubject}&body=${mailBody}`;
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto mt-10 w-full max-w-md space-y-4 text-left"
    >
      <div>
        <label htmlFor="connect-name" className="mb-1.5 block text-sm font-medium text-zinc-400">
          Name
        </label>
        <input
          id="connect-name"
          name="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none ring-fuchsia-500/0 transition focus:border-fuchsia-500/40 focus:ring-2 focus:ring-fuchsia-500/30"
          placeholder="Your name"
        />
      </div>
      <div>
        <label htmlFor="connect-subject" className="mb-1.5 block text-sm font-medium text-zinc-400">
          Subject
        </label>
        <input
          id="connect-subject"
          name="subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-fuchsia-500/40 focus:ring-2 focus:ring-fuchsia-500/30"
          placeholder="What is this about?"
        />
      </div>
      <div>
        <label htmlFor="connect-message" className="mb-1.5 block text-sm font-medium text-zinc-400">
          Message
        </label>
        <textarea
          id="connect-message"
          name="message"
          rows={5}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full resize-y rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-fuchsia-500/40 focus:ring-2 focus:ring-fuchsia-500/30"
          placeholder="Your message…"
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-lg bg-fuchsia-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-500"
      >
        Open in email app
      </button>
      <p className="text-center text-xs text-zinc-500">
        Opens your mail app with a draft to send. Your address stays private until you hit send.
      </p>
    </form>
  );
}

export default function Portfolio() {
  const base = import.meta.env.BASE_URL;
  const projects = [
    {
      projectKey: "simulator",
      title: "Distributed system simulator",
      description:
        "Simulates service failures and visualizes cascading issues across a distributed request chain.",
      bullets: ["Retry & timeout simulation", "Request flow visualization", "Failure injection"],
      demoHref: `${base}simulator/`,
      sourceHref: `${GITHUB_REPO}/tree/main/projects/distributed-simulator`,
      why: (
        <WhySections
          compact
          angle={
            <>
              &quot;Resilience&quot; and timeouts are easier to <em className="italic text-zinc-300">feel</em>{" "}
              than to debate. This simulator shows how one slow node or bad timeout cascades, no prod cluster
              required.
            </>
          }
          listIntro="Good for:"
          bullets={[
            "Retries, backoff, and failure propagation",
            "Seeing why small latency spikes snowball",
          ]}
          tieIn="A safe place to break things and internalize why common patterns exist."
        />
      ),
    },
    {
      projectKey: "queue",
      title: "Async job queue",
      description:
        "Queue and worker simulation with retries, exponential backoff, and dead-letter handling.",
      bullets: ["Queue + worker architecture", "Retry strategies", "Monitoring-oriented design"],
      demoHref: `${base}queue/`,
      sourceHref: `${GITHUB_REPO}/tree/main/projects/async-job-queue`,
      why: (
        <WhySections
          compact
          angle="Most tutorials stop at a toy queue. I wanted retries, dead letters, and failure modes: the messy part after you enqueue."
          listIntro="Covers:"
          bullets={[
            "Retry/backoff tradeoffs and eventual consistency",
            "Designing jobs that survive partial failure",
          ]}
          tieIn="Part of moving from demo apps to how real backends stay up when workers misbehave."
        />
      ),
    },
    {
      projectKey: "librarian",
      title: "Personal librarian",
      description:
        "Local Ollama chat that recommends books from genres, comp titles, and mood, then enriches picks with Google Books covers, blurbs, and aggregate ratings.",
      bullets: ["Ollama (local LLM)", "Google Books metadata", "Goodreads links for community scores"],
      demoHref: `${base}librarian/`,
      sourceHref: `${GITHUB_REPO}/tree/main/projects/book-librarian`,
      why: (
        <WhySections
          compact
          angle={
            <>
              Picking what to read is hard when lists aren&apos;t tuned to{" "}
              <em className="italic text-zinc-300">mood</em>. Local Ollama suggests titles; Google Books fills
              in covers, blurbs, and links, with no cloud LLM required.
            </>
          }
          listIntro="Highlights:"
          bullets={[
            "Vague prompts → concrete picks",
            "Structured metadata on top of the model",
          ]}
          tieIn="My most personal project: useful AI without the gimmick."
        />
      ),
    },
    {
      projectKey: "interview",
      title: "Mock interview coach",
      description:
        "Hiring-manager practice for a chosen company and role: curated behavioral and technical prompts, or a dynamic session with your own Groq API key (free tier). Offline mode needs no backend.",
      bullets: ["Company-themed question tracks", "Offline or Groq (BYOK)", "Static-hosting friendly"],
      demoHref: `${base}interview/`,
      sourceHref: `${GITHUB_REPO}/tree/main/projects/mock-interview`,
      why: (
        <WhySections
          compact
          angle="Interview prep is noisy and uneven. I wanted company- and role-themed prompts I could run anytime, offline or with a cheap API key."
          listIntro="Use it to:"
          bullets={[
            "Drill behavioral and technical questions on demand",
            "Stay static-host friendly (no backend required for offline)",
          ]}
          tieIn="I built it for my own prep; iteration beats one-off mock sessions."
        />
      ),
    },
    {
      projectKey: "card-fit",
      title: "Card Fit",
      description:
        "CSV or PDF with in-browser parsing and edits, merchant overrides, fee and break-even hints, ranked cards. Web Worker analysis and JSON export.",
      bullets: ["PDF or CSV ingest", "Merchant overrides and fee break-even", "Local-first; no bank linking"],
      demoHref: `${base}card-fit/`,
      sourceHref: `${GITHUB_REPO}/tree/main/projects/card-fit`,
      why: (
        <WhySections
          compact
          angle={
            <>
              Promos quote multipliers, not <em className="italic text-zinc-300">your</em> categories. Card Fit
              ranks from your export with inspectable rules: spreadsheet logic, not a black box.
            </>
          }
          listIntro="Principles:"
          bullets={[
            "CSV/PDF in-browser, no bank linking",
            "Explainable scores (fees, caps, assumptions)",
          ]}
          tieIn="Trust matters when the inputs are your money."
        />
      ),
    },
    {
      projectKey: "reward-optimizer",
      title: "Reward Optimizer",
      description:
        "Card Fit add-on: upload transactions or paste rows, pick the best card per category from fixed reward rates, see totals per card. Next.js API on Vercel; no accounts in MVP.",
      bullets: ["CSV or manual rows", "Category-based best card", "Serverless /api/optimize"],
      demoHref: REWARD_OPTIMIZER_DEMO,
      sourceHref: `${GITHUB_REPO}/tree/main/projects/reward-optimizer`,
      why: (
        <WhySections
          compact
          angle={
            <>
              Card Fit ranks overall spend; this answers{" "}
              <em className="italic text-zinc-300">per transaction</em>, which card wins that category: same
              math, different UI.
            </>
          }
          listIntro="Separate app because:"
          bullets={[
            "GitHub Pages can’t run Next.js API routes",
            "Demo lives on Vercel; URL overridable via env",
          ]}
          tieIn="Small MVP: prove scoring end-to-end first."
        />
      ),
    },
  ];

  const deepLinkOnLoad = readProjectsDeepLink();
  const [panel, setPanel] = useState(() => (deepLinkOnLoad.openProjects ? "projects" : null));
  const [initialDeckKey] = useState(() => deepLinkOnLoad.deckKey);
  const panelTitleId = useId();

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("open_projects") !== "1") return;
    p.delete("open_projects");
    p.delete("deck");
    const rest = p.toString();
    const url = `${window.location.pathname}${rest ? `?${rest}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", url);
  }, []);

  const panelTitles = {
    about: "About",
    experience: "Experience",
    skills: "Technical skills",
    projects: "Selected work",
    contact: "Let's connect",
  };

  return (
    <div className="bg-site relative flex h-[100dvh] min-h-0 flex-col overflow-hidden text-zinc-100">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(217,70,239,0.12),transparent)]" />
      <StarField />

      <header className="relative z-40 border-b border-white/5 bg-[#070708]/70 backdrop-blur-md">
        <nav
          className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-3 sm:px-8 sm:py-4"
          aria-label="Site sections"
        >
          <div className="flex w-full flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:flex-nowrap sm:justify-between sm:gap-x-4 md:gap-x-8 lg:gap-x-12">
            <NavButton onClick={() => setPanel("about")}>About</NavButton>
            <NavButton onClick={() => setPanel("experience")}>Experience</NavButton>
            <NavButton onClick={() => setPanel("skills")}>Skills</NavButton>
            <NavButton onClick={() => setPanel("projects")}>Projects</NavButton>
            <NavButton onClick={() => setPanel("contact")}>Contact</NavButton>
          </div>
        </nav>
      </header>

      <main className="relative z-[30] flex min-h-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1">
          <BubbleField onSelect={setPanel} openPanelId={panel} />
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center px-5 pt-12 pb-36 text-center sm:px-8 sm:pb-40 sm:pt-14 md:pb-44 md:pt-16 lg:pb-48">
            <div className="pointer-events-auto max-w-xl md:max-w-4xl -translate-y-6 sm:-translate-y-8 md:-translate-y-10">
            <h1 className="font-display text-3xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-5xl sm:leading-[1.08]">
              <span className="text-gradient">Hi, I&apos;m Sonali!</span>
            </h1>
            <p className="mt-5 text-base font-medium leading-relaxed text-zinc-200 sm:mt-6 sm:text-lg sm:leading-relaxed lg:whitespace-nowrap">
              I build full-stack and platform systems that hold up under real-world pressure.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400 sm:mt-5 sm:text-base sm:leading-relaxed">
              I&apos;m especially interested in the why behind what we build, designing reliable systems,
              debugging complex issues, and making things work at scale.
            </p>
            <p className="mt-5 text-[11px] leading-snug text-zinc-500 sm:mt-6 sm:text-xs">
              <span className="sm:hidden">
                Tap the orbs below or use the menu above to open About, Experience, Skills, Projects, or
                Contact.
              </span>
              <span className="hidden sm:inline">
                Tap any orb around the center to explore About, Experience, Skills, Projects, or Contact
                and learn more.
              </span>
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:mt-6">
              <button
                type="button"
                onClick={() => setPanel("projects")}
                className="inline-flex items-center justify-center rounded-full bg-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_40px_-8px_rgba(217,70,239,0.55)] transition hover:bg-fuchsia-400"
              >
                View projects
              </button>
              <button
                type="button"
                onClick={() => setPanel("contact")}
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-zinc-200 backdrop-blur-sm transition hover:border-fuchsia-500/40 hover:bg-white/[0.08]"
              >
                Get in touch
              </button>
            </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-40 shrink-0 border-t border-white/5 bg-[#070708]/60 py-2.5 text-center text-[10px] text-zinc-600 backdrop-blur-sm sm:py-3 sm:text-xs">
        © {new Date().getFullYear()} Sonali Shanbhag
      </footer>

      <SectionDrawer
        open={panel != null}
        titleId={panelTitleId}
        title={panel ? panelTitles[panel] : ""}
        onClose={() => setPanel(null)}
      >
        {panel === "about" && (
          <div className="text-left">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-fuchsia-400/90">
              Software Engineer · San Jose
            </p>
            <p className="mt-4 text-base leading-relaxed text-zinc-300">
              I&apos;m passionate about learning new technologies. I&apos;m looking for opportunities in
              user-focused technology where I can learn, work hard, have fun and make an impact through
              design and programming.
            </p>
            <div className="mt-10 border-t border-white/10 pt-10">
            <div className="grid gap-10 md:grid-cols-[minmax(0,220px)_1fr] md:items-start md:gap-12">
              <div className="mx-auto w-full max-w-[220px] md:mx-0">
                <div className="relative">
                  <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-fuchsia-500/40 via-transparent to-violet-600/30 blur-sm" />
                  <img
                    src={photo}
                    alt="Sonali Shanbhag"
                    className="relative aspect-[4/5] w-full rounded-3xl object-cover object-top shadow-2xl ring-1 ring-white/10"
                  />
                </div>
              </div>
              <div className="space-y-5">
                <p className="text-base leading-relaxed text-zinc-300">
                  I&apos;m a full-stack and platform-focused engineer with experience in distributed
                  systems, service orchestration, and data workflows. I&apos;m strongest when tracing
                  issues across services, shipping APIs that scale, and delivering systems that matter
                  in production.
                </p>
                <p className="text-sm leading-relaxed text-zinc-400">
                  I gravitate toward roles that emphasize design, reliability, scale, and performance,
                  and toward teams that treat observability and pragmatic tradeoffs as first-class.
                </p>
                <div>
                  <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-fuchsia-400/90">
                    Education
                  </h3>
                  <ul className="mt-3 space-y-3 border-l border-white/10 pl-4">
                    {EDUCATION.map((e) => (
                      <li key={e.school} className="relative">
                        <span className="absolute -left-[17px] top-1.5 h-1.5 w-1.5 rounded-full bg-fuchsia-500/80 ring-2 ring-zinc-900" />
                        <p className="font-medium text-white">{e.school}</p>
                        <p className="text-sm text-zinc-400">{e.detail}</p>
                        <p className="text-xs text-zinc-500">{e.range}</p>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-fuchsia-400/90">
                    Leadership & community
                  </h3>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {LEADERSHIP.map((item) => (
                      <li
                        key={item}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-300"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            </div>
          </div>
        )}

        {panel === "experience" && (
          <div className="text-left">
            <p className="text-sm text-zinc-400">
              Roles aligned with my resume (impact, stack, and scope).
            </p>
            <div className="mt-8 space-y-12">
              {EXPERIENCE.map((job) => (
                <article key={`${job.company}-${job.range}`} className="relative pl-0 md:pl-6">
                  <div className="absolute left-0 top-2 hidden h-[calc(100%-0.5rem)] w-px bg-gradient-to-b from-fuchsia-500/50 to-transparent md:block" />
                  <div className="mb-2">
                    <h3 className="font-display text-lg font-bold text-white">
                      {job.title}{" "}
                      <span className="font-normal text-fuchsia-300/90">· {job.company}</span>
                    </h3>
                    <p className="text-sm text-zinc-500">
                      {job.location} · {job.range}
                    </p>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-400">
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
            <h3 className="font-display mt-14 text-base font-bold text-white">Internships</h3>
            <div className="mt-6 space-y-10">
              {INTERNSHIPS.map((job) => (
                <article key={`${job.company}-${job.range}`} className="relative pl-0 md:pl-6">
                  <div className="mb-2">
                    <h4 className="font-display text-base font-semibold text-white">
                      {job.title}{" "}
                      <span className="font-normal text-zinc-400">· {job.company}</span>
                    </h4>
                    <p className="text-sm text-zinc-500">
                      {job.location} · {job.range}
                    </p>
                  </div>
                  <ul className="mt-2 space-y-2 text-sm leading-relaxed text-zinc-400">
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
        )}

        {panel === "skills" && (
          <div className="text-left">
            <p className="text-sm text-zinc-400">
              Tools and languages I use regularly in production and on the path to shipping.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {SKILLS.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-fuchsia-500/20 bg-fuchsia-500/5 px-3 py-1.5 text-sm text-zinc-200"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {panel === "projects" && (
          <div className="text-left">
            <p className="text-xs leading-relaxed text-zinc-400 sm:text-sm">
              Personal and conceptual projects that mirror how I think about systems. Use the arrows or
              dots to change projects; tap <span className="text-zinc-300">Why?</span> on a card to flip it
              and read the story on the back.
            </p>
            <ProjectsDeck projects={projects} initialDeckKey={initialDeckKey} />
          </div>
        )}

        {panel === "contact" && (
          <div className="text-center">
            <p className="mx-auto max-w-lg text-sm text-zinc-400">
              Open to conversations about platform engineering, reliability, and high-impact product work.
            </p>
            <ConnectForm />
            <div className="mt-8 flex justify-center gap-8 text-sm">
              <a
                href={GITHUB_REPO}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 underline-offset-4 transition hover:text-white hover:underline"
              >
                GitHub
              </a>
              <a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 underline-offset-4 transition hover:text-white hover:underline"
              >
                LinkedIn
              </a>
            </div>
          </div>
        )}
      </SectionDrawer>
    </div>
  );
}
