import { supabase } from '../supabase'

// Load-and-sort logic shared by App.jsx and Admin.jsx. The query
// itself already orders active-before-completed (alphabetical) and
// created_at descending within each, so no client-side re-sort is needed.
export async function fetchModulesSorted() {
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .order('status')
    .order('created_at', { ascending: false })

  if (error || !data) return { modules: [], error }

  return { modules: data, error: null }
}
