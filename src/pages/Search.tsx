// src/pages/Search.tsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabase'
import { getPulseTheme, pulseType, ON_GRADIENT_TOP } from '../premiumTheme'
import { glassInput } from '../components/pulse/PulseUI'
import { useModules } from '../contexts'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import PageShell from '../components/pulse/PageShell'
import PageIntro from '../components/pulse/PageIntro'
import LoadingText from '../components/pulse/LoadingText'
import EmptyState from '../components/pulse/EmptyState'
import OfflineNote from '../components/pulse/OfflineNote'
import { ModuleIcon } from '../lib/medicalIcons'
import { SearchIcon2, DocumentIcon } from '../components/ui/tool-icons'
import { Building2, FlaskConical, BookOpenText, CalendarDays } from 'lucide-react'
import { fetchModuleQuestions, fetchModuleFiles, fetchModuleSummaries } from '../lib/moduleContent'
import { networkFirst } from '../lib/dataCache'

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

const MAX_RESULTS = 60

// Escapes ilike wildcards so a literal "%" or "_" isn't treated as a pattern.
function escapeLikePattern(value: string) {
  return value.replace(/[%_\\]/g, '\\$&')
}

function includesText(value: string | null | undefined, needle: string) {
  return !!value && value.toLowerCase().includes(needle)
}

function findModule(mods: SearchModule[], moduleId: string) {
  return mods.find(m => m.id === moduleId) || null
}

// Returns null when the server can't be reached so the caller can fall back to saved content.
async function searchOnline(q: string, mods: SearchModule[]): Promise<SearchResult[] | null> {
  const like = `%${escapeLikePattern(q)}%`
  const [fileRes, questionRes, summaryRes, scheduleRes] = await Promise.all([
    supabase.from('files').select('id, name, type, module_id').ilike('name', like).limit(20),
    supabase.from('questions_public').select('id, question, option_a, option_b, option_c, option_d, module_id, subject_id, exam_type, exam_stage, created_at').ilike('question', like).limit(20),
    supabase.from('summaries').select('id, title, module_id').ilike('title', like).limit(20),
    supabase.from('schedules').select('id, title, type, module_id').ilike('title', like).limit(20),
  ])

  if (fileRes.error || questionRes.error || summaryRes.error || scheduleRes.error) return null

  const files: SearchResult[] = (fileRes.data || []).map((f: any) => ({ type: 'file', id: f.id, title: f.name, module: findModule(mods, f.module_id), raw: f }))
  const questions: SearchResult[] = (questionRes.data || []).map((r: any) => ({ type: 'question', id: r.id, title: r.question, module: findModule(mods, r.module_id), raw: r }))
  const summaries: SearchResult[] = (summaryRes.data || []).map((s: any) => ({ type: 'summary', id: s.id, title: s.title, module: findModule(mods, s.module_id), raw: s }))
  const schedules: SearchResult[] = (scheduleRes.data || []).map((s: any) => ({ type: 'schedule', id: s.id, title: s.title, module: findModule(mods, s.module_id), raw: s }))

  return [...files, ...questions, ...summaries, ...schedules]
}

// Searches the content already saved on this device, module by module.
async function searchSavedContent(q: string, mods: SearchModule[]): Promise<SearchResult[]> {
  const needle = q.toLowerCase()
  const groups = await Promise.all(mods.map(async mod => {
    const [questionsRes, filesRes, summariesRes, schedulesRes] = await Promise.all([
      fetchModuleQuestions(mod.id),
      fetchModuleFiles(mod.id),
      fetchModuleSummaries(mod.id),
      networkFirst(`schedules:${mod.id}`, () => supabase.from('schedules').select('id, title, type, module_id').eq('module_id', mod.id)),
    ])

    const hits: SearchResult[] = []
    for (const row of (questionsRes.data || []) as any[]) {
      if (includesText(row.question, needle)) hits.push({ type: 'question', id: row.id, title: row.question, module: mod, raw: row })
    }
    for (const row of (filesRes.data || []) as any[]) {
      if (includesText(row.name, needle)) hits.push({ type: 'file', id: row.id, title: row.name, module: mod, raw: row })
    }
    for (const row of (summariesRes.data || []) as any[]) {
      if (includesText(row.title, needle)) hits.push({ type: 'summary', id: row.id, title: row.title, module: mod, raw: row })
    }
    for (const row of (schedulesRes.data || []) as any[]) {
      if (includesText(row.title, needle)) hits.push({ type: 'schedule', id: row.id, title: row.title, module: mod, raw: row })
    }
    return hits
  }))
  return groups.flat()
}

export default function Search({ dark }: { dark: boolean }) {
  const pt = getPulseTheme(dark)
  const navigate = useNavigate()
  const location = useLocation()
  const { modules } = useModules() as { modules: SearchModule[] }
  const [query, setQuery] = useState(() => (location.state as { initialQuery?: string } | null)?.initialQuery || '')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [savedCopy, setSavedCopy] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const inputRef = useRef<HTMLInputElement>(null)
  const searchIdRef = useRef(0)
  const modulesRef = useRef<SearchModule[]>(modules)

  useEffect(() => { modulesRef.current = modules }, [modules])

  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) inputRef.current?.focus()
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < 2) {
      // Invalidates any in-flight request so its results can't reappear.
      searchIdRef.current++
      setResults(null)
      setLoading(false)
      setSavedCopy(false)
      return
    }
    debounceRef.current = setTimeout(() => runSearch(q), 350)
    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  async function runSearch(q: string) {
    const requestId = ++searchIdRef.current
    setLoading(true)
    const mods = modulesRef.current
    const online = navigator.onLine ? await searchOnline(q, mods) : null
    if (requestId !== searchIdRef.current) return
    const content = online ?? (await searchSavedContent(q, mods))
    if (requestId !== searchIdRef.current) return

    const needle = q.toLowerCase()
    const moduleMatches: SearchResult[] = mods
      .filter(m => includesText(m.name, needle))
      .map((m): SearchResult => ({ type: 'module', id: m.id, title: m.name, module: m }))

    setSavedCopy(online === null)
    setResults([...moduleMatches, ...content].slice(0, MAX_RESULTS))
    setLoading(false)
  }

  // Each result deep-links to the exact item, not just its module.
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

      {savedCopy && !loading && <OfflineNote dark={dark} message="Searching content saved on this device." />}

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
                    display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2,
                    overflow: 'hidden', wordBreak: 'break-word', overflowWrap: 'anywhere'
                  }}>{r.title}</div>
                  <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                    <span style={{ flexShrink: 0 }}>{meta.label}</span>
                    {r.module && (
                      <>
                        <span style={{ flexShrink: 0 }}>·</span>
                        <span style={{ flexShrink: 0, display: 'inline-flex' }}><ModuleIcon value={r.module.icon} size={12} color={pt.textMuted} /></span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{r.module.name}</span>
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
