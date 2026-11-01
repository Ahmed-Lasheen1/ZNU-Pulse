import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../supabase'
import { LIST_LIMIT } from './adminStyles'

interface UseAdminListArgs {
  table: string
  moduleId: string
  select?: string
  search?: { column: string; term: string }
}

function escapeLikePattern(value: string) {
  return value.replace(/[%_\\]/g, '\\$&')
}

export function useAdminList<T>({ table, moduleId, select = '*', search }: UseAdminListArgs) {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const requestIdRef = useRef(0)
  const term = search?.term.trim() || ''
  const column = search?.column

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(false)
    let query = supabase.from(table).select(select).order('created_at', { ascending: false }).limit(LIST_LIMIT)
    if (moduleId) query = query.eq('module_id', moduleId)
    if (term && column) query = query.ilike(column, `%${escapeLikePattern(term)}%`)
    const { data, error: queryError } = await query
    if (requestId !== requestIdRef.current) return
    if (data) setRows(data as T[])
    setError(!!queryError)
    setLoading(false)
  }, [table, select, moduleId, term, column])

  useEffect(() => {
    const timer = setTimeout(refresh, term ? 300 : 0)
    return () => clearTimeout(timer)
  }, [refresh, term])

  return { rows, loading, error, refresh }
}
