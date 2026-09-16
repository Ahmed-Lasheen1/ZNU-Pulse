// src/pages/Search.tsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabase'
import { getPulseTheme, pulseType, ON_GRADIENT_TOP } from '../premiumTheme'
import { glassInput } from '../components/pulse/PulseUI'
import { useModules } from '../contexts'
import ErrorBanner from '../components/ErrorBanner'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import PageShell from '../components/pulse/PageShell'
import PageIntro from '../components/pulse/PageIntro'
import LoadingText from '../components/pulse/LoadingText'
import EmptyState from '../components/pulse/EmptyState'
import { ModuleIcon } from '../lib/medicalIcons'
import { SearchIcon2, DocumentIcon } from '../components/ui/tool-icons'
import { Building2, FlaskConical, BookOpenText, CalendarDays } from 'lucide-react'

interface SearchModule {
  id: string
  name: string
  icon?: string | null
  color: string
}

interface SearchResult {
  type: 'module' | 'file' | 'question' | 'summary' | 'schedule'
  id: string
  title: string
  module?: SearchModule | null
  raw?: any
}

const typeMeta: Record<SearchResult['type'], { Icon: (p: { color?: string; size?: number }) => JSX.Element; label: string; color: string }> = {
  module: { Icon: Building2, label: 'Module', color: '#38bdf8' },
  file: { Icon: DocumentIcon, label: 'File', color: '#60a5fa' },
  question: { Icon: FlaskConical, label: 'MCQ Question', color: '#e2725b' },
  summary: { Icon: BookOpenText, label: 'Summary', color: '#34d399' },
  schedule: { Icon: CalendarDays, label: 'Schedule', color: '#a78bfa' },
}

// Escapes ilike wildcard/escape characters in user-typed text so a
// literal "%" or "_" in a search doesn't act as a SQL wildcard.
function escapeLikePattern(value: string) {
  return value.replace(/[%_\\]/g, '\\$&')
}

export default function Search({ dark }: { dark: boolean }) {
  const pt = getPulseTheme(dark)
  const navigate = useNavigate()
  const location = useLocation()
  const { modules } = useModules() as { modules: SearchModule[] }
  const [query, setQuery] = useState(() => (location.state as { initialQuery?: string } | null)?.initialQuery || '')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const inputRef = useRef<HTMLInputElement>(null)
  const searchIdRef = useRef(0)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < 2) { setResults(null); return }
    debounceRef.current = setTimeout(() => runSearch(q), 350)
    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  function moduleFor(moduleId: string) {
    return modules.find(m => m.id === moduleId)
  }

  async function runSearch(q: string) {
    const requestId = ++searchIdRef.current
    setLoading(true)
    setError(false)
    const like = `%${escapeLikePattern(q)}%`
    const [fileRes, questionRes, summaryRes, scheduleRes] = await Promise.all([
      supabase.from('files').select('*').ilike('name', like).limit(20),
      supabase.from('questions_public').select('id, question, option_a, option_b, option_c, option_d, module_id, subject_id, exam_type, exam_stage, created_at').ilike('question', like).limit(20),
      supabase.from('summaries').select('*').ilike('title', like).limit(20),
      supabase.from('schedules').select('*').ilike('title', like).limit(20),
    ])

    if (requestId !== searchIdRef.current) return

    if (fileRes.error || questionRes.error || summaryRes.error || scheduleRes.error) {
      setError(true)
    }

    const moduleMatches: SearchResult[] = modules
      .filter(m => m.name.toLowerCase().includes(q.toLowerCase()))
      .map(m => ({ type: 'module', id: m.id, title: m.name, module: m }))

    const fileMatches: SearchResult[] = (fileRes.data || []).map((f: any) => ({ type: 'file', id: f.id, title: f.name, module: moduleFor(f.module_id), raw: f }))
    const questionMatches: SearchResult[] = (questionRes.data || []).map((q2: any) => ({ type: 'question', id: q2.id, title: q2.question, module: moduleFor(q2.module_id), raw: q2 }))
    const summaryMatches: SearchResult[] = (summaryRes.data || []).map((s: any) => ({ type: 'summary', id: s.id, title: s.title, module: moduleFor(s.module_id), raw: s }))
    const scheduleMatches: SearchResult[] = (scheduleRes.data || []).map((s: any) => ({ type: 'schedule', id: s.id, title: s.title, module: moduleFor(s.module_id), raw: s }))

    setResults([...moduleMatches, ...fileMatches, ...questionMatches, ...summaryMatches, ...scheduleMatches])
    setLoading(false)
  }

  // Opens the exact item a search result points at rather than just
  // its parent module — file/question/summary/schedule each resolve
  // to a deep link that pre-selects and opens the exact match.
  function openResult(r: SearchResult) {
    if (r.type === 'module') return navigate(`/module/${r.id}`)
    if (r.type === 'file') return navigate(`/files?type=${r.raw.type}&module=${r.raw.module_id}&file=${r.raw.id}`)
    if (r.type === 'question') {
      const q = r.raw
      return navigate('/mcq', {
        state: {
          retryQuestions: [{
            id: q.id, question: q.question,
            option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d,
            module_id: q.module_id, subject_id: q.subject_id
          }]
        }
      })
    }
    if (r.type === 'summary') return navigate(`/summaries?module=${r.raw.module_id}&summary=${r.raw.id}`)
    if (r.type === 'schedule') return navigate(`/schedule?module=${r.raw.module_id}&type=${r.raw.type}&item=${r.raw.id}`)
  }

  const inStyle = { ...glassInput(pt, dark), padding: '15px 20px', marginBottom: 0, borderRadius: 999, fontSize: 15 }

  return (
    <PageShell dark={dark} backFallback="/" maxWidth={700}>
      <PageIntro dark={dark} emoji={<SearchIcon2 color={ON_GRADIENT_TOP.primary} size={40} />} title="Search" subtitle="Modules, files, questions, summaries & schedules" paddingBottom={20} />

      <input
        ref={inputRef}
        type="search"
        aria-label="Search modules, files, questions, summaries and schedules"
        placeholder="Search..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{ ...inStyle, marginBottom: 20, width: '100%' }}
      />

      {error && <ErrorBanner message="Search failed — check your connection and try again." />}

      {query.trim().length > 0 && query.trim().length < 2 && (
        <p style={{ color: ON_GRADIENT_TOP.secondary, textAlign: 'center', fontSize: 13 }}>Keep typing — at least 2 characters.</p>
      )}

      {loading && <LoadingText label="Searching..." />}

      {!loading && results && results.length === 0 && (
        <EmptyState dark={dark} icon={<SearchIcon2 color={pt.sub} size={15} />} message={`No results for "${query}"`} />
      )}

      {!loading && results && results.length > 0 && (
        <div style={{ display: 'grid', gap: 10 }}>
          {results.map((r, i) => {
            const meta = typeMeta[r.type]
            return (
              <LiquidGlassCard
                key={`${r.type}-${r.id}`}
                dark={dark}
                delay={i * 40}
                onClick={() => openResult(r)}
                style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: `${meta.color}20`, border: `1px solid ${meta.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}><meta.Icon color={meta.color} size={18} /></div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    ...pulseType.cardTitle, color: pt.textPrimary,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>{r.title}</div>
                  <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {meta.label}
                    {r.module && (
                      <>
                        · <ModuleIcon value={r.module.icon} size={12} color={pt.textMuted} /> {r.module.name}
                      </>
                    )}
                  </div>
                </div>
              </LiquidGlassCard>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}
