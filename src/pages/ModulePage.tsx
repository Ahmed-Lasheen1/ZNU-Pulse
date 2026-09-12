// src/pages/ModulePage.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP } from '../premiumTheme'
import ErrorBanner from '../components/ErrorBanner'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import PulseBackground from '../components/pulse/PulseBackground'
import BackButton from '../components/pulse/BackButton'
import { useModules } from '../contexts'
import { fetchModuleStages } from '../lib/moduleStages'
import { fetchSubjectsForModule } from '../lib/subjects'
import { ModuleIcon, ExamIcon, NotesIcon } from '../lib/medicalIcons'
// AUDIT FIX: isSafeExternalUrl guards the admin-entered Drive link before
// it's ever shown as a clickable card / passed to window.open() — see
// src/lib/embedUrl.js for details.
import { isSafeExternalUrl } from '../lib/embedUrl'
import { ExamStageIcon, StudyByLessonIcon, StudyMaterialsIcon, SmartSummariesIcon, PracticeIcon, BookIcon, FolderIcon } from '@/components/ui/tool-icons'

interface PageModule {
  id: string; name: string; icon?: string | null; color: string; status: 'active' | 'completed'
}
interface PageSubject { id: string; module_id: string; name: string; icon?: string | null; color?: string | null }
interface ExamStage { value: string; title: string; emoji?: string; Icon?: (p: { color: string; size?: number }) => JSX.Element; color: string }

function gridCols(n: number) { return n === 1 ? 1 : n === 2 ? 2 : n === 3 ? 3 : 4 }

export default function ModulePage({ dark }: { dark: boolean }) {
  const pt = getPulseTheme(dark)
  const { moduleId } = useParams()
  const navigate = useNavigate()
  const { modules, modulesLoaded, modulesError } = useModules() as { modules: PageModule[]; modulesLoaded: boolean; modulesError: boolean }
  const module = modules.find(m => m.id === moduleId) || null
  const [presentFileTypes, setPresentFileTypes] = useState<Set<string>>(new Set())
  const [loadError, setLoadError] = useState(false)
  const [driveUrl, setDriveUrl] = useState('')
  const [examStages, setExamStages] = useState<ExamStage[]>([])
  // AUDIT FIX (per user request): exam stages are hidden entirely until
  // there's actually something tagged to them — otherwise a brand-new
  // module (or one where nobody has tagged content to a given stage yet)
  // shows 4 dead-end stage cards that lead to an empty StagePage. A
  // stage "has data" if at least one file, question, or summary in this
  // module carries that exam_stage value — matching the same three
  // content types StagePage itself pulls from for a stage's Study
  // Materials / Practice / Summaries sections.
  const [stagesWithContent, setStagesWithContent] = useState<Set<string>>(new Set())
  const [subjects, setSubjects] = useState<PageSubject[]>([])

  useEffect(() => {
    let ignore = false
    supabase.from('site_settings').select('value').eq('key', 'drive_url').single()
      .then(({ data }) => { if (!ignore && data?.value) setDriveUrl(data.value) })
    return () => { ignore = true }
  }, [])

  useEffect(() => {
    let ignore = false
    supabase.from('files').select('type').eq('module_id', moduleId)
      .then(({ data, error }) => {
        if (ignore) return
        if (data) setPresentFileTypes(new Set(data.map((f: any) => f.type)))
        if (error) setLoadError(true)
      })
    fetchModuleStages(moduleId!).then(result => { if (!ignore) setExamStages(result) })
    fetchSubjectsForModule(moduleId!).then(({ subjects, error }) => {
      if (ignore) return
      setSubjects(subjects)
      if (error) setLoadError(true)
    })

    // Which exam_stage values actually have something tagged to them in
    // this module — checked across all three content types a stage can
    // hold. Any one of the three is enough for the stage to "count".
    Promise.all([
      supabase.from('files').select('exam_stage').eq('module_id', moduleId).not('exam_stage', 'is', null),
      supabase.from('questions').select('exam_stage').eq('module_id', moduleId).not('exam_stage', 'is', null),
      supabase.from('summaries').select('exam_stage').eq('module_id', moduleId).not('exam_stage', 'is', null),
    ]).then(([filesRes, questionsRes, summariesRes]) => {
      if (ignore) return
      const stages = new Set<string>()
      ;[filesRes, questionsRes, summariesRes].forEach(res => {
        if (res.error) { setLoadError(true); return }
        (res.data || []).forEach((row: any) => { if (row.exam_stage) stages.add(row.exam_stage) })
      })
      setStagesWithContent(stages)
    })

    return () => { ignore = true }
  }, [moduleId])

  if (!module) return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <PulseBackground />
      <div style={{ position: 'relative', zIndex: 1, padding: 24, textAlign: 'center', color: ON_GRADIENT_TOP.secondary }}>
        {(loadError || modulesError)
          ? <ErrorBanner message="Couldn't load this module — check your connection." />
          : !modulesLoaded ? 'Loading...' : "This module doesn't exist or was removed."}
      </div>
    </div>
  )

  // AUDIT FIX (per user request): only stages with at least one tagged
  // file/question/summary are shown — the section itself disappears
  // entirely when none qualify, rather than showing an empty grid.
  const visibleExamStages = examStages.filter(stage => stagesWithContent.has(stage.value))

  // AUDIT FIX: only render/open the Drive link when it's a real http(s)
  // URL — closes the same "unvalidated admin-entered URL used as a
  // window.open target" gap that embedUrl.js's isSafeUrl() closes for
  // iframe/audio src elsewhere in the app.
  const driveUrlIsSafe = !!driveUrl && isSafeExternalUrl(driveUrl)

  // AUDIT FIX (files-as-one-card, per user request): Study Materials
  // used to show one card PER file type (Explanation/Question/Lecture/
  // Course), each linking straight to that one type on FilesPage. Now
  // it's a single "Files" card — choosing the type happens on
  // FilesPage itself via a tab row (see FilesPage.tsx) — sitting next
  // to the Drive card, both using the same row-style card treatment so
  // they read as peers rather than two different card shapes.
  const materialsCards: JSX.Element[] = []
  if (presentFileTypes.size > 0) {
    materialsCards.push(
      <LiquidGlassCard key="files" dark={dark} delay={0}
        onClick={() => navigate(`/files?module=${moduleId}`)}
        style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          background: `${pt.cobalt}20`, border: `1px solid ${pt.cobaltBorder}`,
          borderRadius: 12, width: 44, height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <FolderIcon color={pt.cobalt} size={20} />
        </div>
        <div>
          <div style={{ ...pulseType.cardTitle, color: pt.textPrimary }}>Files</div>
          <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 2 }}>Explanations, questions, lectures & more</div>
        </div>
      </LiquidGlassCard>
    )
  }
  if (driveUrlIsSafe) {
    materialsCards.push(
      <LiquidGlassCard key="drive" dark={dark} delay={0}
        onClick={() => window.open(driveUrl, '_blank', 'noopener,noreferrer')}
        style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          background: `${pt.cobalt}20`, border: `1px solid ${pt.cobaltBorder}`,
          borderRadius: 12, width: 44, height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <StudyMaterialsIcon color={pt.cobalt} size={20} />
        </div>
        <div>
          <div style={{ ...pulseType.cardTitle, color: pt.textPrimary }}>University Google Drive</div>
          <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 2 }}>Lectures, recordings & more</div>
        </div>
      </LiquidGlassCard>
    )
  }

  // Shared per-stage/per-subject card renderers so the "single item ->
  // .auto-grid-single, multiple -> .auto-grid" switch below (AUDIT FIX,
  // per user request: a lone card no longer stretches edge-to-edge —
  // .auto-grid-single caps it at a reasonable, centered width, same
  // treatment Study Materials already had) doesn't duplicate the card
  // markup itself.
  const renderStageCard = (stage: ExamStage, i: number) => (
    <LiquidGlassCard key={stage.value} dark={dark} delay={i * 80}
      onClick={() => navigate(`/module/${moduleId}/stage/${stage.value}`)}
      style={{ padding: 'clamp(20px, 2vw, 28px)', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        {stage.Icon
          ? <stage.Icon color={stage.color} size={38} />
          : <span style={{ fontSize: 'clamp(28px, 3vw, 42px)' }}>{stage.emoji}</span>}
      </div>
      <div style={{ ...pulseType.cardTitle, fontSize: 'clamp(13px, 1.1vw, 16px)', color: pt.textPrimary }}>{stage.title}</div>
    </LiquidGlassCard>
  )

  const renderSubjectCard = (sub: PageSubject, i: number) => (
    <LiquidGlassCard key={sub.id} dark={dark} delay={i * 80}
      onClick={() => navigate(`/module/${moduleId}/subject/${sub.id}`)}
      style={{ padding: 'clamp(20px, 2vw, 28px)', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        {sub.icon
          ? <ModuleIcon value={sub.icon} size={38} color={sub.color || '#34d399'} />
          : <BookIcon color={sub.color || '#34d399'} size={38} />}
      </div>
      <div style={{ ...pulseType.cardTitle, fontSize: 'clamp(13px, 1.1vw, 16px)', color: pt.textPrimary }}>{sub.name}</div>
    </LiquidGlassCard>
  )

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <PulseBackground />
      <div className="pulse-wide" style={{ position: 'relative', zIndex: 1, padding: '24px 20px 100px', fontFamily: pulseFonts.body }}>

        <div style={{ marginBottom: 8 }}>
          <BackButton dark={dark} fallback="/" />
        </div>

        <div style={{ textAlign: 'center', padding: '20px 0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <ModuleIcon value={module.icon} size={52} color={module.color} />
          </div>
          <h1 style={{ ...pulseType.pageTitle, fontSize: 26, color: module.color, marginBottom: 6 }}>{module.name}</h1>
          <div style={{
            display: 'inline-block',
            background: module.status === 'active' ? 'rgba(74,222,128,0.14)' : (dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
            color: module.status === 'active' ? '#4ade80' : ON_GRADIENT_TOP.muted,
            border: `1px solid ${module.status === 'active' ? 'rgba(74,222,128,0.35)' : pt.border}`,
            borderRadius: 999, padding: '4px 14px', fontSize: 12, fontWeight: 700
          }}>
            {module.status === 'active' ? '● Active' : '✓ Completed'}
          </div>
        </div>

        {/* Exam Stage — hidden entirely when no stage has any content
            tagged to it yet (see stagesWithContent above). A single
            qualifying stage renders centered/width-capped instead of
            stretching the whole row. */}
        {visibleExamStages.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ ...pulseType.sectionLabel, color: ON_GRADIENT_TOP.muted, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ExamStageIcon color={ON_GRADIENT_TOP.muted} size={14} /> Exam Stage
            </h2>
            {visibleExamStages.length === 1 ? (
              <div className="auto-grid-single">{renderStageCard(visibleExamStages[0], 0)}</div>
            ) : (
              <div className="auto-grid" style={{ ['--auto-grid-cols' as any]: gridCols(visibleExamStages.length) }}>
                {visibleExamStages.map(renderStageCard)}
              </div>
            )}
          </div>
        )}

        {/* Study by Lesson — same single-item centering treatment. */}
        {subjects.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ ...pulseType.sectionLabel, color: ON_GRADIENT_TOP.muted, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <StudyByLessonIcon color={ON_GRADIENT_TOP.muted} size={14} /> Study by Lesson
            </h2>
            {subjects.length === 1 ? (
              <div className="auto-grid-single">{renderSubjectCard(subjects[0], 0)}</div>
            ) : (
              <div className="auto-grid" style={{ ['--auto-grid-cols' as any]: gridCols(subjects.length) }}>
                {subjects.map(renderSubjectCard)}
              </div>
            )}
          </div>
        )}

        {/* Study Materials — now at most 2 cards: Files + Drive. Single
            card centers/caps width via .auto-grid-single (same as
            before); two cards sit side by side in a 2-column grid. */}
        {materialsCards.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ ...pulseType.sectionLabel, color: ON_GRADIENT_TOP.muted, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <StudyMaterialsIcon color={ON_GRADIENT_TOP.muted} size={14} /> Study Materials
            </h2>
            {materialsCards.length === 1 ? (
              <div className="auto-grid-single">{materialsCards[0]}</div>
            ) : (
              <div className="summary-practice-row">
                {materialsCards}
              </div>
            )}
          </div>
        )}

        {/* Smart Summaries & Practice — side by side from tablet width
            up (.summary-practice-row, see index.css), stacked on
            phones like every other section on this page. */}
        <div className="summary-practice-row" style={{ marginBottom: 32 }}>
          <div>
            <h2 style={{ ...pulseType.sectionLabel, color: ON_GRADIENT_TOP.muted, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <SmartSummariesIcon color={ON_GRADIENT_TOP.muted} size={14} /> Smart Summaries
            </h2>
            <LiquidGlassCard dark={dark} delay={0} onClick={() => navigate(`/summaries?module=${moduleId}`)} style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <NotesIcon color={pt.success} size={30} />
              </div>
              <div style={{ ...pulseType.cardTitle, color: pt.textPrimary }}>All Summaries</div>
              <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 4 }}>View summaries for this module</div>
            </LiquidGlassCard>
          </div>

          <div>
            <h2 style={{ ...pulseType.sectionLabel, color: ON_GRADIENT_TOP.muted, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <PracticeIcon color={ON_GRADIENT_TOP.muted} size={14} /> Practice
            </h2>
            <LiquidGlassCard dark={dark} delay={0} onClick={() => navigate(`/mcq?module=${moduleId}`)} style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <ExamIcon color="#e2725b" size={30} />
              </div>
              <div style={{ ...pulseType.cardTitle, color: pt.textPrimary }}>MCQ Bank</div>
              <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 4 }}>Practice questions for this module</div>
            </LiquidGlassCard>
          </div>
        </div>
      </div>
    </div>
  )
}
