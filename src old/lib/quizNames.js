const MODE_NAMES = {
  practice: 'Practice Mode',
  mock: 'Mock Exam',
  simulator: 'Simulator Exam',
  retry: 'Retry Mode',
}

// "Practice Mode", or "TBL Simulator Exam" when the quiz belongs to a stage.
export function quizName(mode, stageTitle) {
  const base = MODE_NAMES[mode] || MODE_NAMES.practice
  return stageTitle ? `${stageTitle} ${base}` : base
}
