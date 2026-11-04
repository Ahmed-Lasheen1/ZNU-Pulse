import { useState } from 'react'
import { supabase } from '@/core/supabase'
import { getPulseTheme } from '@/shared/theme/premiumTheme'
import InlineMessage from '@/shared/ui/feedback/InlineMessage'
import AdminSplitLayout from '@/features/admin/common/AdminSplitLayout'
import AdminFormCard from '@/features/admin/common/AdminFormCard'
import AdminRow from '@/features/admin/common/AdminRow'
import AdminGroupedList from '@/features/admin/common/AdminGroupedList'
import AdminDeleteDialog from '@/features/admin/common/AdminDeleteDialog'
import { inStyle as adminInStyle, miniBtn, LIST_LIMIT } from '@/features/admin/common/adminStyles'
import { useAdminMessage } from '@/features/admin/common/useAdminMessage'
import { useAdminEntityCrud } from '@/features/admin/common/useAdminEntityCrud'
import { useConfirmDelete } from '@/features/admin/common/useConfirmDelete'
import { useAdminList } from '@/features/admin/common/useAdminList'
import { PICK_MODULE_MESSAGE, REQUIRED_FIELDS_MESSAGE } from '@/features/admin/common/useAdminContext'
import { syncContentVersions } from '@/services/content/contentVersions'
import { EditIcon, ListIcon, ConstructionIcon, SearchIcon2 } from '@/shared/icons/tool-icons'
import type { AdminModule, AdminLesson, AdminContext } from '@/features/admin/common/adminTypes'

interface FlashcardRow {
  id: string
  module_id: string
  lesson_id: string
  front: string
  back: string
  created_at: string
}

interface FlashcardsTabProps {
  dark: boolean
  modules: AdminModule[]
  lessons: AdminLesson[]
  context: AdminContext
}

const FLASHCARD_COLUMNS = 'id, module_id, lesson_id, front, back, created_at'
const PICK_LESSON_MESSAGE = '❌ Pick a subject and lesson above first'
const MAX_TEXT_LENGTH = 2000
const MAX_BULK_CARDS = 300

const BULK_PLACEHOLDER = `F: What is the powerhouse of the cell?
B: Mitochondria

F: Which nerve supplies the diaphragm?
B: The phrenic nerve (C3, C4, C5)

Each card is a blank-line separated block: an F: line, then a B: line.
A side may continue on following lines, but with no blank lines inside a card.`

// Splits pasted text into cards (F: front, B: back) and reports blocks that cannot be read.
function parseBulkFlashcards(text: string) {
  const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)
  const cards: { front: string; back: string }[] = []
  const errors: string[] = []

  blocks.forEach((block, index) => {
    const lines = block.split('\n').map(l => l.trimEnd())
    const backAt = lines.findIndex(l => /^B:/i.test(l.trim()))
    if (!/^F:/i.test(lines[0].trim()) || backAt < 1) {
      errors.push(`Card ${index + 1}: needs an F: line followed by a B: line`)
      return
    }
    const front = [lines[0].trim().replace(/^F:/i, ''), ...lines.slice(1, backAt)].join('\n').trim()
    const back = [lines[backAt].trim().replace(/^B:/i, ''), ...lines.slice(backAt + 1)].join('\n').trim()
    if (!front || !back) {
      errors.push(`Card ${index + 1}: the front and the back cannot be empty`)
      return
    }
    if (front.length > MAX_TEXT_LENGTH || back.length > MAX_TEXT_LENGTH) {
      errors.push(`Card ${index + 1}: each side must be under ${MAX_TEXT_LENGTH} characters`)
      return
    }
    cards.push({ front, back })
  })

  return { cards, errors }
}

// Admin tab for adding flashcards one at a time or in bulk, and for editing or deleting them.
export default function FlashcardsTab({ dark, modules, lessons, context }: FlashcardsTabProps) {
  const pt = getPulseTheme(dark)
  const baseStyle = adminInStyle(pt, dark)
  const { message, showMessage } = useAdminMessage()

  const [search, setSearch] = useState('')
  const { rows: flashcards, loading, error, refresh } = useAdminList<FlashcardRow>({
    table: 'flashcards',
    moduleId: context.moduleId,
    select: FLASHCARD_COLUMNS,
    search: { column: 'front', term: search },
  })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [bulkMode, setBulkMode] = useState(true)
  const [bulkText, setBulkText] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)

  const bulkActive = bulkMode && !editingId
  const lessonTitle = (id: string) => lessons.find(l => l.id === id)?.title ?? ''

  // Loads a card into the form and moves the context bar to its lesson.
  function editCard(row: FlashcardRow) {
    setEditingId(row.id)
    setFront(row.front)
    setBack(row.back)
    const lesson = lessons.find(l => l.id === row.lesson_id)
    context.setContext({ moduleId: row.module_id, subjectId: lesson?.subject_id || '', lessonId: row.lesson_id })
  }

  // Clears the form after a save or cancel.
  function resetForm() {
    setEditingId(null)
    setFront('')
    setBack('')
  }

  const crud = useAdminEntityCrud({
    table: 'flashcards',
    label: 'Flashcard',
    editingId,
    buildPayload: () => ({ front: front.trim(), back: back.trim(), module_id: context.moduleId, lesson_id: context.lessonId }),
    resetForm,
    refresh,
    showMessage,
  })
  const del = useConfirmDelete(crud.remove)

  // Validates the single-card form and saves it.
  function saveCard() {
    if (crud.saving) return
    if (!context.moduleId) return showMessage(PICK_MODULE_MESSAGE)
    if (!context.lessonId) return showMessage(PICK_LESSON_MESSAGE)
    if (!front.trim() || !back.trim()) return showMessage(REQUIRED_FIELDS_MESSAGE)
    if (front.length > MAX_TEXT_LENGTH || back.length > MAX_TEXT_LENGTH) {
      return showMessage(`❌ Each side must be under ${MAX_TEXT_LENGTH} characters`)
    }
    crud.save()
  }

  // Parses the pasted text and inserts every card into the selected lesson.
  async function bulkAddCards() {
    if (bulkSaving) return
    if (!context.moduleId) return showMessage(PICK_MODULE_MESSAGE)
    if (!context.lessonId) return showMessage(PICK_LESSON_MESSAGE)
    if (!bulkText.trim()) return showMessage('❌ Paste some flashcards first')

    const { cards, errors } = parseBulkFlashcards(bulkText)
    if (errors.length > 0) return showMessage(`❌ ${errors.length} card(s) have a formatting problem — ${errors[0]}`)
    if (cards.length === 0) return showMessage('❌ No flashcards found in the text')
    if (cards.length > MAX_BULK_CARDS) return showMessage(`❌ Add at most ${MAX_BULK_CARDS} cards at a time`)

    setBulkSaving(true)
    const { error: insertError } = await supabase
      .from('flashcards')
      .insert(cards.map(c => ({ ...c, module_id: context.moduleId, lesson_id: context.lessonId })))
    setBulkSaving(false)

    if (insertError) return showMessage('❌ ' + insertError.message)
    syncContentVersions({ force: true })
    showMessage(`✅ ${cards.length} flashcards added!`)
    setBulkText('')
    refresh()
  }

  const form = (
    <AdminFormCard
      dark={dark}
      noun="Flashcard"
      title={bulkActive ? 'Bulk Add Flashcards' : undefined}
      Icon={bulkActive ? ListIcon : undefined}
      description={context.lessonId ? `In ${lessonTitle(context.lessonId)}` : 'Pick a subject and lesson above'}
      editing={!!editingId}
      addLabel={bulkActive ? 'Parse & Add All' : 'Add Flashcard'}
      savingLabel={bulkActive ? 'Adding...' : 'Saving...'}
      saving={bulkActive ? bulkSaving : crud.saving}
      onSave={bulkActive ? bulkAddCards : saveCard}
      onCancel={editingId ? resetForm : undefined}
      headerAction={!editingId && (
        <button onClick={() => setBulkMode(m => !m)} style={miniBtn(pt.sub)}>
          {bulkMode ? <><EditIcon color={pt.sub} size={12} /> Single Add</> : <><ListIcon color={pt.sub} size={12} /> Bulk Add</>}
        </button>
      )}
    >
      {bulkActive ? (
        <textarea
          dir="auto"
          placeholder={BULK_PLACEHOLDER}
          value={bulkText}
          onChange={e => setBulkText(e.target.value)}
          style={{ ...baseStyle, minHeight: 'clamp(180px, 34vh, 300px)', resize: 'vertical', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.5 }}
        />
      ) : (
        <>
          <textarea
            dir="auto"
            placeholder="Front (question)"
            value={front}
            onChange={e => setFront(e.target.value)}
            style={{ ...baseStyle, minHeight: 90, resize: 'vertical' }}
          />
          <textarea
            dir="auto"
            placeholder="Back (answer)"
            value={back}
            onChange={e => setBack(e.target.value)}
            style={{ ...baseStyle, minHeight: 90, resize: 'vertical' }}
          />
        </>
      )}
    </AdminFormCard>
  )

  const searchTerm = search.trim()

  const list = (
    <div>
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <input
          placeholder="Search flashcards..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...baseStyle, marginBottom: 0, paddingLeft: 34 }}
        />
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <SearchIcon2 color={pt.faint} size={14} />
        </span>
      </div>

      <AdminGroupedList
        dark={dark}
        modules={modules}
        items={flashcards}
        moduleOf={c => c.module_id}
        loading={loading}
        error={error}
        noun="flashcards"
        limitNote={`Showing the most recent ${LIST_LIMIT}${searchTerm ? ' matches' : ' — use search to find older cards'}.`}
        emptyMessage={searchTerm
          ? <><SearchIcon2 color={pt.sub} size={14} /> No flashcards match your search</>
          : <><ConstructionIcon color={pt.sub} size={14} /> No flashcards yet — add some on the left</>}
        renderItem={c => (
          <AdminRow
            key={c.id}
            dark={dark}
            noun="flashcard"
            label={c.front}
            active={editingId === c.id}
            onEdit={() => editCard(c)}
            onDelete={() => del.requestDelete(c.id)}
          >
            <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p dir="auto" style={{
                color: pt.text, fontWeight: 600, fontSize: 13, lineHeight: 1.45, margin: 0,
                wordBreak: 'break-word', overflowWrap: 'anywhere',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>{c.front}</p>
              <span style={{ color: pt.textMuted, fontSize: 11 }}>{lessonTitle(c.lesson_id)}</span>
            </div>
          </AdminRow>
        )}
      />
    </div>
  )

  return (
    <div>
      <InlineMessage message={message} />
      <AdminSplitLayout form={form} list={list} />
      <AdminDeleteDialog dark={dark} noun="flashcard" del={del} />
    </div>
  )
}
