import { useState, useEffect, useRef } from 'react'

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const ROWS = [
  { company: 'Stripe',  domain: 'stripe.com',  title: 'Head of Sales',       email: 'alex.m@stripe.com',  score: 95 },
  { company: 'Linear',  domain: 'linear.app',  title: 'VP Revenue',          email: 'karri.s@linear.app', score: 92 },
  { company: 'Notion',  domain: 'notion.so',   title: 'CRO',                 email: 'ivan.z@notion.so',   score: 78 },
  { company: 'Vercel',  domain: 'vercel.com',  title: 'Dir. Partnerships',   email: 'g.rauch@vercel.com', score: 90 },
  { company: 'Figma',   domain: 'figma.com',   title: 'Head of Growth',      email: 'dylan.f@figma.com',  score: 88 },
  { company: 'Resend',  domain: 'resend.com',  title: 'CEO',                 email: 'zeno.r@resend.com',  score: 82 },
  { company: 'Clerk',   domain: 'clerk.com',   title: 'VP Sales',            email: null,                 score: null },
  { company: 'Neon',    domain: 'neon.tech',    title: 'Head of BD',          email: 'nikita.s@neon.tech', score: 91 },
]

const USER_MSG = 'Find emails and score leads for these 8 prospects using Prospeo'

interface TermLine { text: string; kind: 'agent' | 'dim' | 'success' | 'error' | 'bold' | 'tool' }

const TERM_SCRIPT: { at: number; lines: TermLine[] }[] = [
  { at: 42, lines: [
    { text: "I'll enrich your Prospects table", kind: 'agent' },
    { text: 'using Prospeo.', kind: 'agent' },
  ]},
  { at: 50, lines: [
    { text: '', kind: 'dim' },
    { text: '> gtm_add_field("Email", computed)', kind: 'tool' },
    { text: '> gtm_add_field("Score", computed)', kind: 'tool' },
  ]},
  { at: 60, lines: [
    { text: 'Running on 8 records...', kind: 'dim' },
  ]},
  { at: 130, lines: [
    { text: '', kind: 'dim' },
    { text: '\u2713 Email: 7/8 found', kind: 'success' },
    { text: '\u2717 Clerk: not found', kind: 'error' },
  ]},
  { at: 142, lines: [
    { text: '', kind: 'dim' },
    { text: '> gtm_run(f_score)', kind: 'tool' },
  ]},
  { at: 185, lines: [
    { text: '\u2713 Score: 7/8 complete', kind: 'success' },
    { text: '', kind: 'dim' },
    { text: 'Done. 7 enriched, 1 error.', kind: 'bold' },
  ]},
]

// ---------------------------------------------------------------------------
// Timeline (ticks @ 55ms)
// ---------------------------------------------------------------------------

const T = 55
const LOOP = 290

const TYPE_START = 5
const TYPE_END = 35
const ROW_START = 44
const ROW_GAP = 2

const EMAIL_PEND = 68
const EMAIL_GO = 76
const EMAIL_STEP = 6
const EMAIL_DONE_DUR = 8

const SCORE_PEND = 136
const SCORE_GO = 144
const SCORE_STEP = 5
const SCORE_DONE_DUR = 6

const FADE_OUT = 260

type CellStatus = 'none' | 'pending' | 'running' | 'ok' | 'error'

function cellState(row: number, col: 'email' | 'score', tick: number): CellStatus {
  const isErr = row === 6
  if (col === 'email') {
    const go = EMAIL_GO + row * EMAIL_STEP
    const done = go + EMAIL_DONE_DUR
    if (tick >= done) return isErr ? 'error' : 'ok'
    if (tick >= go) return 'running'
    if (tick >= EMAIL_PEND) return 'pending'
    return 'none'
  }
  const go = SCORE_GO + row * SCORE_STEP
  const done = go + SCORE_DONE_DUR
  if (tick >= done) return isErr ? 'error' : 'ok'
  if (tick >= go) return 'running'
  if (tick >= SCORE_PEND) return 'pending'
  return 'none'
}

function typedChars(tick: number): number {
  if (tick < TYPE_START) return 0
  if (tick >= TYPE_END) return USER_MSG.length
  const p = (tick - TYPE_START) / (TYPE_END - TYPE_START)
  return Math.floor((1 - Math.pow(1 - p, 2)) * USER_MSG.length)
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Demo: Chrome bar
// ---------------------------------------------------------------------------

function Chrome() {
  return (
    <div className="flex h-[38px] items-center border-b border-white/[0.06] bg-[#1A1A1A] px-4 select-none">
      <div className="flex gap-[7px]">
        <i className="block size-[10px] rounded-full bg-[#FF5F57]" />
        <i className="block size-[10px] rounded-full bg-[#FEBC2E]" />
        <i className="block size-[10px] rounded-full bg-[#28C840]" />
      </div>
      <span className="flex-1 text-center text-[11px] tracking-wide text-white/20">
        GTM Pilot - prospects.db
      </span>
      <div className="w-[50px]" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Demo: Sidebar
// ---------------------------------------------------------------------------

function Sidebar({ tick }: { tick: number }) {
  const n = tick >= ROW_START + ROWS.length * ROW_GAP ? ROWS.length
    : tick >= ROW_START ? Math.min(ROWS.length, Math.floor((tick - ROW_START) / ROW_GAP) + 1)
    : ROWS.length

  return (
    <div className="flex w-[160px] shrink-0 flex-col border-r border-white/[0.06] bg-[#111]">
      {/* Tables */}
      <div className="px-2.5 pt-3">
        <p className="mb-1.5 px-1 text-[9px] font-medium tracking-[0.1em] text-white/20 uppercase">Tables</p>
        <div className="flex items-center gap-1.5 rounded-md bg-white/[0.07] px-2 py-[6px]">
          <svg className="size-[11px] text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
          <span className="text-[11px] font-medium text-white/70">Prospects</span>
          <span className="ml-auto font-mono text-[9px] text-white/25">{n}</span>
        </div>
      </div>

      {/* Extensions */}
      <div className="mt-auto border-t border-white/[0.06] px-2.5 py-2.5">
        <p className="mb-1 px-1 text-[9px] font-medium tracking-[0.1em] text-white/20 uppercase">Connected</p>
        {['Prospeo', 'Apollo'].map(name => (
          <div key={name} className="flex items-center gap-1.5 px-1 py-[4px]">
            <span className="size-[5px] rounded-full bg-emerald-400/80" />
            <span className="text-[10px] text-white/50">{name}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 px-1 py-[4px]">
          <span className="size-[5px] rounded-full bg-white/10" />
          <span className="text-[10px] text-white/20">Firecrawl</span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Demo: Grid
// ---------------------------------------------------------------------------

const COLS: { key: string; label: string; w: number; mono?: boolean; computed?: boolean }[] = [
  { key: 'company', label: 'Company',  w: 100 },
  { key: 'domain',  label: 'Domain',   w: 110,  mono: true },
  { key: 'title',   label: 'Title',    w: 130 },
  { key: 'email',   label: 'Email',    w: 180, mono: true, computed: true },
  { key: 'score',   label: 'Score',    w: 64,  computed: true },
]

function Grid({ tick }: { tick: number }) {
  const emailsDone = ROWS.reduce((a, _, i) => a + (['ok','error'].includes(cellState(i, 'email', tick)) ? 1 : 0), 0)
  const scoresDone = ROWS.reduce((a, _, i) => a + (['ok','error'].includes(cellState(i, 'score', tick)) ? 1 : 0), 0)
  const isRunning = tick >= EMAIL_PEND && !(emailsDone === 8 && scoresDone === 8)
  const allDone = emailsDone === 8 && scoresDone === 8

  const showEmail = tick >= 52
  const showScore = tick >= 55

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#0D0D0D]">
      {/* Toolbar */}
      <div className="flex h-[34px] shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#141414] px-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-white/60">Prospects</span>
          <span className="text-[9px] text-white/15">All rows</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] text-white/15">{ROWS.length} rows</span>
          <button className={`flex h-[22px] items-center gap-1 rounded-md px-2 text-[10px] font-medium ${
            isRunning ? 'bg-[#6366F1] text-white' : allDone ? 'bg-emerald-400/15 text-emerald-400/80' : 'bg-[#6366F1] text-white'
          }`}>
            {isRunning ? (
              <>
                <svg className="size-[10px] anim-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="8" cy="8" r="6" strokeOpacity="0.3" /><path d="M14 8a6 6 0 0 0-6-6" strokeLinecap="round" />
                </svg>
                Running...
              </>
            ) : allDone ? (
              <>
                <svg className="size-[10px]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3.5 8.5 6.5 11.5 12.5 5" /></svg>
                Complete
              </>
            ) : (
              <>
                <svg className="size-[10px]" viewBox="0 0 16 16" fill="currentColor"><path d="M5 3.5l8 4.5-8 4.5V3.5z" /></svg>
                Run
              </>
            )}
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex shrink-0 border-b border-white/[0.06] bg-[#141414]">
        <div className="flex w-[28px] shrink-0 items-center justify-center border-r border-white/[0.04] py-[6px]">
          <span className="size-[9px] rounded-[2px] border border-white/10" />
        </div>
        {COLS.map((c, i) => {
          if (c.key === 'email' && !showEmail) return null
          if (c.key === 'score' && !showScore) return null
          const isNew = (c.key === 'email' && tick < 58) || (c.key === 'score' && tick < 61)
          return (
            <div key={c.key} className={`flex items-center px-2 py-[6px] ${isNew ? 'anim-col-add' : ''} ${i < COLS.length - 1 ? 'border-r border-white/[0.04]' : ''}`} style={{ width: c.w }}>
              <span className="text-[9.5px] font-medium text-white/25">{c.label}</span>
              {c.computed && <span className="ml-auto text-[7px] font-semibold text-[#6366F1]/40">fx</span>}
            </div>
          )
        })}
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-hidden">
        {ROWS.map((row, i) => {
          if (tick < ROW_START + i * ROW_GAP) return null
          const es = cellState(i, 'email', tick)
          const ss = cellState(i, 'score', tick)
          return (
            <div key={i} className="anim-row flex border-b border-white/[0.03]" style={{ background: i % 2 ? 'rgba(255,255,255,0.008)' : 'transparent' }}>
              <div className="flex w-[28px] shrink-0 items-center justify-center border-r border-white/[0.04] text-[9px] tabular-nums text-white/10">{i + 1}</div>
              <DataCell w={80} value={row.company} border />
              <DataCell w={92} value={row.domain} mono border />
              <DataCell w={112} value={row.title} border />
              {showEmail && <CompCell w={148} value={row.email} state={es} mono border />}
              {showScore && <ScoreCell w={56} value={row.score} state={ss} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DataCell({ w, value, mono, border }: { w: number; value: string; mono?: boolean; border?: boolean }) {
  return (
    <div className={`flex items-center px-2 py-[6px] ${border ? 'border-r border-white/[0.04]' : ''}`} style={{ width: w }}>
      <span className={`truncate text-[10px] text-white/55 ${mono ? 'font-mono text-[9.5px]' : ''}`}>{value}</span>
    </div>
  )
}

function CompCell({ w, value, state, mono, border }: {
  w: number; value: string | null; state: CellStatus; mono?: boolean; border?: boolean
}) {
  return (
    <div className={`flex items-center gap-1 px-2 py-[6px] ${state === 'ok' ? 'anim-cell-ok' : ''} ${state === 'error' ? 'anim-cell-err' : ''} ${border ? 'border-r border-white/[0.04]' : ''}`} style={{ width: w }}>
      {state === 'none' && <span className="text-[9px] text-white/8">&mdash;</span>}
      {state === 'pending' && <span className="inline-block size-[4px] rounded-full bg-white/15 anim-pulse" />}
      {state === 'running' && (
        <svg className="size-[10px] text-[#6366F1]/70 anim-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="8" cy="8" r="6" strokeOpacity="0.2" /><path d="M14 8a6 6 0 0 0-6-6" strokeLinecap="round" />
        </svg>
      )}
      {state === 'ok' && value && (
        <>
          <svg className="size-[10px] shrink-0 text-emerald-400/70 anim-check" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="3.5 8.5 6.5 11.5 12.5 5" />
          </svg>
          <span className={`anim-value truncate text-[10px] text-white/65 ${mono ? 'font-mono text-[9.5px]' : ''}`}>{value}</span>
        </>
      )}
      {state === 'error' && (
        <div className="anim-error flex items-center gap-1">
          <svg className="size-[10px] shrink-0 text-red-400/80" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="4.5" y1="4.5" x2="11.5" y2="11.5" /><line x1="11.5" y1="4.5" x2="4.5" y2="11.5" />
          </svg>
          <span className="text-[9px] text-red-400/50">Error</span>
        </div>
      )}
    </div>
  )
}

function ScoreCell({ w, value, state }: { w: number; value: number | null; state: CellStatus }) {
  return (
    <div className={`flex items-center justify-end gap-1 px-2 py-[6px] ${state === 'ok' ? 'anim-cell-ok' : ''} ${state === 'error' ? 'anim-cell-err' : ''}`} style={{ width: w }}>
      {state === 'none' && <span className="text-[9px] text-white/8">&mdash;</span>}
      {state === 'pending' && <span className="inline-block size-[4px] rounded-full bg-white/15 anim-pulse" />}
      {state === 'running' && (
        <svg className="size-[10px] text-[#6366F1]/70 anim-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="8" cy="8" r="6" strokeOpacity="0.2" /><path d="M14 8a6 6 0 0 0-6-6" strokeLinecap="round" />
        </svg>
      )}
      {state === 'ok' && value !== null && (
        <>
          <svg className="size-[10px] shrink-0 text-emerald-400/70 anim-check" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="3.5 8.5 6.5 11.5 12.5 5" />
          </svg>
          <div className="anim-value flex items-center gap-1">
            <div className="h-[3px] w-[22px] overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full" style={{
                width: `${value}%`,
                background: value >= 90 ? '#34D399' : value >= 80 ? '#818CF8' : '#FBBF24',
              }} />
            </div>
            <span className="font-mono text-[9px] tabular-nums text-white/55">{value}</span>
          </div>
        </>
      )}
      {state === 'error' && (
        <div className="anim-error flex items-center gap-1">
          <svg className="size-[10px] shrink-0 text-red-400/80" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="4.5" y1="4.5" x2="11.5" y2="11.5" /><line x1="11.5" y1="4.5" x2="4.5" y2="11.5" />
          </svg>
          <span className="text-[9px] text-red-400/50">&mdash;</span>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Demo: Terminal
// ---------------------------------------------------------------------------

function Term({ tick }: { tick: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' }) }, [tick])

  const chars = typedChars(tick)
  const show = tick >= TYPE_START
  const done = tick >= TYPE_END

  return (
    <div className="flex w-[260px] shrink-0 flex-col border-l border-white/[0.06] bg-[#0A0A0A]">
      <div className="border-b border-white/[0.06] px-3 py-[6px]">
        <span className="text-[9px] font-medium text-white/20">Terminal</span>
      </div>
      <div ref={ref} className="flex-1 overflow-y-auto px-2.5 py-2.5 font-mono text-[9px] leading-[15px]">
        {!show && (
          <span className="text-white/15">&gt; <span className="anim-blink text-white/30">_</span></span>
        )}
        {show && (
          <div className="mb-2.5">
            <span className="text-[#6366F1]/70">&gt; </span>
            <span className="text-white/70">{USER_MSG.slice(0, chars)}</span>
            {!done && <span className="anim-blink text-[#6366F1]/60">_</span>}
          </div>
        )}
        {TERM_SCRIPT.map((block, bi) => {
          if (tick < block.at) return null
          const n = Math.min(block.lines.length, Math.floor((tick - block.at) / 2) + 1)
          return (
            <div key={bi} className="mb-1.5">
              {block.lines.slice(0, n).map((l, li) => {
                if (!l.text) return <div key={li} className="h-1" />
                return <div key={li} className={`anim-term-line ${tClass(l.kind)}`}>{l.text}</div>
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function tClass(k: TermLine['kind']): string {
  switch (k) {
    case 'agent': return 'text-white/55'
    case 'dim': return 'text-white/25'
    case 'success': return 'text-emerald-400/70'
    case 'error': return 'text-red-400/60'
    case 'bold': return 'text-white/75 font-medium'
    case 'tool': return 'text-amber-300/50'
    default: return 'text-white/40'
  }
}

// ---------------------------------------------------------------------------
// Demo: Status bar
// ---------------------------------------------------------------------------

function StatusBar({ tick }: { tick: number }) {
  const n = ROWS.length
  const ed = ROWS.reduce((a, _, i) => a + (['ok','error'].includes(cellState(i, 'email', tick)) ? 1 : 0), 0)
  const sd = ROWS.reduce((a, _, i) => a + (['ok','error'].includes(cellState(i, 'score', tick)) ? 1 : 0), 0)
  const errs = ROWS.reduce((a, _, i) => a + (cellState(i, 'email', tick) === 'error' ? 1 : 0) + (cellState(i, 'score', tick) === 'error' ? 1 : 0), 0)

  let text = 'Ready'
  let dotColor = 'rgba(255,255,255,0.15)'
  if (tick >= 185 + 8) { text = `Complete \u00B7 ${n * 2 - errs} ok`; dotColor = '#34D399' }
  else if (tick >= SCORE_PEND) { text = `Scoring ${sd}/${n}`; dotColor = '#818CF8' }
  else if (tick >= EMAIL_PEND) { text = `Emails ${ed}/${n}`; dotColor = '#818CF8' }

  const pct = tick >= 185 + 8 ? 100 : tick >= SCORE_PEND ? Math.round(((ed + sd) / (n * 2)) * 100) : tick >= EMAIL_PEND ? Math.round((ed / (n * 2)) * 100) : 0

  return (
    <div className="flex h-[24px] items-center justify-between border-t border-white/[0.06] bg-[#111] px-3 text-[9px] text-white/20">
      <div className="flex items-center gap-1.5">
        <span className="size-[5px] rounded-full transition-colors duration-300" style={{ background: dotColor }} />
        <span>{text}</span>
        {errs > 0 && tick >= 130 && <span className="text-red-400/60">{errs} err</span>}
        {tick >= EMAIL_PEND && tick < 185 + 8 && (
          <div className="h-[2px] w-[40px] overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-[#6366F1]/60 transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 text-white/12">
        <span>Prospects</span>
        <span>&middot;</span>
        <span>{n} rows</span>
        <span>&middot;</span>
        <span>2 ext</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Demo window
// ---------------------------------------------------------------------------

const DEMO_W = 1060
const DEMO_CONTENT_H = 340

function Demo() {
  const [tick, setTick] = useState(0)
  const [live, setLive] = useState(false)
  const [scale, setScale] = useState(1)
  const el = useRef<HTMLDivElement>(null)
  const outer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function measure() {
      if (!outer.current) return
      const pad = 32
      setScale(Math.min(1, (outer.current.clientWidth - pad) / DEMO_W))
    }
    measure()
    window.addEventListener('resize', measure, { passive: true })
    return () => window.removeEventListener('resize', measure)
  }, [])

  useEffect(() => {
    const node = el.current
    if (!node) return
    const obs = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) { setLive(true); obs.disconnect() }
    }, { threshold: 0.05 })
    obs.observe(node)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!live) return
    const id = setInterval(() => setTick(t => t >= LOOP ? 0 : t + 1), T)
    return () => clearInterval(id)
  }, [live])

  const opacity = tick >= FADE_OUT ? Math.max(0, 1 - (tick - FADE_OUT) / (LOOP - FADE_OUT))
    : tick < 4 ? tick / 4 : 1

  const totalH = DEMO_CONTENT_H + 38 + 24 // content + chrome + status
  const scaledH = totalH * scale

  return (
    <div ref={outer} className="relative mx-auto w-full" style={{ maxWidth: DEMO_W + 32 }}>
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -inset-32 z-0"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(99,102,241,0.04) 0%, transparent 70%)' }} />

      <div className="flex justify-center" style={{ height: scaledH }}>
        <div
          ref={el}
          style={{
            width: DEMO_W,
            transformOrigin: 'top center',
            transform: `scale(${scale})`,
            flexShrink: 0,
          }}
        >
          <div
            className="relative z-10 overflow-hidden rounded-xl border border-white/[0.06]"
            style={{
              opacity,
              boxShadow: '0 24px 80px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset',
            }}
          >
            <Chrome />
            <div className="flex" style={{ height: DEMO_CONTENT_H }}>
              <Sidebar tick={tick} />
              <Grid tick={tick} />
              <Term tick={tick} />
            </div>
            <StatusBar tick={tick} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Scroll reveal
// ---------------------------------------------------------------------------

function Reveal({ children, className = '', delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e?.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.12 },
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: `opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Feature section: Variant A - Pipeline strip
// ---------------------------------------------------------------------------

const PIPELINE_COLS = [
  {
    name: 'Domain',
    kind: 'input' as const,
    code: null,
    sample: '"acme.com"',
  },
  {
    name: 'Company Info',
    kind: 'computed' as const,
    code: 'sdk.apollo.enrich(\n  domain\n)',
    sample: '{ name: "Acme",\n  headcount: 250 }',
  },
  {
    name: 'Email',
    kind: 'computed' as const,
    code: 'sdk.prospeo.findEmail(\n  name, domain\n)',
    sample: '"john@acme.com"',
  },
  {
    name: 'Lead Score',
    kind: 'computed' as const,
    code: 'score = headcount\n  > 100 ? 90 : 40',
    sample: '90',
  },
]

function VariantA() {
  return (
    <section className="mx-auto mt-28 max-w-[960px] px-6 sm:mt-40">
      <Reveal>
        <div className="mb-6 text-center">
          <span className="inline-block rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[10px] font-semibold tracking-[0.15em] text-white/25 uppercase">Variant A</span>
        </div>
        <h2 className="text-center text-[1.5rem] font-bold leading-[1.2] tracking-[-0.03em] text-white/80 sm:text-[2rem]">
          Every column is programmable.
        </h2>
      </Reveal>

      <Reveal delay={0.05}>
        <p className="mx-auto mt-4 max-w-[540px] text-center text-[14px] leading-[1.7] text-white/35">
          Not a formula. Not a pre-built integration. Real code that calls real APIs.
        </p>
      </Reveal>

      {/* Pipeline strip */}
      <Reveal delay={0.1}>
        <div className="mt-14 overflow-x-auto pb-4">
          <div className="mx-auto flex min-w-[700px] items-stretch justify-center gap-0">
            {PIPELINE_COLS.map((col, i) => (
              <div key={col.name} className="flex items-stretch">
                {/* Column card */}
                <div className="flex w-[190px] flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-white/70">{col.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-wide ${
                      col.kind === 'computed'
                        ? 'bg-[#6366F1]/10 text-[#6366F1]/60'
                        : 'bg-white/[0.04] text-white/25'
                    }`}>
                      {col.kind}
                    </span>
                  </div>

                  <div className="mt-3 flex-1">
                    {col.code ? (
                      <div className="rounded-lg bg-[#111] px-3 py-2.5">
                        <pre className="font-mono text-[11px] leading-[1.6] text-white/45">
                          <span className="text-[#6366F1]/50">await </span>{col.code}
                        </pre>
                      </div>
                    ) : (
                      <div className="flex h-full items-center rounded-lg bg-[#111] px-3 py-2.5">
                        <span className="text-[11px] text-white/20">Manual input</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 border-t border-white/[0.04] pt-3">
                    <pre className="font-mono text-[10px] leading-[1.5] text-emerald-400/50">{col.sample}</pre>
                  </div>
                </div>

                {/* Connector arrow */}
                {i < PIPELINE_COLS.length - 1 && (
                  <div className="flex w-[32px] items-center justify-center">
                    <div className="flex items-center">
                      <div className="h-px w-[18px] bg-white/[0.08]" />
                      <svg className="size-[8px] -ml-px text-white/[0.12]" viewBox="0 0 8 8" fill="currentColor">
                        <path d="M1 0 L8 4 L1 8 Z" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="mx-auto mt-8 max-w-[560px] space-y-3 text-center">
          <p className="text-[13px] leading-[1.7] text-white/30">
            Find emails. Enrich companies. Score leads. Scrape websites. Any logic, any API, any column.
          </p>
          <p className="text-[13px] leading-[1.7] text-white/30">
            Chain them together. Output of one feeds into the next.
          </p>
          <p className="text-[13px] leading-[1.7] text-white/25">
            AI writes the code. You just describe what the column should do.
          </p>
        </div>
      </Reveal>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Feature section: Variant B - Exploded column
// ---------------------------------------------------------------------------

const EXPLODED_RESULTS = [
  { email: 'john@acme.com', ok: true },
  { email: 'jane@stripe.com', ok: true },
  { email: null, ok: false },
  { email: 'sarah@linear.com', ok: true },
]

function VariantB() {
  return (
    <section className="mx-auto mt-28 max-w-[960px] px-6 sm:mt-40">
      <Reveal>
        <div className="mb-6 text-center">
          <span className="inline-block rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[10px] font-semibold tracking-[0.15em] text-white/25 uppercase">Variant B</span>
        </div>
        <h2 className="text-center text-[1.5rem] font-bold leading-[1.2] tracking-[-0.03em] text-white/80 sm:text-[2rem]">
          Every column is programmable.
        </h2>
      </Reveal>

      <Reveal delay={0.05}>
        <p className="mx-auto mt-4 max-w-[540px] text-center text-[14px] leading-[1.7] text-white/35">
          Not a formula. Not a pre-built integration. Real code that calls real APIs.
        </p>
      </Reveal>

      {/* Exploded column card */}
      <Reveal delay={0.1}>
        <div className="mx-auto mt-14 max-w-[440px]">
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111]" style={{
            boxShadow: '0 24px 80px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02) inset',
          }}>
            {/* Column header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="text-[15px] font-semibold text-white/75">Email</span>
              </div>
              <span className="rounded-full bg-[#6366F1]/10 px-2.5 py-1 text-[10px] font-semibold text-[#6366F1]/60">
                <span className="mr-1 font-mono italic">fx</span> computed
              </span>
            </div>

            {/* Code block */}
            <div className="border-b border-white/[0.06] p-5">
              <div className="rounded-xl bg-[#0A0A0A] p-4">
                <pre className="font-mono text-[11px] leading-[1.7]">
                  <span className="text-[#C586C0]/60">async function</span>
                  <span className="text-white/40">(inputs, sdk) {'{'}</span>
                  {'\n'}
                  <span className="text-white/40">{'  '}</span>
                  <span className="text-[#C586C0]/60">const</span>
                  <span className="text-white/40"> result = </span>
                  <span className="text-[#C586C0]/60">await</span>
                  <span className="text-white/40"> </span>
                  <span className="text-[#DCDCAA]/50">sdk.prospeo.findEmail</span>
                  <span className="text-white/40">({'{'}</span>
                  {'\n'}
                  <span className="text-white/40">{'    '}name: </span>
                  <span className="text-[#9CDCFE]/50">inputs.name</span>
                  <span className="text-white/25">,</span>
                  {'\n'}
                  <span className="text-white/40">{'    '}domain: </span>
                  <span className="text-[#9CDCFE]/50">inputs.domain</span>
                  {'\n'}
                  <span className="text-white/40">{'  })'}</span>
                  {'\n'}
                  <span className="text-white/40">{'  '}</span>
                  <span className="text-[#C586C0]/60">return</span>
                  <span className="text-white/40"> {'{ '}</span>
                  <span className="text-white/40">value: </span>
                  <span className="text-[#9CDCFE]/50">result.email</span>
                  <span className="text-white/25">, </span>
                  <span className="text-white/40">status: </span>
                  <span className="text-[#CE9178]/50">"SUCCESS"</span>
                  <span className="text-white/40">{' }'}</span>
                  {'\n'}
                  <span className="text-white/40">{'}'}</span>
                </pre>
              </div>
            </div>

            {/* Results mini-table */}
            <div className="p-5">
              <p className="mb-3 text-[10px] font-medium tracking-[0.08em] text-white/20 uppercase">Output</p>
              <div className="space-y-0">
                {EXPLODED_RESULTS.map((r, i) => (
                  <div key={i} className={`flex items-center justify-between py-2 ${i < EXPLODED_RESULTS.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
                    <span className={`font-mono text-[12px] ${r.ok ? 'text-white/50' : 'text-white/15'}`}>
                      {r.ok ? r.email : '\u2014'}
                    </span>
                    {r.ok ? (
                      <svg className="size-[12px] text-emerald-400/60" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="3.5 8.5 6.5 11.5 12.5 5" />
                      </svg>
                    ) : (
                      <svg className="size-[12px] text-red-400/60" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="4.5" y1="4.5" x2="11.5" y2="11.5" /><line x1="11.5" y1="4.5" x2="4.5" y2="11.5" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="mx-auto mt-10 max-w-[560px] space-y-3 text-center">
          <p className="text-[13px] leading-[1.7] text-white/30">
            Find emails. Enrich companies. Score leads. Scrape websites. Any logic, any API, any column.
          </p>
          <p className="text-[13px] leading-[1.7] text-white/30">
            Chain them together. Output of one feeds into the next.
          </p>
          <p className="text-[13px] leading-[1.7] text-white/25">
            AI writes the code. You just describe what the column should do.
          </p>
        </div>
      </Reveal>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Feature section: Variant C - Code tabs
// ---------------------------------------------------------------------------

const TAB_COLS = [
  {
    name: 'Domain',
    kind: 'input' as const,
    code: null,
    inputLabel: null,
    outputLabel: '"acme.com"',
  },
  {
    name: 'Company Info',
    kind: 'computed' as const,
    code: `async function(inputs, sdk) {
  const result = await sdk.apollo.enrich({
    domain: inputs.domain
  })
  return { value: result, status: "SUCCESS" }
}`,
    inputLabel: '"acme.com"',
    outputLabel: '{ name: "Acme", ... }',
  },
  {
    name: 'Email',
    kind: 'computed' as const,
    code: `async function(inputs, sdk) {
  const result = await sdk.prospeo.findEmail({
    name: inputs.name,
    domain: inputs.domain
  })
  return { value: result.email, status: "SUCCESS" }
}`,
    inputLabel: '(John, acme.com)',
    outputLabel: '"john@acme.com"',
  },
  {
    name: 'Score',
    kind: 'computed' as const,
    code: `async function(inputs, sdk) {
  const score = inputs.headcount > 100 ? 90 : 40
  return { value: score, status: "SUCCESS" }
}`,
    inputLabel: 'headcount: 250',
    outputLabel: '90',
  },
]

function VariantC() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => {
      setActive(prev => (prev + 1) % TAB_COLS.length)
    }, 3000)
    return () => clearInterval(id)
  }, [paused])

  const col = TAB_COLS[active]!

  return (
    <section className="mx-auto mt-28 max-w-[960px] px-6 sm:mt-40">
      <Reveal>
        <div className="mb-6 text-center">
          <span className="inline-block rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[10px] font-semibold tracking-[0.15em] text-white/25 uppercase">Variant C</span>
        </div>
        <h2 className="text-center text-[1.5rem] font-bold leading-[1.2] tracking-[-0.03em] text-white/80 sm:text-[2rem]">
          Every column is programmable.
        </h2>
      </Reveal>

      <Reveal delay={0.05}>
        <p className="mx-auto mt-4 max-w-[540px] text-center text-[14px] leading-[1.7] text-white/35">
          Not a formula. Not a pre-built integration. Real code that calls real APIs.
        </p>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mx-auto mt-14 max-w-[520px]">
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111]" style={{
            boxShadow: '0 24px 80px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02) inset',
          }}>
            {/* Tab buttons */}
            <div className="flex border-b border-white/[0.06]">
              {TAB_COLS.map((t, i) => (
                <button
                  key={t.name}
                  onClick={() => { setActive(i); setPaused(true) }}
                  className={`relative flex-1 px-3 py-3 text-[12px] font-medium transition-colors ${
                    i === active ? 'text-white/70' : 'text-white/25 hover:text-white/40'
                  }`}
                >
                  {t.name}
                  {i === active && (
                    <div className="absolute inset-x-0 bottom-0 h-[2px] bg-[#6366F1]/50" />
                  )}
                  {/* Auto-cycle progress bar */}
                  {i === active && !paused && (
                    <div className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden">
                      <div
                        className="h-full bg-[#6366F1]/30"
                        style={{
                          animation: 'variantc-progress 3s linear',
                        }}
                      />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Code area */}
            <div className="min-h-[180px] p-5">
              {col.code ? (
                <div className="rounded-xl bg-[#0A0A0A] p-4" style={{ transition: 'opacity 0.3s ease' }}>
                  <pre className="font-mono text-[11px] leading-[1.7] text-white/40">
                    {col.code.split('\n').map((line, li) => (
                      <div key={`${active}-${li}`}>
                        <span className="mr-3 inline-block w-[14px] text-right text-[10px] text-white/10 select-none">{li + 1}</span>
                        <span>{highlightLine(line)}</span>
                      </div>
                    ))}
                  </pre>
                </div>
              ) : (
                <div className="flex h-[140px] items-center justify-center rounded-xl bg-[#0A0A0A]">
                  <span className="text-[13px] text-white/20">Manual input -- no code needed</span>
                </div>
              )}
            </div>

            {/* Input -> Output example */}
            <div className="border-t border-white/[0.06] px-5 py-4">
              <div className="flex items-center justify-center gap-4">
                {col.inputLabel ? (
                  <>
                    <span className="rounded-lg bg-white/[0.03] px-3 py-1.5 font-mono text-[11px] text-white/35">{col.inputLabel}</span>
                    <svg className="size-[12px] text-white/15" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M2 6h8M7 3l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </>
                ) : null}
                <span className="rounded-lg bg-emerald-400/[0.06] px-3 py-1.5 font-mono text-[11px] text-emerald-400/50">{col.outputLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="mx-auto mt-10 max-w-[560px] space-y-3 text-center">
          <p className="text-[13px] leading-[1.7] text-white/30">
            Find emails. Enrich companies. Score leads. Scrape websites. Any logic, any API, any column.
          </p>
          <p className="text-[13px] leading-[1.7] text-white/30">
            Chain them together. Output of one feeds into the next.
          </p>
          <p className="text-[13px] leading-[1.7] text-white/25">
            AI writes the code. You just describe what the column should do.
          </p>
        </div>
      </Reveal>
    </section>
  )
}

/** Minimal syntax-ish highlighting for variant C code lines */
function highlightLine(line: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let rest = line

  const keywords = ['async', 'function', 'const', 'await', 'return']
  const stringRe = /"[^"]*"/g

  // Simple approach: highlight keywords and strings
  let idx = 0
  const tokens: { start: number; end: number; type: 'kw' | 'str' }[] = []

  for (const kw of keywords) {
    let pos = rest.indexOf(kw)
    while (pos !== -1) {
      // Make sure it's a word boundary
      const before = pos > 0 ? rest[pos - 1]! : ' '
      const after = pos + kw.length < rest.length ? rest[pos + kw.length]! : ' '
      if (/\W/.test(before) && /\W/.test(after)) {
        tokens.push({ start: pos, end: pos + kw.length, type: 'kw' })
      }
      pos = rest.indexOf(kw, pos + 1)
    }
  }

  let m
  while ((m = stringRe.exec(rest)) !== null) {
    tokens.push({ start: m.index, end: m.index + m[0].length, type: 'str' })
  }

  tokens.sort((a, b) => a.start - b.start)

  // Remove overlaps
  const clean: typeof tokens = []
  for (const t of tokens) {
    if (clean.length === 0 || t.start >= clean[clean.length - 1]!.end) {
      clean.push(t)
    }
  }

  for (const t of clean) {
    if (t.start > idx) {
      parts.push(<span key={`t-${idx}`}>{rest.slice(idx, t.start)}</span>)
    }
    const cls = t.type === 'kw' ? 'text-[#C586C0]/60' : 'text-[#CE9178]/50'
    parts.push(<span key={`t-${t.start}`} className={cls}>{rest.slice(t.start, t.end)}</span>)
    idx = t.end
  }
  if (idx < rest.length) {
    parts.push(<span key={`t-${idx}`}>{rest.slice(idx)}</span>)
  }

  return <>{parts}</>
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function App() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed inset-x-0 top-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[960px] items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <img src="/icon.svg" alt="" className="h-[17px] w-auto" />
            <span className="text-[13px] font-semibold tracking-[-0.01em] text-white/60">GTM Pilot</span>
          </div>
          <a href="#download" className="text-[13px] text-white/25 transition-colors hover:text-white/50">Download</a>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="relative mx-auto max-w-[960px] px-6 pt-24 pb-2 text-center sm:pt-28">
          <div
            className="pointer-events-none absolute inset-x-0 -top-40 h-[500px]"
            style={{ background: 'radial-gradient(ellipse 60% 45% at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 70%)' }}
          />

          <h1 className="anim-hero-1 text-[2.2rem] leading-[1.02] font-bold tracking-[-0.04em] sm:text-[3.5rem] md:text-[4.2rem]">
            <span className="bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
              Cursor for GTM Engineers
            </span>
          </h1>

          <p className="anim-hero-2 mx-auto mt-4 max-w-[380px] text-[14px] leading-[1.7] text-white/35">
            Every column is a function. Every function calls an API.
            Your data never leaves your machine.
          </p>

          <div id="download" className="anim-hero-2 mt-7 flex flex-wrap items-center justify-center gap-3">
            <a href="#" className="flex items-center gap-2.5 rounded-full bg-white px-6 py-2.5 text-[13px] font-semibold text-[#0A0A0A] transition-all hover:bg-white/90 active:scale-[0.97]">
              <AppleLogo className="size-[14px]" />
              Download for Mac
            </a>
            <a href="#" className="flex items-center gap-2.5 rounded-full border border-white/10 px-6 py-2.5 text-[13px] font-medium text-white/50 transition-all hover:border-white/20 hover:text-white/70 active:scale-[0.97]">
              <WindowsLogo className="size-[13px]" />
              Download for Windows
            </a>
          </div>
        </section>

        {/* Demo */}
        <section className="anim-hero-3 relative mx-auto mt-10 max-w-[1140px] px-4 sm:mt-14">
          {/* Atmospheric background */}
          <div className="pointer-events-none absolute -inset-x-[200px] -top-[120px] -bottom-[80px] -z-10 overflow-hidden">
            {/* Main warm glow - center */}
            <div className="absolute inset-0" style={{
              background: 'radial-gradient(ellipse 70% 60% at 50% 45%, rgba(120, 80, 40, 0.12) 0%, transparent 70%)',
            }} />
            {/* Purple accent - left */}
            <div className="absolute inset-0" style={{
              background: 'radial-gradient(ellipse 40% 50% at 25% 55%, rgba(99, 60, 180, 0.08) 0%, transparent 70%)',
            }} />
            {/* Deep blue accent - right */}
            <div className="absolute inset-0" style={{
              background: 'radial-gradient(ellipse 45% 55% at 75% 50%, rgba(40, 60, 120, 0.08) 0%, transparent 70%)',
            }} />
            {/* Warm highlight - top center */}
            <div className="absolute inset-0" style={{
              background: 'radial-gradient(ellipse 50% 30% at 50% 25%, rgba(180, 120, 60, 0.06) 0%, transparent 70%)',
            }} />
            {/* Subtle green accent - bottom */}
            <div className="absolute inset-0" style={{
              background: 'radial-gradient(ellipse 35% 30% at 55% 75%, rgba(40, 100, 80, 0.05) 0%, transparent 70%)',
            }} />
          </div>
          <Demo />
        </section>

        {/* Feature section variants */}
        <VariantA />

        <div className="mx-auto mt-28 max-w-[120px] border-t border-white/[0.06] sm:mt-40" />

        <VariantB />

        <div className="mx-auto mt-28 max-w-[120px] border-t border-white/[0.06] sm:mt-40" />

        <VariantC />

        {/* Extensions */}
        <section className="mx-auto mt-28 max-w-[1000px] px-6 sm:mt-40">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-16">
            {/* Left text */}
            <Reveal className="shrink-0 lg:w-[300px] lg:sticky lg:top-32">
              <h2 className="text-[1.5rem] font-bold leading-[1.3] tracking-[-0.03em] text-white/80 sm:text-[1.75rem]">
                Enrich with extensions
              </h2>
              <p className="mt-3 text-[14px] leading-[1.7] text-white/35">
                Connect your enrichment APIs once. The agent calls them
                through typed SDK methods -- auth, rate limits, and response
                mapping handled automatically.
              </p>
            </Reveal>

            {/* Right grid */}
            <div className="relative flex-1">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {([
                  { id: 'apollo',    name: 'Apollo',    desc: 'People and company enrichment', color: '#6C3FE0' },
                  { id: 'prospeo',   name: 'Prospeo',   desc: 'Email finder and verification',  color: '#3B82F6' },
                  { id: 'hunter',    name: 'Hunter',    desc: 'Domain search and email verify',  color: '#F97316' },
                  { id: 'clearbit',  name: 'Clearbit',  desc: 'Company and person data',         color: '#6366F1' },
                  { id: 'firecrawl', name: 'Firecrawl', desc: 'Web scraping and extraction',     color: '#F59E0B' },
                  { id: 'zerobounce',name: 'ZeroBounce', desc: 'Email validation at scale',      color: '#10B981' },
                ] as const).map((ext, i) => (
                  <Reveal key={ext.id} delay={i * 0.04}>
                    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 transition-colors hover:border-white/[0.1] hover:bg-white/[0.04]">
                      {/* Placeholder logo -- replace with <img src={`/ext/${ext.id}.svg`} /> */}
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ background: ext.color + '18' }}>
                        <span className="text-[11px] font-bold" style={{ color: ext.color }}>{ext.name[0]}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-white/70">{ext.name}</p>
                        <p className="truncate text-[11.5px] text-white/25">{ext.desc}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
              {/* Fade-out bottom row like VS Code */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16" style={{ background: 'linear-gradient(to top, #0A0A0A, transparent)' }} />
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="mx-auto mt-28 max-w-[120px] border-t border-white/[0.06] sm:mt-40" />

        {/* Final CTA */}
        <section className="mx-auto mt-28 max-w-[600px] px-6 text-center sm:mt-40">
          <Reveal>
            <p className="text-[13px] font-medium text-white/20">Free during early access</p>
            <h2 className="mt-4 text-[1.5rem] font-bold tracking-[-0.03em] text-white/80 sm:text-[2rem]">
              Try GTM Pilot
            </h2>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href="#" className="flex items-center gap-2.5 rounded-full bg-white px-6 py-2.5 text-[13px] font-semibold text-[#0A0A0A] transition-all hover:bg-white/90 active:scale-[0.97]">
                <AppleLogo className="size-[14px]" />
                Download for macOS
              </a>
              <a href="#" className="flex items-center gap-2.5 rounded-full border border-white/10 px-6 py-2.5 text-[13px] font-medium text-white/50 transition-all hover:border-white/20 hover:text-white/70 active:scale-[0.97]">
                <WindowsLogo className="size-[13px]" />
                Download for Windows
              </a>
            </div>
          </Reveal>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-28 border-t border-white/[0.04] py-8 sm:mt-40">
        <div className="mx-auto flex max-w-[960px] items-center justify-between px-6 text-[11px] text-white/15">
          <div className="flex items-center gap-2">
            <img src="/icon.svg" alt="GTM Pilot" className="h-3 w-auto opacity-25" />
            <span>&copy; 2026</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="mailto:hello@gtmpilot.com" className="transition-colors hover:text-white/30">Contact</a>
            <a href="#" className="transition-colors hover:text-white/30">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
// deploy 1774208830
