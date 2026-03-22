import { useState, useEffect, useRef } from 'react'

// ---------------------------------------------------------------------------
// Demo data - realistic GTM enrichment scenario
// ---------------------------------------------------------------------------

const ROWS = [
  { company: 'Stripe',  domain: 'stripe.com',  title: 'Head of Sales',       firstName: 'Alex',   lastName: 'Morgan',  email: 'alex.m@stripe.com',  score: 95 },
  { company: 'Linear',  domain: 'linear.app',  title: 'VP Revenue',          firstName: 'Karri',  lastName: 'Saarinen', email: 'karri.s@linear.app',  score: 92 },
  { company: 'Notion',  domain: 'notion.so',   title: 'CRO',                 firstName: 'Ivan',   lastName: 'Zhao',    email: 'ivan.z@notion.so',   score: 78 },
  { company: 'Vercel',  domain: 'vercel.com',  title: 'Dir. Partnerships',   firstName: 'Guill.', lastName: 'Rauch',   email: 'g.rauch@vercel.com', score: 90 },
  { company: 'Figma',   domain: 'figma.com',   title: 'Head of Growth',      firstName: 'Dylan',  lastName: 'Field',   email: 'dylan.f@figma.com',  score: 88 },
  { company: 'Resend',  domain: 'resend.com',  title: 'CEO',                 firstName: 'Zeno',   lastName: 'Rocha',   email: 'zeno.r@resend.com',  score: 82 },
  { company: 'Clerk',   domain: 'clerk.com',   title: 'VP Sales',            firstName: 'Colin',  lastName: 'Ref',     email: null,                 score: null }, // will be error
  { company: 'Neon',    domain: 'neon.tech',    title: 'Head of BD',          firstName: 'Nikita', lastName: 'Shamg.',  email: 'nikita.s@neon.tech', score: 91 },
]

const USER_MSG = 'Find emails and score leads for these 8 prospects using Prospeo'

interface TermLine { text: string; kind: 'user-prompt' | 'agent' | 'dim' | 'success' | 'error' | 'bold' | 'tool-call' | 'tool-result' }

const TERM_SCRIPT: { at: number; lines: TermLine[] }[] = [
  { at: 42, lines: [
    { text: "I'll enrich your Prospects table using Prospeo.", kind: 'agent' },
    { text: '', kind: 'dim' },
  ]},
  { at: 48, lines: [
    { text: 'gtm_add_field("Email", computed, prospeo.findEmail)', kind: 'tool-call' },
    { text: 'gtm_add_field("Lead Score", computed, scoringFn)', kind: 'tool-call' },
  ]},
  { at: 56, lines: [
    { text: 'Fields created. Running on 8 records...', kind: 'dim' },
    { text: '', kind: 'dim' },
  ]},
  { at: 74, lines: [
    { text: 'gtm_run(t_prospects, f_email, limit=8)', kind: 'tool-call' },
  ]},
  { at: 130, lines: [
    { text: '\u2713 Email: 7/8 found, 1 error', kind: 'success' },
    { text: '  \u2717 Clerk: no email found for contact', kind: 'error' },
  ]},
  { at: 138, lines: [
    { text: '', kind: 'dim' },
    { text: 'gtm_run(t_prospects, f_score)', kind: 'tool-call' },
  ]},
  { at: 180, lines: [
    { text: '\u2713 Score: 7/8 computed', kind: 'success' },
    { text: '', kind: 'dim' },
    { text: 'Done. 7 prospects enriched, 1 with errors.', kind: 'bold' },
  ]},
]

// ---------------------------------------------------------------------------
// Animation timeline (ticks @ 55ms for smoother feel)
// ---------------------------------------------------------------------------

const T = 55
const LOOP = 280

const TYPE_START = 5
const TYPE_END = 35
const ROW_START = 46
const ROW_GAP = 2

// Email column: pending -> running -> ok/error (staggered per row)
const EMAIL_PEND = 68
const EMAIL_GO = 76
const EMAIL_STEP = 6     // stagger between rows
const EMAIL_DONE_DUR = 8 // ticks from run start to ok

// Score column
const SCORE_PEND = 134
const SCORE_GO = 142
const SCORE_STEP = 5
const SCORE_DONE_DUR = 6

const FADE_OUT = 250

type CellStatus = 'none' | 'pending' | 'running' | 'ok' | 'error'

function cellState(row: number, col: 'email' | 'score', tick: number): CellStatus {
  // Clerk (row 6) gets an error
  const isErrorRow = row === 6

  if (col === 'email') {
    const go = EMAIL_GO + row * EMAIL_STEP
    const done = go + EMAIL_DONE_DUR
    if (tick >= done) return isErrorRow ? 'error' : 'ok'
    if (tick >= go) return 'running'
    if (tick >= EMAIL_PEND) return 'pending'
    return 'none'
  }
  const go = SCORE_GO + row * SCORE_STEP
  const done = go + SCORE_DONE_DUR
  if (tick >= done) return isErrorRow ? 'error' : 'ok'
  if (tick >= go) return 'running'
  if (tick >= SCORE_PEND) return 'pending'
  return 'none'
}

function typedChars(tick: number): number {
  if (tick < TYPE_START) return 0
  if (tick >= TYPE_END) return USER_MSG.length
  const progress = (tick - TYPE_START) / (TYPE_END - TYPE_START)
  // Ease-out for natural typing feel
  const eased = 1 - Math.pow(1 - progress, 2)
  return Math.floor(eased * USER_MSG.length)
}

// ---------------------------------------------------------------------------
// Platform icons (inline SVG)
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
// Demo: Window chrome (macOS title bar)
// ---------------------------------------------------------------------------

function Chrome() {
  return (
    <div className="flex h-11 items-center border-b border-[#E7E5E4] bg-[#F5F5F4] px-4 select-none">
      <div className="flex gap-[7px]">
        <i className="block size-[11px] rounded-full bg-[#FF5F57]" />
        <i className="block size-[11px] rounded-full bg-[#FEBC2E]" />
        <i className="block size-[11px] rounded-full bg-[#28C840]" />
      </div>
      <span className="flex-1 text-center text-[11px] font-medium tracking-wide text-[#78716C]">
        GTM Pilot - prospects.db
      </span>
      <div className="w-[54px]" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Demo: Sidebar - matches real app exactly
// ---------------------------------------------------------------------------

function Sidebar({ tick }: { tick: number }) {
  const rowsDone = tick >= ROW_START + ROWS.length * ROW_GAP
  const n = rowsDone
    ? ROWS.length
    : tick >= ROW_START
      ? Math.min(ROWS.length, Math.floor((tick - ROW_START) / ROW_GAP) + 1)
      : ROWS.length

  return (
    <div className="flex w-[168px] shrink-0 flex-col border-r border-[#E7E5E4] bg-[#F5F5F4]">
      {/* Logo header */}
      <div className="flex h-11 items-center border-b border-[#E7E5E4] bg-white px-3">
        <img src="/icon.svg" alt="" className="mr-2 h-[14px] w-auto opacity-80" />
        <span className="text-[12px] font-semibold tracking-tight text-[#1C1917]">GTM Pilot</span>
      </div>

      {/* Tables */}
      <div className="px-2 pt-3">
        <p className="mb-1.5 px-2 text-[10px] font-semibold tracking-wide text-[#78716C]/70 uppercase">Tables</p>
        <div className="flex items-center gap-2 rounded-md bg-[#6366F1]/[0.08] px-2.5 py-[7px]">
          <svg className="size-[13px] text-[#6366F1]/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
          <span className="text-[11px] font-medium text-[#1C1917]">Prospects</span>
          <span className="ml-auto font-mono text-[10px] tabular-nums text-[#6366F1]/50">{n}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 rounded-md px-2.5 py-[7px] opacity-40">
          <svg className="size-[13px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
          <span className="text-[11px] text-[#44403C]">Companies</span>
          <span className="ml-auto font-mono text-[10px] text-[#A8A29E]">24</span>
        </div>
      </div>

      {/* Extensions */}
      <div className="mt-auto border-t border-[#E7E5E4] px-2 py-3">
        <p className="mb-1.5 px-2 text-[10px] font-semibold tracking-wide text-[#78716C]/70 uppercase">Extensions</p>
        {[
          { name: 'Prospeo', connected: true },
          { name: 'Apollo', connected: true },
          { name: 'Firecrawl', connected: false },
        ].map(ext => (
          <div key={ext.name} className="flex items-center gap-2 px-2 py-[5px]">
            <span className="relative flex size-[14px] items-center justify-center rounded bg-[#E7E5E4]/60">
              <span className="text-[8px] font-bold text-[#78716C]">{ext.name[0]}</span>
              {ext.connected && (
                <span className="absolute -right-[2px] -bottom-[2px] size-[7px] rounded-full border-[1.5px] border-[#F5F5F4] bg-[#10B981]" />
              )}
            </span>
            <span className={`text-[11px] ${ext.connected ? 'text-[#44403C]' : 'text-[#A8A29E]'}`}>{ext.name}</span>
          </div>
        ))}
      </div>

      {/* File */}
      <div className="border-t border-[#E7E5E4] px-3 py-2">
        <span className="font-mono text-[9px] text-[#A8A29E]">prospects.db</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Demo: Grid - the core product experience
// ---------------------------------------------------------------------------

const COLS: { key: string; label: string; w: number; mono?: boolean; computed?: boolean; align?: 'right' }[] = [
  { key: 'company',  label: 'Company',    w: 84 },
  { key: 'domain',   label: 'Domain',     w: 90,  mono: true },
  { key: 'title',    label: 'Title',      w: 120 },
  { key: 'email',    label: 'Email',      w: 152, mono: true, computed: true },
  { key: 'score',    label: 'Score',      w: 70,  computed: true, align: 'right' },
]

function Grid({ tick }: { tick: number }) {
  // Compute how many emails/scores are done for the toolbar counter
  const emailsDone = ROWS.reduce((a, _, i) => {
    const s = cellState(i, 'email', tick)
    return a + (s === 'ok' || s === 'error' ? 1 : 0)
  }, 0)
  const scoresDone = ROWS.reduce((a, _, i) => {
    const s = cellState(i, 'score', tick)
    return a + (s === 'ok' || s === 'error' ? 1 : 0)
  }, 0)
  const isRunning = tick >= EMAIL_PEND && !(emailsDone === 8 && scoresDone === 8)
  const allDone = emailsDone === 8 && scoresDone === 8

  // Show Email col only after it's being added
  const showEmailCol = tick >= 50
  const showScoreCol = tick >= 54

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#FAFAF9]">
      {/* Toolbar */}
      <div className="flex h-[38px] shrink-0 items-center justify-between border-b border-[#E7E5E4] bg-[#F5F5F4] px-3">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-[#1C1917]">Prospects</span>
          <span className="h-3.5 w-px bg-[#E7E5E4]" />
          <span className="text-[10px] text-[#A8A29E]">All rows</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] tabular-nums text-[#A8A29E]">{ROWS.length} rows</span>
          {/* Run button */}
          <button className={`flex h-[26px] items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium transition-all ${
            isRunning
              ? 'bg-[#6366F1] text-white'
              : allDone
                ? 'bg-[#10B981]/10 text-[#10B981]'
                : 'bg-[#6366F1] text-white'
          }`}>
            {isRunning ? (
              <>
                <svg className="size-3 anim-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="8" cy="8" r="6" strokeOpacity="0.3" />
                  <path d="M14 8a6 6 0 0 0-6-6" strokeLinecap="round" />
                </svg>
                Running...
              </>
            ) : allDone ? (
              <>
                <svg className="size-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3.5 8.5 6.5 11.5 12.5 5" />
                </svg>
                Complete
              </>
            ) : (
              <>
                <svg className="size-3" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M5 3.5l8 4.5-8 4.5V3.5z" />
                </svg>
                Run
              </>
            )}
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex shrink-0 border-b border-[#E7E5E4] bg-[#F5F5F4]">
        <div className="flex w-[34px] shrink-0 items-center justify-center border-r border-[#E7E5E4] py-[8px]">
          <span className="size-[11px] rounded-[3px] border border-[#D6D3D1]" />
        </div>
        {COLS.map((c, i) => {
          const isNew = (c.key === 'email' && showEmailCol && tick < 56) ||
                        (c.key === 'score' && showScoreCol && tick < 60)
          if (c.key === 'email' && !showEmailCol) return null
          if (c.key === 'score' && !showScoreCol) return null
          return (
            <div
              key={c.key}
              className={`flex items-center px-2.5 py-[8px] ${isNew ? 'anim-col-add' : ''} ${i < COLS.length - 1 ? 'border-r border-[#E7E5E4]/60' : ''}`}
              style={{ width: c.w }}
            >
              <span className="text-[10.5px] font-medium text-[#78716C]">{c.label}</span>
              {c.computed && (
                <span className="ml-auto text-[8px] font-semibold text-[#6366F1]/40">fx</span>
              )}
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
          const isEven = i % 2 === 0
          return (
            <div
              key={i}
              className="anim-row flex border-b border-[#F3F2F0]"
              style={{ background: isEven ? '#FFFFFF' : '#FAFAF9' }}
            >
              {/* Row number */}
              <div className="flex w-[34px] shrink-0 items-center justify-center border-r border-[#E7E5E4] bg-[#F5F5F4] text-[10px] tabular-nums text-[#A8A29E]">
                {i + 1}
              </div>
              {/* Input cells */}
              <InputCell w={84} value={row.company} border />
              <InputCell w={90} value={row.domain} mono border />
              <InputCell w={120} value={row.title} border />
              {/* Computed cells */}
              {showEmailCol && (
                <ComputedCell
                  w={152}
                  value={row.email}
                  state={es}
                  mono
                  border
                />
              )}
              {showScoreCol && (
                <ScoreCell
                  w={70}
                  value={row.score}
                  state={ss}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function InputCell({ w, value, mono, border }: { w: number; value: string; mono?: boolean; border?: boolean }) {
  return (
    <div
      className={`flex items-center px-2.5 py-[7px] ${border ? 'border-r border-[#F3F2F0]' : ''}`}
      style={{ width: w }}
    >
      <span className={`truncate text-[11px] text-[#1C1917] ${mono ? 'font-mono text-[10px] text-[#44403C]' : ''}`}>
        {value}
      </span>
    </div>
  )
}

function ComputedCell({ w, value, state, mono, border }: {
  w: number; value: string | null; state: CellStatus; mono?: boolean; border?: boolean
}) {
  const bgClass = state === 'ok' ? 'anim-cell-ok'
    : state === 'error' ? 'anim-cell-err'
    : ''

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-[7px] ${bgClass} ${border ? 'border-r border-[#F3F2F0]' : ''}`}
      style={{ width: w, background: state === 'error' ? 'rgba(239,68,68,0.03)' : undefined }}
    >
      {state === 'none' && (
        <span className="text-[10px] text-[#D6D3D1]">&mdash;</span>
      )}
      {state === 'pending' && (
        <span className="inline-block size-[5px] rounded-full bg-[#9CA3AF]/40 anim-pulse" />
      )}
      {state === 'running' && (
        <svg className="size-[12px] text-[#6366F1] anim-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="8" cy="8" r="6" strokeOpacity="0.2" />
          <path d="M14 8a6 6 0 0 0-6-6" strokeLinecap="round" />
        </svg>
      )}
      {state === 'ok' && value && (
        <>
          <svg className="size-[11px] shrink-0 text-[#10B981] anim-check" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="3.5 8.5 6.5 11.5 12.5 5" />
          </svg>
          <span className={`anim-value truncate text-[11px] text-[#1C1917] ${mono ? 'font-mono text-[10px]' : ''}`}>
            {value}
          </span>
        </>
      )}
      {state === 'error' && (
        <div className="anim-error flex items-center gap-1.5">
          <svg className="size-[11px] shrink-0 text-[#EF4444]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="4" y1="4" x2="12" y2="12" />
            <line x1="12" y1="4" x2="4" y2="12" />
          </svg>
          <span className="text-[10px] text-[#EF4444]/70">Error</span>
        </div>
      )}
    </div>
  )
}

function ScoreCell({ w, value, state }: { w: number; value: number | null; state: CellStatus }) {
  return (
    <div
      className={`flex items-center justify-end gap-1.5 px-2.5 py-[7px] ${state === 'ok' ? 'anim-cell-ok' : ''} ${state === 'error' ? 'anim-cell-err' : ''}`}
      style={{ width: w, background: state === 'error' ? 'rgba(239,68,68,0.03)' : undefined }}
    >
      {state === 'none' && (
        <span className="text-[10px] text-[#D6D3D1]">&mdash;</span>
      )}
      {state === 'pending' && (
        <span className="inline-block size-[5px] rounded-full bg-[#9CA3AF]/40 anim-pulse" />
      )}
      {state === 'running' && (
        <svg className="size-[12px] text-[#6366F1] anim-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="8" cy="8" r="6" strokeOpacity="0.2" />
          <path d="M14 8a6 6 0 0 0-6-6" strokeLinecap="round" />
        </svg>
      )}
      {state === 'ok' && value !== null && (
        <>
          <svg className="size-[11px] shrink-0 text-[#10B981] anim-check" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="3.5 8.5 6.5 11.5 12.5 5" />
          </svg>
          {/* Score bar + number */}
          <div className="anim-value flex items-center gap-1.5">
            <div className="h-[4px] w-[28px] overflow-hidden rounded-full bg-[#E7E5E4]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${value}%`,
                  background: value >= 90 ? '#10B981' : value >= 80 ? '#6366F1' : '#F59E0B',
                }}
              />
            </div>
            <span className="font-mono text-[10px] tabular-nums text-[#1C1917]">{value}</span>
          </div>
        </>
      )}
      {state === 'error' && (
        <div className="anim-error flex items-center gap-1">
          <svg className="size-[11px] shrink-0 text-[#EF4444]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="4" y1="4" x2="12" y2="12" />
            <line x1="12" y1="4" x2="4" y2="12" />
          </svg>
          <span className="text-[10px] text-[#EF4444]/70">&mdash;</span>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Demo: Terminal - Claude Code style
// ---------------------------------------------------------------------------

function Term({ tick }: { tick: number }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [tick])

  const chars = typedChars(tick)
  const showPrompt = tick >= TYPE_START
  const doneTyping = tick >= TYPE_END

  return (
    <div className="flex w-[256px] shrink-0 flex-col border-l border-[#E7E5E4] bg-[#F5F5F4]">
      {/* Header */}
      <div className="flex h-[32px] items-center border-b border-[#E7E5E4] bg-white px-3">
        <svg className="mr-1.5 size-[12px] text-[#78716C]/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <polyline points="7 8 10 11 7 14" />
          <line x1="13" y1="14" x2="17" y2="14" />
        </svg>
        <span className="text-[10px] font-medium text-[#78716C]">Terminal</span>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[#1C1917] px-3 py-3 font-mono text-[9.5px] leading-[16px]">
        {/* Initial prompt */}
        {!showPrompt && (
          <div className="flex items-center">
            <span className="mr-1 text-[#6366F1]/70">&gt;</span>
            <span className="anim-blink text-white/30">_</span>
          </div>
        )}

        {/* User typing */}
        {showPrompt && (
          <div className="mb-3">
            <span className="text-[#6366F1]/80">&gt; </span>
            <span className="text-white/80">{USER_MSG.slice(0, chars)}</span>
            {!doneTyping && <span className="anim-blink text-[#6366F1]/60">_</span>}
          </div>
        )}

        {/* Agent responses */}
        {TERM_SCRIPT.map((block, bi) => {
          if (tick < block.at) return null
          const showCount = Math.min(
            block.lines.length,
            Math.floor((tick - block.at) / 2) + 1
          )
          return (
            <div key={bi} className="mb-2">
              {block.lines.slice(0, showCount).map((line, li) => {
                if (!line.text) return <div key={li} className="h-1.5" />
                return (
                  <div key={li} className={`anim-term-line ${termLineClass(line.kind)}`}>
                    {line.kind === 'tool-call' && (
                      <span className="mr-1 text-[#F59E0B]/50">&gt;</span>
                    )}
                    {line.text}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function termLineClass(kind: TermLine['kind']): string {
  switch (kind) {
    case 'agent': return 'text-white/60'
    case 'dim': return 'text-white/30'
    case 'success': return 'text-[#10B981]/80'
    case 'error': return 'text-[#EF4444]/70'
    case 'bold': return 'text-white/80 font-medium'
    case 'tool-call': return 'text-[#F59E0B]/60'
    case 'tool-result': return 'text-white/40'
    default: return 'text-white/50'
  }
}

// ---------------------------------------------------------------------------
// Demo: Status bar - matches real app
// ---------------------------------------------------------------------------

function StatusBar({ tick }: { tick: number }) {
  const n = ROWS.length
  const ed = ROWS.reduce((a, _, i) => a + (cellState(i, 'email', tick) === 'ok' || cellState(i, 'email', tick) === 'error' ? 1 : 0), 0)
  const sd = ROWS.reduce((a, _, i) => a + (cellState(i, 'score', tick) === 'ok' || cellState(i, 'score', tick) === 'error' ? 1 : 0), 0)
  const errors = ROWS.reduce((a, _, i) => {
    const eErr = cellState(i, 'email', tick) === 'error' ? 1 : 0
    const sErr = cellState(i, 'score', tick) === 'error' ? 1 : 0
    return a + eErr + sErr
  }, 0)

  let statusDot = '#9CA3AF' // gray
  let statusText = 'Ready'

  if (tick >= 180 + 8) {
    statusDot = '#10B981'
    statusText = `Complete: ${n * 2 - errors} ok`
  } else if (tick >= SCORE_PEND) {
    statusDot = '#6366F1'
    statusText = `Scoring ${sd}/${n}`
  } else if (tick >= EMAIL_PEND) {
    statusDot = '#6366F1'
    statusText = `Finding emails ${ed}/${n}`
  }

  const progressPct = tick >= 180 + 8 ? 100
    : tick >= SCORE_PEND ? Math.round(((ed + sd) / (n * 2)) * 100)
    : tick >= EMAIL_PEND ? Math.round((ed / (n * 2)) * 100)
    : 0

  return (
    <div className="flex h-[28px] items-center justify-between border-t border-[#E7E5E4] bg-white px-3 text-[10px] text-[#78716C]">
      <div className="flex items-center gap-2">
        <span className="size-[6px] rounded-full transition-colors duration-300" style={{ background: statusDot }} />
        <span>{statusText}</span>
        {errors > 0 && tick >= 130 && (
          <span className="text-[#EF4444]">{errors} error{errors > 1 ? 's' : ''}</span>
        )}
        {/* Inline progress bar during execution */}
        {tick >= EMAIL_PEND && tick < 180 + 8 && (
          <div className="h-[3px] w-[60px] overflow-hidden rounded-full bg-[#E7E5E4]">
            <div
              className="h-full rounded-full bg-[#6366F1] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-[#A8A29E]">
        <span>Prospects</span>
        <span className="text-[#D6D3D1]">&middot;</span>
        <span className="tabular-nums">{n} rows</span>
        <span className="text-[#D6D3D1]">&middot;</span>
        <span>2 extensions</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Demo window wrapper
// ---------------------------------------------------------------------------

const DEMO_W = 1100

function Demo() {
  const [tick, setTick] = useState(0)
  const [live, setLive] = useState(false)
  const [scale, setScale] = useState(1)
  const el = useRef<HTMLDivElement>(null)
  const outer = useRef<HTMLDivElement>(null)

  // Responsive scale
  useEffect(() => {
    function measure() {
      if (!outer.current) return
      setScale(Math.min(1, outer.current.clientWidth / DEMO_W))
    }
    measure()
    window.addEventListener('resize', measure, { passive: true })
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Start on intersection
  useEffect(() => {
    const node = el.current
    if (!node) return
    const obs = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) { setLive(true); obs.disconnect() }
    }, { threshold: 0.1 })
    obs.observe(node)
    return () => obs.disconnect()
  }, [])

  // Tick loop
  useEffect(() => {
    if (!live) return
    const id = setInterval(() => setTick(t => t >= LOOP ? 0 : t + 1), T)
    return () => clearInterval(id)
  }, [live])

  // Fade in/out
  const opacity = tick >= FADE_OUT ? Math.max(0, 1 - (tick - FADE_OUT) / (LOOP - FADE_OUT))
    : tick < 4 ? tick / 4 : 1

  const intrinsicH = 440 + 44 + 28 // content + chrome + status
  const scaledH = intrinsicH * scale

  return (
    <div ref={outer} className="relative mx-auto w-full max-w-[1100px]">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -inset-40 z-0"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(99,102,241,0.04) 0%, transparent 70%)' }} />

      <div style={{ height: scaledH, position: 'relative' }}>
        <div
          ref={el}
          style={{
            width: DEMO_W,
            transformOrigin: 'top left',
            transform: `scale(${scale})`,
          }}
        >
          <div
            className="relative z-10 overflow-hidden rounded-xl"
            style={{
              opacity,
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 25px 60px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)',
            }}
          >
            <Chrome />
            <div className="flex" style={{ height: 440 }}>
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
// Page
// ---------------------------------------------------------------------------

export function App() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed inset-x-0 top-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <img src="/icon.svg" alt="" className="h-[18px] w-auto" />
          </div>
          <a href="#download" className="text-[13px] text-white/30 transition-colors hover:text-white/60">Download</a>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-[1200px] px-5 pt-28 pb-4 text-center sm:px-6 sm:pt-36">
          <h1 className="anim-hero-1 text-[2.5rem] leading-[1.06] font-bold tracking-[-0.035em] text-white sm:text-[4.5rem] md:text-[5.5rem]">
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
        <section className="anim-hero-4 mx-auto mt-12 max-w-[1200px] px-2 sm:mt-16 sm:px-4">
          <Demo />
        </section>

        {/* Statement */}
        <section className="mx-auto mt-20 max-w-[600px] px-5 text-center sm:mt-32 sm:px-6">
          <p className="text-[15px] leading-[1.8] text-white/20">
            GTM Pilot is a desktop app that runs entirely on your computer.
            Connect your enrichment APIs, describe what you need to Claude,
            and watch your spreadsheet fill in real time. One <span className="text-white/40">.db</span> file per project.
            No cloud. No vendor lock-in.
          </p>
        </section>

        {/* Second CTA */}
        <section className="mx-auto mt-16 max-w-[1200px] px-5 text-center sm:mt-24 sm:px-6">
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
      <footer className="mt-20 border-t border-white/[0.04] py-8 sm:mt-32">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 text-[11px] text-white/12 sm:px-6">
          <img src="/icon.svg" alt="GTM Pilot" className="h-3 w-auto opacity-30" />
          <span>&copy; 2026</span>
        </div>
      </footer>
    </div>
  )
}
