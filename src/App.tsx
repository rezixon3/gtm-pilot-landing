import { useState, useEffect, useRef } from 'react'
import {
  Apple, Monitor, ChevronRight, Zap, Table2,
  Check, Loader2, CircleDot, Bot, Lock, Globe, Sparkles,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const COMPANIES = [
  { name: 'Stripe', domain: 'stripe.com', email: 'alex@stripe.com', score: 95 },
  { name: 'Linear', domain: 'linear.app', email: 'karri@linear.app', score: 92 },
  { name: 'Notion', domain: 'notion.so', email: 'ivan@notion.so', score: 78 },
  { name: 'Vercel', domain: 'vercel.com', email: 'guillermo@vercel.com', score: 90 },
  { name: 'Figma', domain: 'figma.com', email: 'dylan@figma.com', score: 88 },
  { name: 'Resend', domain: 'resend.com', email: 'zeno@resend.com', score: 82 },
  { name: 'Clerk', domain: 'clerk.com', email: 'colin@clerk.com', score: 87 },
]

const USER_MESSAGE = 'Find emails for all prospects using Prospeo'

const CLAUDE_LINES = [
  "I'll set up an enrichment pipeline using Prospeo's",
  'email finder for your Prospects table.',
  '',
  'Creating computed field "Email" with Prospeo...',
  'Running email enrichment on 7 rows...',
]

const CLAUDE_LINES_2 = [
  'Email enrichment complete: 7/7 succeeded',
  '',
  'Running lead score computation...',
]

const CLAUDE_LINES_3 = [
  'Lead scoring complete: 7/7 succeeded',
  '',
  'All 7 prospects fully enriched.',
]

// ---------------------------------------------------------------------------
// Animation timing (in ticks, each tick = 70ms)
// ---------------------------------------------------------------------------

const TICK_MS = 70
const TOTAL_TICKS = 240

const USER_MSG_START = 5
const USER_MSG_END = 30

const CLAUDE_1_START = 35
const ROWS_START = 42
const ROW_STAGGER = 3

const EMAIL_PENDING = 62
const EMAIL_RUN_START = 68
const EMAIL_RUN_STAGGER = 5
const EMAIL_SUCCESS_DELAY = 9

const CLAUDE_2_START = 120
const SCORE_START = 130
const SCORE_STAGGER = 4

const CLAUDE_3_START = 160

// Fade out for loop reset
const FADE_OUT_START = 210

type CellStatus = 'hidden' | 'pending' | 'running' | 'success'

function getCellStatus(
  rowIndex: number,
  column: 'email' | 'score',
  tick: number,
): CellStatus {
  if (column === 'email') {
    const successTick = EMAIL_RUN_START + rowIndex * EMAIL_RUN_STAGGER + EMAIL_SUCCESS_DELAY
    const runTick = EMAIL_RUN_START + rowIndex * EMAIL_RUN_STAGGER
    if (tick >= successTick) return 'success'
    if (tick >= runTick) return 'running'
    if (tick >= EMAIL_PENDING) return 'pending'
    return 'hidden'
  }
  const scoreTick = SCORE_START + rowIndex * SCORE_STAGGER
  if (tick >= scoreTick + 6) return 'success'
  if (tick >= scoreTick) return 'running'
  if (tick >= SCORE_START - 5) return 'pending'
  return 'hidden'
}

function getVisibleUserChars(tick: number): number {
  if (tick < USER_MSG_START) return 0
  if (tick >= USER_MSG_END) return USER_MESSAGE.length
  const progress = (tick - USER_MSG_START) / (USER_MSG_END - USER_MSG_START)
  return Math.floor(progress * USER_MESSAGE.length)
}

function getVisibleClaudeLines(tick: number, startTick: number, lines: string[]): number {
  if (tick < startTick) return 0
  const elapsed = tick - startTick
  return Math.min(lines.length, Math.floor(elapsed / 3) + 1)
}

// ---------------------------------------------------------------------------
// Window chrome
// ---------------------------------------------------------------------------

function WindowChrome() {
  return (
    <div className="flex h-11 items-center gap-2 border-b border-white/[0.06] bg-[#1A1A1C] px-4">
      <div className="flex gap-2">
        <div className="size-3 rounded-full bg-[#FF5F57] shadow-[inset_0_-0.5px_0.5px_rgba(0,0,0,0.2)]" />
        <div className="size-3 rounded-full bg-[#FEBC2E] shadow-[inset_0_-0.5px_0.5px_rgba(0,0,0,0.2)]" />
        <div className="size-3 rounded-full bg-[#28C840] shadow-[inset_0_-0.5px_0.5px_rgba(0,0,0,0.2)]" />
      </div>
      <div className="flex-1 text-center">
        <span className="text-[11px] font-medium text-white/30 tracking-wide">GTM Pilot -- prospects.db</span>
      </div>
      <div className="w-[60px]" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function DemoSidebar({ tick }: { tick: number }) {
  const rowCount = tick >= ROWS_START + COMPANIES.length * ROW_STAGGER
    ? COMPANIES.length
    : tick >= ROWS_START
      ? Math.min(COMPANIES.length, Math.floor((tick - ROWS_START) / ROW_STAGGER) + 1)
      : COMPANIES.length

  return (
    <div className="flex w-[170px] shrink-0 flex-col border-r border-white/[0.06] bg-[#131315]">
      {/* Tables */}
      <div className="px-3 pt-3.5 pb-2">
        <div className="mb-2 text-[10px] font-semibold tracking-widest text-white/25 uppercase">Tables</div>
        <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.06] px-2.5 py-2">
          <Table2 className="size-3.5 text-indigo-400" />
          <span className="text-[11px] font-medium text-white/80">Prospects</span>
          <span className="ml-auto rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-medium text-white/30 tabular-nums">
            {rowCount}
          </span>
        </div>
      </div>

      {/* Extensions */}
      <div className="mt-auto border-t border-white/[0.06] px-3 pt-3 pb-3">
        <div className="mb-2 text-[10px] font-semibold tracking-widest text-white/25 uppercase">Extensions</div>
        <div className="space-y-0.5">
          <ExtensionRow name="Prospeo" connected />
          <ExtensionRow name="Apollo" connected />
          <ExtensionRow name="Firecrawl" connected={false} />
          <ExtensionRow name="Hunter" connected={false} />
        </div>
      </div>
    </div>
  )
}

function ExtensionRow({ name, connected }: { name: string; connected: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-white/[0.03]">
      <div className={`size-[6px] rounded-full ${connected ? 'bg-emerald-400 shadow-[0_0_4px_rgba(16,185,129,0.4)]' : 'bg-white/15'}`} />
      <span className={`text-[11px] ${connected ? 'text-white/60' : 'text-white/30'}`}>{name}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

function DemoGrid({ tick }: { tick: number }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#0E0E10]">
      {/* Column headers */}
      <div className="flex shrink-0 border-b border-white/[0.06] bg-[#16161A]">
        <div className="flex w-9 shrink-0 items-center justify-center border-r border-white/[0.05] py-2.5 text-[10px] text-white/15">#</div>
        <HeaderCell label="Company" width="w-[105px]" />
        <HeaderCell label="Domain" width="w-[115px]" />
        <HeaderCell label="Email" width="w-[180px]" computed />
        <HeaderCell label="Lead Score" width="w-[95px]" computed last />
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-hidden">
        {COMPANIES.map((company, i) => {
          const rowAppearTick = ROWS_START + i * ROW_STAGGER
          const visible = tick >= rowAppearTick
          if (!visible) return null

          const emailStatus = getCellStatus(i, 'email', tick)
          const scoreStatus = getCellStatus(i, 'score', tick)

          return (
            <div
              key={company.name}
              className="animate-slide-in flex border-b border-white/[0.04] transition-colors"
              style={{ backgroundColor: i % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
            >
              <div className="flex w-9 shrink-0 items-center justify-center border-r border-white/[0.05] py-2.5 text-[10px] text-white/15 tabular-nums">
                {i + 1}
              </div>
              <DataCell value={company.name} width="w-[105px]" />
              <DataCell value={company.domain} width="w-[115px]" mono />
              <ComputedCell value={company.email} status={emailStatus} width="w-[180px]" mono />
              <ComputedCell value={company.score.toString()} status={scoreStatus} width="w-[95px]" last />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HeaderCell({ label, width, computed, last }: { label: string; width: string; computed?: boolean; last?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-2.5 ${width} ${!last ? 'border-r border-white/[0.05]' : ''}`}>
      {computed && <Zap className="size-2.5 text-indigo-400/50" />}
      <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wide">{label}</span>
    </div>
  )
}

function DataCell({ value, width, mono }: { value: string; width: string; mono?: boolean }) {
  return (
    <div className={`flex items-center border-r border-white/[0.05] px-3 py-2.5 ${width}`}>
      <span className={`text-[11px] text-white/75 ${mono ? 'font-mono text-[10.5px]' : ''}`}>{value}</span>
    </div>
  )
}

function ComputedCell({ value, status, width, mono, last }: {
  value: string
  status: CellStatus
  width: string
  mono?: boolean
  last?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-2.5 ${width} ${!last ? 'border-r border-white/[0.05]' : ''} ${
        status === 'success' ? 'animate-success-flash' : ''
      } ${status === 'running' ? 'bg-indigo-500/[0.03]' : ''}`}
    >
      {status === 'hidden' && (
        <span className="text-[11px] text-white/10">--</span>
      )}
      {status === 'pending' && (
        <CircleDot className="size-3 text-white/15 animate-pulse-subtle" />
      )}
      {status === 'running' && (
        <Loader2 className="size-3 text-indigo-400 animate-spin-slow" />
      )}
      {status === 'success' && (
        <>
          <Check className="size-3 shrink-0 text-emerald-400" />
          <span className={`animate-value-in text-[11px] truncate text-white/80 ${mono ? 'font-mono text-[10.5px]' : 'tabular-nums font-medium'}`}>
            {value}
          </span>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Terminal
// ---------------------------------------------------------------------------

function DemoTerminal({ tick }: { tick: number }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [tick])

  const userChars = getVisibleUserChars(tick)
  const showUserMsg = tick >= USER_MSG_START
  const userDone = tick >= USER_MSG_END

  const claude1Lines = getVisibleClaudeLines(tick, CLAUDE_1_START, CLAUDE_LINES)
  const claude2Lines = getVisibleClaudeLines(tick, CLAUDE_2_START, CLAUDE_LINES_2)
  const claude3Lines = getVisibleClaudeLines(tick, CLAUDE_3_START, CLAUDE_LINES_3)

  return (
    <div className="flex w-[260px] shrink-0 flex-col border-l border-white/[0.06] bg-[#0C0C0E]">
      {/* Terminal header */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2.5">
        <div className="flex size-4 items-center justify-center rounded bg-orange-500/10">
          <Sparkles className="size-2.5 text-orange-400/60" />
        </div>
        <span className="text-[10px] font-medium text-white/30">Claude Code</span>
      </div>

      {/* Terminal content */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-[10px] leading-[17px]">
        {/* Prompt line decoration */}
        {!showUserMsg && (
          <div className="text-white/15">
            <span className="text-indigo-400/40">{'> '}</span>
            <span className="cursor-blink">|</span>
          </div>
        )}

        {/* User message */}
        {showUserMsg && (
          <div className="animate-terminal-in mb-3">
            <span className="text-indigo-400">{'> '}</span>
            <span className="text-white/85">{USER_MESSAGE.slice(0, userChars)}</span>
            {!userDone && <span className="cursor-blink text-indigo-300">|</span>}
          </div>
        )}

        {/* Claude response 1 */}
        {claude1Lines > 0 && (
          <div className="mb-3 rounded-md bg-white/[0.02] px-2.5 py-2">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Bot className="size-3 text-orange-400/60" />
              <span className="text-[9px] font-medium text-orange-400/40">Claude</span>
            </div>
            {CLAUDE_LINES.slice(0, claude1Lines).map((line, i) => (
              <div key={i} className="animate-terminal-in text-white/55">
                {line || '\u00A0'}
              </div>
            ))}
          </div>
        )}

        {/* Claude response 2 */}
        {claude2Lines > 0 && (
          <div className="mb-3">
            {CLAUDE_LINES_2.slice(0, claude2Lines).map((line, i) => (
              <div key={i} className="animate-terminal-in">
                {i === 0 ? (
                  <span className="text-emerald-400/90">{'  ✓ '}{line}</span>
                ) : (
                  <span className="text-white/55">{line || '\u00A0'}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Claude response 3 */}
        {claude3Lines > 0 && (
          <div className="mb-3">
            {CLAUDE_LINES_3.slice(0, claude3Lines).map((line, i) => (
              <div key={i} className="animate-terminal-in">
                {i === 0 ? (
                  <span className="text-emerald-400/90">{'  ✓ '}{line}</span>
                ) : i === 2 ? (
                  <span className="font-medium text-white/80">{line}</span>
                ) : (
                  <span className="text-white/55">{line || '\u00A0'}</span>
                )}
              </div>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status bar
// ---------------------------------------------------------------------------

function DemoStatusBar({ tick }: { tick: number }) {
  const totalRows = COMPANIES.length
  const emailsDone = COMPANIES.reduce((c, _, i) =>
    c + (getCellStatus(i, 'email', tick) === 'success' ? 1 : 0), 0)
  const scoresDone = COMPANIES.reduce((c, _, i) =>
    c + (getCellStatus(i, 'score', tick) === 'success' ? 1 : 0), 0)

  let statusText = 'Ready'
  let statusColor = 'text-white/25'
  let showSpinner = false
  let showCheck = false

  if (tick >= CLAUDE_3_START + 8) {
    statusText = `Pipeline complete: ${totalRows}/${totalRows} enriched`
    statusColor = 'text-emerald-400/60'
    showCheck = true
  } else if (tick >= SCORE_START - 5) {
    statusText = `Running lead scores... ${scoresDone}/${totalRows}`
    statusColor = 'text-indigo-400/60'
    showSpinner = true
  } else if (tick >= CLAUDE_2_START) {
    statusText = `Email enrichment complete: ${totalRows}/${totalRows}`
    statusColor = 'text-emerald-400/60'
    showCheck = true
  } else if (tick >= EMAIL_PENDING) {
    statusText = `Running email enrichment... ${emailsDone}/${totalRows}`
    statusColor = 'text-indigo-400/60'
    showSpinner = true
  }

  return (
    <div className="flex h-7 items-center justify-between border-t border-white/[0.06] bg-[#131315] px-4 text-[10px]">
      <div className="flex items-center gap-2">
        {showSpinner && <Loader2 className="size-2.5 text-indigo-400 animate-spin-slow" />}
        {showCheck && <Check className="size-2.5 text-emerald-400" />}
        <span className={statusColor}>{statusText}</span>
      </div>
      <div className="flex items-center gap-3 text-white/20">
        <span className="flex items-center gap-1"><Globe className="size-2.5" /> 2 connected</span>
        <span className="flex items-center gap-1"><Lock className="size-2.5" /> Local</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Demo Window (the star of the show)
// ---------------------------------------------------------------------------

function DemoWindow() {
  const [tick, setTick] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const windowRef = useRef<HTMLDivElement>(null)

  // Start animation when scrolled into view
  useEffect(() => {
    const el = windowRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Tick counter with smooth loop
  useEffect(() => {
    if (!isVisible) return
    const id = setInterval(() => {
      setTick((t) => (t >= TOTAL_TICKS ? 0 : t + 1))
    }, TICK_MS)
    return () => clearInterval(id)
  }, [isVisible])

  // Fade out near the end of the loop for smooth reset
  const opacity = tick >= FADE_OUT_START
    ? Math.max(0, 1 - (tick - FADE_OUT_START) / (TOTAL_TICKS - FADE_OUT_START))
    : tick < 3
      ? tick / 3
      : 1

  return (
    <div ref={windowRef} className="relative mx-auto w-full max-w-[900px]">
      {/* Ambient glow */}
      <div className="demo-glow" />

      {/* Reflection/border glow */}
      <div className="absolute -inset-[1px] z-[5] rounded-xl bg-gradient-to-b from-white/[0.08] via-white/[0.03] to-transparent opacity-60 pointer-events-none" />

      {/* Window with perspective */}
      <div
        className="demo-window relative z-10 overflow-hidden rounded-xl border border-white/[0.06] shadow-[0_20px_70px_-15px_rgba(0,0,0,0.7),0_0_40px_-15px_rgba(99,102,241,0.15)]"
        style={{
          opacity,
          transition: tick < 5 ? 'opacity 0.3s ease-out' : 'none',
        }}
      >
        <WindowChrome />
        <div className="flex h-[370px]">
          <DemoSidebar tick={tick} />
          <DemoGrid tick={tick} />
          <DemoTerminal tick={tick} />
        </div>
        <DemoStatusBar tick={tick} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Download buttons
// ---------------------------------------------------------------------------

function DownloadButtons({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  const isLg = size === 'lg'

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <a
        href="#"
        className={`group flex items-center gap-2.5 rounded-xl bg-white font-medium text-zinc-900 transition-all duration-200 hover:bg-zinc-100 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98] ${
          isLg ? 'px-6 py-3 text-[13px]' : 'px-5 py-2.5 text-xs'
        }`}
      >
        <Apple className={isLg ? 'size-[18px]' : 'size-4'} />
        Download for macOS
        <ChevronRight className={`${isLg ? 'size-4' : 'size-3.5'} -mr-1 opacity-30 transition-transform duration-200 group-hover:translate-x-0.5`} />
      </a>
      <a
        href="#"
        className={`group flex items-center gap-2.5 rounded-xl border border-white/[0.10] font-medium text-white/90 transition-all duration-200 hover:border-white/[0.18] hover:bg-white/[0.04] hover:shadow-[0_0_20px_rgba(255,255,255,0.03)] active:scale-[0.98] ${
          isLg ? 'px-6 py-3 text-[13px]' : 'px-5 py-2.5 text-xs'
        }`}
      >
        <Monitor className={isLg ? 'size-[18px]' : 'size-4'} />
        Download for Windows
      </a>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI-Native',
    desc: 'Claude Code is your copilot. Describe what you need in plain English -- it writes the functions, runs the pipeline, and fills your table.',
  },
  {
    icon: Zap,
    title: 'Programmable Columns',
    desc: 'Every column is a JavaScript function. Chain enrichment APIs, web scrapers, and custom logic into powerful pipelines.',
  },
  {
    icon: Lock,
    title: 'Runs 100% Locally',
    desc: 'Your data, your API keys, your machine. One .db file per project. No cloud. No vendor lock-in. You own everything.',
  },
]

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export function App() {
  return (
    <div className="min-h-screen">
      {/* Gradient background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[#09090B]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.06)_0%,transparent_70%)]" />
      </div>

      {/* Nav */}
      <nav className="fixed top-0 right-0 left-0 z-50 border-b border-white/[0.04] bg-[#09090B]/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <Zap className="size-3.5 text-indigo-400" />
            </div>
            <span className="text-sm font-semibold tracking-tight">GTM Pilot</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#demo" className="text-[13px] text-white/35 transition-colors hover:text-white/70">Demo</a>
            <a href="#features" className="text-[13px] text-white/35 transition-colors hover:text-white/70">Features</a>
            <a
              href="#"
              className="rounded-lg bg-white/[0.07] px-3.5 py-1.5 text-[13px] font-medium text-white/80 transition-all hover:bg-white/[0.12]"
            >
              Download
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 pt-32">
        <section className="mx-auto max-w-6xl px-6 text-center">
          {/* Badge */}
          <div className="animate-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-4 py-1.5">
            <div className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
            <span className="text-[11px] font-medium text-white/45">Now in early access</span>
          </div>

          {/* Headline */}
          <h1 className="animate-fade-up-delay-1 mx-auto max-w-3xl text-[3.2rem] leading-[1.08] font-bold tracking-[-0.025em] sm:text-[4rem]">
            The IDE for{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              Go-To-Market
            </span>
          </h1>

          {/* Subtitle */}
          <p className="animate-fade-up-delay-2 mx-auto mt-5 max-w-[480px] text-[15px] leading-relaxed text-white/35">
            A programmable spreadsheet where every column is a function.
            Build AI-powered enrichment pipelines in minutes, not months.
          </p>

          {/* CTA */}
          <div className="animate-fade-up-delay-3 mt-9 flex justify-center">
            <DownloadButtons />
          </div>
        </section>

        {/* Demo */}
        <section id="demo" className="mx-auto mt-20 max-w-6xl px-6 pb-4">
          <DemoWindow />
        </section>

        {/* Features */}
        <section id="features" className="mx-auto mt-32 max-w-4xl px-6">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight">Built different</h2>
            <p className="mt-2 text-sm text-white/30">Everything you need, nothing you don't.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-white/[0.05] bg-white/[0.015] p-6 transition-all duration-300 hover:border-white/[0.10] hover:bg-white/[0.025]"
              >
                <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all group-hover:from-indigo-500/15 group-hover:to-violet-500/15">
                  <f.icon className="size-4.5 text-indigo-400" />
                </div>
                <h3 className="mb-1.5 text-[13px] font-semibold">{f.title}</h3>
                <p className="text-[12px] leading-relaxed text-white/35">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto mt-32 max-w-6xl px-6 text-center">
          <h2 className="mb-3 text-3xl font-bold tracking-tight">Ready to ship faster?</h2>
          <p className="mb-9 text-sm text-white/35">
            Download GTM Pilot and build your first pipeline in under 5 minutes.
          </p>
          <div className="flex justify-center">
            <DownloadButtons size="sm" />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-32 border-t border-white/[0.04] py-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Zap className="size-3 text-indigo-400/30" />
            <span className="text-[11px] font-medium text-white/20">GTM Pilot</span>
          </div>
          <span className="text-[11px] text-white/15">Built for the next generation of revenue teams.</span>
        </div>
      </footer>
    </div>
  )
}
