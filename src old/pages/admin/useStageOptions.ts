import { useState, useEffect } from 'react'
import { fetchModuleStages } from '../../lib/moduleStages'

export interface StageOption {
  value: string
  label: string
  color: string
}

export function useStageOptions(moduleId: string) {
  const [options, setOptions] = useState<StageOption[]>([])

  useEffect(() => {
    let ignore = false
    fetchModuleStages(moduleId).then(list => {
      if (!ignore) setOptions(list.map((s: any) => ({ value: s.value, label: s.title, color: s.color })))
    })
    return () => { ignore = true }
  }, [moduleId])

  return options
}
