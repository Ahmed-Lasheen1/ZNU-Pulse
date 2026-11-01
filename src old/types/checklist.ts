export interface ChecklistTask {
  id: string
  text: string
  done: boolean
  module_id: string
  deadline: string | null
}
