import { supabase } from '../supabase'
import { idbGet, idbSet } from './idb'
import { isTransientFailure } from './offlineAttempts'

const keyFor = userId => `outbox:checklist:${userId}`
const listeners = new Set()
const notify = () => listeners.forEach(listener => listener())

let storeChain = Promise.resolve()
let flushChain = Promise.resolve()

export function subscribeChecklistOutbox(listener) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export async function listChecklistOps(userId) {
  return (await idbGet(keyFor(userId))) || []
}

function update(userId, change) {
  const run = storeChain.then(async () => {
    const next = change(await listChecklistOps(userId))
    await idbSet(keyFor(userId), next)
    return next
  })
  storeChain = run.catch(() => {})
  return run
}

function execute(userId, op) {
  const table = supabase.from('user_checklist')
  if (op.type === 'add') {
    const { id, module_id, text, done, deadline } = op.task
    return table.upsert(
      { id, user_id: userId, module_id, text, done, deadline },
      { onConflict: 'id', ignoreDuplicates: true }
    )
  }
  if (op.type === 'toggle') return table.update({ done: op.done }).eq('id', op.id)
  return table.delete().eq('id', op.id)
}

const shouldRetry = response => isTransientFailure(response) || response.status === 401

export function flushChecklistOutbox(userId) {
  const run = flushChain.then(async () => {
    const ops = await listChecklistOps(userId)
    if (ops.length === 0 || !navigator.onLine) return { synced: 0, rejected: [], pending: ops.length }

    const finished = new Set()
    const rejected = []
    let synced = 0

    for (const op of ops) {
      let response
      try {
        response = await execute(userId, op)
      } catch {
        response = { error: true, status: 0 }
      }
      if (!response.error) {
        synced++
        finished.add(op.opId)
      } else if (shouldRetry(response)) {
        break
      } else {
        rejected.push({ op, message: response.error.message })
        finished.add(op.opId)
      }
    }

    const left = await update(userId, list => list.filter(op => !finished.has(op.opId)))
    if (synced > 0 || rejected.length > 0) notify()
    return { synced, rejected, pending: left.length }
  })
  flushChain = run.catch(() => {})
  return run
}

export async function queueChecklistOp(userId, op) {
  await update(userId, list => [...list, { ...op, opId: crypto.randomUUID() }])
  return flushChecklistOutbox(userId)
}

export function applyChecklistOps(list, ops, moduleId) {
  let result = list
  for (const op of ops) {
    if (op.type === 'add') {
      if (op.task.module_id === moduleId && !result.some(t => t.id === op.task.id)) result = [...result, op.task]
    } else if (op.type === 'toggle') {
      result = result.map(t => (t.id === op.id ? { ...t, done: op.done } : t))
    } else {
      result = result.filter(t => t.id !== op.id)
    }
  }
  return result
}
