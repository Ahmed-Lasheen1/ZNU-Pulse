import { useState, useEffect } from 'react'
import { storageGet, storageSet } from '@/core/safeStorage'

const FONT_SCALES = [0.9, 1, 1.15, 1.3]
// Same key MCQ always used, so students keep their saved size.
const STORAGE_KEY = 'znu_mcq_font_scale'

// Text size shared by the MCQ and flashcards study screens, saved on the device.
export function useStudyFontScale() {
  const [fontScale, setFontScale] = useState<number>(() => {
    const saved = storageGet(STORAGE_KEY)
    const parsed = saved ? parseFloat(saved) : 1
    return FONT_SCALES.includes(parsed) ? parsed : 1
  })

  useEffect(() => { storageSet(STORAGE_KEY, String(fontScale)) }, [fontScale])

  // Cycles through the available text sizes.
  function cycleFontScale() {
    setFontScale(prev => FONT_SCALES[(FONT_SCALES.indexOf(prev) + 1) % FONT_SCALES.length])
  }

  return { fontScale, cycleFontScale }
}
