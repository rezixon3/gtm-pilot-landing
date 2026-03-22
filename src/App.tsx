import { useState, useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Demo data
// ─────────────────────────────────────────────────────────────────────────────

const ROWS = [
  { company: 'Stripe', domain: 'stripe.com', title: 'Head of Sales', email: 'alex.m@stripe.com', score: 95 },
  { company: 'Linear', domain: 'linear.app', title: 'VP Revenue', email: 'karri.s@linear.app', score: 92 },
  { company: 'Notion', domain: 'notion.so', title: 'CRO', email: 'ivan.z@notion.so', score: 78 },
  { company: 'Vercel', domain: 'vercel.com', title: 'Dir. Partnerships', email: 'g.rauch@vercel.com', score: 90 },
  { company: 'Figma', domain: 'figma.com', title: 'Head of Growth', email: 'dylan.f@figma.com', score: 88 },
  { company: 'Resend', domain: 'resend.com', title: 'CEO', email: 'zeno.r@resend.com', score: 82 },
  { company: 'Clerk', domain: 'clerk.com', title: 'VP Sales', email: 'colin.r@clerk.com', score: 87 },
  { company: 'Neon', domain: 'neon.tech', title: 'Head of BD', email: 'nikita.s@neon.tech', score: 91 },
]

const USER_MSG = 'Find emails and score leads for all 8 prospects using Prospeo'

interface TermLine { text: string; style: 'dim' | 'normal' | 'success' | 'bold' }

const CLAUDE_1: TermLine[] = [
  { text: "I'll set up the enrichment pipeline using Prospeo", style: 'normal' },
  { text: 'for your Prospects table.', style: 'normal' },
  { text: '', style: 'dim' },
  { text: 'Creating field "Email" with Prospeo email finder...', style: 'dim' },
  { text: 'Creating field "Lead Score" with scoring logic...', style: 'dim' },
  { text: 'Running on 8 rows...', style: 'dim' },
]

const CLAUDE_2: TermLine[] = [
  { text: '\u2713 Email: 8/8 found', style: 'success' },
  { text: 'Running lead scores...', style: 'dim' },
]

const CLAUDE_3: TermLine[] = [
  { text: '\u2713 Scoring: 8/8 complete', style: 'success' },
  { text: '', style: 'dim' },
  { text: 'Done. All 8 prospects enriched.', style: 'bold' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Animation timeline (ticks @ 65ms)
// ─────────────────────────────────────────────────────────────────────────────

const T = 65
const LOOP = 260

const TYPE_START = 5
const TYPE_END = 35
const C1_START = 42
const ROW_START = 48
const ROW_GAP = 3
const EMAIL_PEND = 72
const EMAIL_GO = 78
const EMAIL_STEP = 5
const EMAIL_DONE = 9
const C2_START = 130
const SCORE_GO = 138
const SCORE_STEP = 4
const SCORE_DONE = 6
const C3_START = 175
const FADE = 230

type S = 'none' | 'wait' | 'run' | 'ok'

function cellState(row: number, col: 'email' | 'score', tick: number): S {
  if (col === 'email') {
    const ok = EMAIL_GO + row * EMAIL_STEP + EMAIL_DONE
    const go = EMAIL_GO + row * EMAIL_STEP
    if (tick >= ok) return 'ok'
    if (tick >= go) return 'run'
    if (tick >= EMAIL_PEND) return 'wait'
    return 'none'
  }
  const ok = SCORE_GO + row * SCORE_STEP + SCORE_DONE
  const go = SCORE_GO + row * SCORE_STEP
  if (tick >= ok) return 'ok'
  if (tick >= go) return 'run'
  if (tick >= SCORE_GO - 6) return 'wait'
  return 'none'
}

function typedChars(tick: number): number {
  if (tick < TYPE_START) return 0
  if (tick >= TYPE_END) return USER_MSG.length
  return Math.floor(((tick - TYPE_START) / (TYPE_END - TYPE_START)) * USER_MSG.length)
}

function visLines(tick: number, start: number, lines: TermLine[]): number {
  if (tick < start) return 0
  return Math.min(lines.length, Math.floor((tick - start) / 3) + 1)
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform icons (inline SVG, no library)
// ─────────────────────────────────────────────────────────────────────────────

function AppleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M11.182 0c.2 1.095-.32 2.196-.953 2.965-.648.77-1.713 1.366-2.755 1.288-.222-1.06.37-2.178.97-2.87C9.1.612 10.227.04 11.182 0zm2.73 5.554c-.133.08-2.243 1.306-2.22 3.7.026 2.87 2.566 3.835 2.593 3.846-.02.066-.4 1.38-1.34 2.738-.806 1.17-1.643 2.342-2.966 2.365-.647.013-1.08-.173-1.53-.366-.468-.2-.955-.41-1.678-.41-.764 0-1.272.215-1.762.422-.432.183-.85.36-1.427.385-1.274.048-2.242-1.267-3.06-2.432C-.62 13.028-1.37 9.156.646 6.533c.995-1.295 2.78-2.117 4.713-2.14.724-.013 1.426.266 2.04.51.47.187.885.352 1.22.352.293 0 .692-.157 1.168-.34.724-.28 1.606-.62 2.527-.528.633.025 2.413.254 3.556 1.917l.042.053z" />
    </svg>
  )
}

function WindowsLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M0 2.303l6.543-.89v6.322H0V2.303zm7.2-.98L15.994.017v7.718H7.2V1.323zM16 8.5v7.717l-8.8-1.21V8.5H16zM6.543 14.83L0 13.96V8.5h6.543v6.33z" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo: Window chrome
// ─────────────────────────────────────────────────────────────────────────────

function Chrome() {
  return (
    <div className="flex h-10 items-center border-b border-white/[0.06] bg-[#171717] px-4 select-none">
      <div className="flex gap-[7px]">
        <i className="block size-[10px] rounded-full bg-[#FF5F57]" />
        <i className="block size-[10px] rounded-full bg-[#FEBC2E]" />
        <i className="block size-[10px] rounded-full bg-[#28C840]" />
      </div>
      <span className="flex-1 text-center text-[11px] tracking-wide text-white/20">
        prospects.db
      </span>
      <div className="w-[50px]" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo: Sidebar
// ─────────────────────────────────────────────────────────────────────────────

function Sidebar({ tick }: { tick: number }) {
  const n = tick >= ROW_START + ROWS.length * ROW_GAP
    ? ROWS.length
    : tick >= ROW_START
      ? Math.min(ROWS.length, Math.floor((tick - ROW_START) / ROW_GAP) + 1)
      : ROWS.length

  return (
    <div className="flex w-[154px] shrink-0 flex-col border-r border-white/[0.06] bg-[#111]">
      <div className="px-3 pt-3">
        <p className="mb-2 text-[9px] font-medium tracking-[0.12em] text-white/20 uppercase">Tables</p>
        <div className="flex items-center gap-2 rounded-md bg-white/[0.06] px-2.5 py-[7px]">
          <span className="size-[6px] rounded-sm bg-white/30" />
          <span className="text-[11px] font-medium text-white/70">Prospects</span>
          <span className="ml-auto font-mono text-[10px] text-white/20">{n}</span>
        </div>
      </div>
      <div className="mt-auto border-t border-white/[0.06] px-3 py-3">
        <p className="mb-2 text-[9px] font-medium tracking-[0.12em] text-white/20 uppercase">Connected</p>
        {['Prospeo', 'Apollo'].map(name => (
          <div key={name} className="flex items-center gap-2 py-[5px]">
            <span className="size-[5px] rounded-full bg-emerald-400/80" />
            <span className="text-[11px] text-white/50">{name}</span>
          </div>
        ))}
        {['Firecrawl'].map(name => (
          <div key={name} className="flex items-center gap-2 py-[5px]">
            <span className="size-[5px] rounded-full bg-white/10" />
            <span className="text-[11px] text-white/25">{name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo: Grid
// ─────────────────────────────────────────────────────────────────────────────

const COLS: readonly { key: string; label: string; w: string; mono?: boolean; computed?: boolean }[] = [
  { key: 'company', label: 'Company', w: 'w-[88px]' },
  { key: 'domain', label: 'Domain', w: 'w-[96px]', mono: true },
  { key: 'title', label: 'Title', w: 'w-[116px]' },
  { key: 'email', label: 'Email', w: 'w-[148px]', mono: true, computed: true },
  { key: 'score', label: 'Score', w: 'w-[62px]', computed: true },
]

function Grid({ tick }: { tick: number }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#0D0D0D]">
      {/* Header */}
      <div className="flex shrink-0 border-b border-white/[0.06] bg-[#141414]">
        <div className="w-7 shrink-0 border-r border-white/[0.04]" />
        {COLS.map((c, i) => (
          <div key={c.key} className={`flex items-center px-2.5 py-[9px] ${c.w} ${i < COLS.length - 1 ? 'border-r border-white/[0.04]' : ''}`}>
            {c.computed && <span className="mr-1 text-[8px] text-violet-400/40">f</span>}
            <span className="text-[10px] font-medium text-white/30">{c.label}</span>
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-hidden">
        {ROWS.map((row, i) => {
          if (tick < ROW_START + i * ROW_GAP) return null
          const es = cellState(i, 'email', tick)
          const ss = cellState(i, 'score', tick)
          return (
            <div key={i} className="anim-row flex border-b border-white/[0.03]"
              style={{ background: i % 2 ? 'rgba(255,255,255,0.008)' : 'transparent' }}>
              <div className="flex w-7 shrink-0 items-center justify-center border-r border-white/[0.04] text-[10px] text-white/12 tabular-nums">{i + 1}</div>
              <Cell w="w-[88px]" value={row.company} border />
              <Cell w="w-[96px]" value={row.domain} mono border />
              <Cell w="w-[116px]" value={row.title} border />
              <Computed w="w-[148px]" value={row.email} state={es} mono border />
              <Computed w="w-[62px]" value={String(row.score)} state={ss} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Cell({ w, value, mono, border }: { w: string; value: string; mono?: boolean; border?: boolean }) {
  return (
    <div className={`flex items-center px-2.5 py-[8px] ${w} ${border ? 'border-r border-white/[0.04]' : ''}`}>
      <span className={`truncate text-[11px] text-white/60 ${mono ? 'font-mono text-[10px]' : ''}`}>{value}</span>
    </div>
  )
}

function Computed({ w, value, state, mono, border }: { w: string; value: string; state: S; mono?: boolean; border?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-[8px] ${w} ${border ? 'border-r border-white/[0.04]' : ''} ${state === 'ok' ? 'anim-flash' : ''}`}>
      {state === 'none' && <span className="text-[10px] text-white/8">&mdash;</span>}
      {state === 'wait' && <span className="inline-block size-[5px] rounded-full bg-white/15 anim-pulse" />}
      {state === 'run' && (
        <svg className="size-3 text-violet-400/70 anim-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="8" cy="8" r="6" strokeOpacity="0.2" />
          <path d="M14 8a6 6 0 0 0-6-6" strokeLinecap="round" />
        </svg>
      )}
      {state === 'ok' && (
        <>
          <svg className="size-3 shrink-0 text-emerald-400/70" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="3.5 8.5 6.5 11.5 12.5 5" />
          </svg>
          <span className={`anim-value truncate text-[11px] text-white/70 ${mono ? 'font-mono text-[10px]' : 'tabular-nums'}`}>{value}</span>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo: Terminal
// ─────────────────────────────────────────────────────────────────────────────

function Term({ tick }: { tick: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.scrollIntoView({ behavior: 'smooth' }) }, [tick])

  const chars = typedChars(tick)
  const show = tick >= TYPE_START
  const done = tick >= TYPE_END
  const c1 = visLines(tick, C1_START, CLAUDE_1)
  const c2 = visLines(tick, C2_START, CLAUDE_2)
  const c3 = visLines(tick, C3_START, CLAUDE_3)

  return (
    <div className="flex w-[240px] shrink-0 flex-col border-l border-white/[0.06] bg-[#0A0A0A]">
      <div className="border-b border-white/[0.06] px-3 py-2">
        <span className="text-[10px] font-medium text-white/20">claude</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 font-mono text-[10px] leading-[17px]">
        {!show && (
          <span className="text-white/15">{'\u276f '}<span className="anim-blink text-white/30">_</span></span>
        )}
        {show && (
          <div className="mb-3">
            <span className="text-violet-400/70">{'\u276f '}</span>
            <span className="text-white/70">{USER_MSG.slice(0, chars)}</span>
            {!done && <span className="anim-blink text-violet-300/60">_</span>}
          </div>
        )}
        {c1 > 0 && (
          <div className="mb-3">
            {CLAUDE_1.slice(0, c1).map((l, i) => (
              <div key={i} className={lineStyle(l.style)}>{l.text || '\u00A0'}</div>
            ))}
          </div>
        )}
        {c2 > 0 && (
          <div className="mb-3">
            {CLAUDE_2.slice(0, c2).map((l, i) => (
              <div key={i} className={lineStyle(l.style)}>{l.text || '\u00A0'}</div>
            ))}
          </div>
        )}
        {c3 > 0 && (
          <div className="mb-3">
            {CLAUDE_3.slice(0, c3).map((l, i) => (
              <div key={i} className={lineStyle(l.style)}>{l.text || '\u00A0'}</div>
            ))}
          </div>
        )}
        <div ref={ref} />
      </div>
    </div>
  )
}

function lineStyle(s: string): string {
  switch (s) {
    case 'success': return 'text-emerald-400/70'
    case 'bold': return 'text-white/70'
    case 'dim': return 'text-white/30'
    default: return 'text-white/45'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo: Status
// ─────────────────────────────────────────────────────────────────────────────

function Status({ tick }: { tick: number }) {
  const n = ROWS.length
  const ed = ROWS.reduce((a, _, i) => a + (cellState(i, 'email', tick) === 'ok' ? 1 : 0), 0)
  const sd = ROWS.reduce((a, _, i) => a + (cellState(i, 'score', tick) === 'ok' ? 1 : 0), 0)

  let text = ''
  if (tick >= C3_START + 8) text = `Complete \u00B7 ${n}/${n} enriched`
  else if (tick >= SCORE_GO - 6) text = `Scoring \u00B7 ${sd}/${n}`
  else if (tick >= C2_START) text = `Emails done \u00B7 ${n}/${n}`
  else if (tick >= EMAIL_PEND) text = `Finding emails \u00B7 ${ed}/${n}`
  else text = 'Ready'

  return (
    <div className="flex h-[26px] items-center justify-between border-t border-white/[0.06] bg-[#111] px-4 text-[10px] text-white/15">
      <span>{text}</span>
      <span>2 extensions \u00B7 {n} rows</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo window
// ─────────────────────────────────────────────────────────────────────────────

function Demo() {
  const [tick, setTick] = useState(0)
  const [live, setLive] = useState(false)
  const el = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = el.current
    if (!node) return
    const obs = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) { setLive(true); obs.disconnect() }
    }, { threshold: 0.15 })
    obs.observe(node)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!live) return
    const id = setInterval(() => setTick(t => t >= LOOP ? 0 : t + 1), T)
    return () => clearInterval(id)
  }, [live])

  const opacity = tick >= FADE ? Math.max(0, 1 - (tick - FADE) / (LOOP - FADE))
    : tick < 4 ? tick / 4 : 1

  return (
    <div ref={el} className="relative mx-auto w-full max-w-[1060px]">
      {/* Ambient light */}
      <div className="pointer-events-none absolute -inset-32 z-0"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(139,92,246,0.04) 0%, transparent 70%)' }} />

      {/* Window */}
      <div className="relative z-10 overflow-hidden rounded-xl border border-white/[0.06]"
        style={{
          opacity,
          boxShadow: '0 24px 80px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset',
        }}>
        <Chrome />
        <div className="flex" style={{ height: 420 }}>
          <Sidebar tick={tick} />
          <Grid tick={tick} />
          <Term tick={tick} />
        </div>
        <Status tick={tick} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export function App() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed inset-x-0 top-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
          <span className="text-[13px] font-semibold tracking-tight text-white/70">GTM Pilot</span>
          <a href="#download" className="text-[13px] text-white/30 transition-colors hover:text-white/60">Download</a>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-[1200px] px-6 pt-36 pb-4 text-center">
          <h1 className="anim-hero-1 text-[3.5rem] leading-[1.06] font-bold tracking-[-0.035em] text-white sm:text-[4.5rem] md:text-[5.5rem]">
            The IDE for<br />Go-To-Market
          </h1>
          <p className="anim-hero-2 mx-auto mt-5 max-w-[420px] text-[15px] leading-[1.6] text-white/30">
            Every column is a function. Every function calls an API.
            Your data never leaves your machine.
          </p>

          {/* Download */}
          <div id="download" className="anim-hero-3 mt-10 flex flex-wrap items-center justify-center gap-3">
            <a href="#" className="group flex items-center gap-2.5 rounded-full bg-white px-6 py-2.5 text-[13px] font-medium text-[#0A0A0A] transition-all hover:bg-white/90 active:scale-[0.98]">
              <AppleLogo className="size-[14px]" />
              Download for Mac
            </a>
            <a href="#" className="group flex items-center gap-2.5 rounded-full border border-white/[0.12] px-6 py-2.5 text-[13px] font-medium text-white/70 transition-all hover:border-white/20 hover:text-white/90 active:scale-[0.98]">
              <WindowsLogo className="size-[13px]" />
              Download for Windows
            </a>
          </div>
        </section>

        {/* Demo */}
        <section className="anim-hero-4 mx-auto mt-16 max-w-[1200px] px-4">
          <Demo />
        </section>

        {/* Statement */}
        <section className="mx-auto mt-32 max-w-[600px] px-6 text-center">
          <p className="text-[15px] leading-[1.8] text-white/20">
            GTM Pilot is a desktop app that runs entirely on your computer.
            Connect your enrichment APIs, describe what you need to Claude,
            and watch your spreadsheet fill in real time. One <span className="text-white/40">.db</span> file per project.
            No cloud. No vendor lock-in.
          </p>
        </section>

        {/* Second CTA */}
        <section className="mx-auto mt-24 max-w-[1200px] px-6 text-center">
          <p className="mb-6 text-[22px] font-semibold tracking-[-0.02em] text-white/80">
            Try it free
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href="#" className="flex items-center gap-2.5 rounded-full bg-white px-6 py-2.5 text-[13px] font-medium text-[#0A0A0A] transition-all hover:bg-white/90 active:scale-[0.98]">
              <AppleLogo className="size-[14px]" />
              macOS
            </a>
            <a href="#" className="flex items-center gap-2.5 rounded-full border border-white/[0.12] px-6 py-2.5 text-[13px] font-medium text-white/70 transition-all hover:border-white/20 hover:text-white/90 active:scale-[0.98]">
              <WindowsLogo className="size-[13px]" />
              Windows
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-32 border-t border-white/[0.04] py-8">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 text-[11px] text-white/12">
          <span>GTM Pilot</span>
          <span>&copy; 2026</span>
        </div>
      </footer>
    </div>
  )
}
