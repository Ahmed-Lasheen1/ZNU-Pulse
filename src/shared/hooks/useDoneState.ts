import { useState } from 'react'
import { storageGetSet, storageSetJson } from '@/core/safeStorage'

interface DoneStore {
  key: string
  manual: Set<string>
  unticked: Set<string>
}

// Reads the hand-ticked and unticked ids saved under a storage key.
function readStore(key: string): DoneStore {
  return { key, manual: storageGetSet(key), unticked: storageGetSet(`${key}_unticked`) }
}

// Done = ticked by hand or completed by study, unless the student unticked it. Choices are saved on this device.
export function useDoneState(storageKey: string, autoDone: ReadonlySet<string>) {
  const [store, setStore] = useState(() => readStore(storageKey))

  // Reloads the saved choices when the key changes (for example another module).
  if (store.key !== storageKey) setStore(readStore(storageKey))

  // True when the item counts as done.
  function isDone(id: string) {
    return (store.manual.has(id) || autoDone.has(id)) && !store.unticked.has(id)
  }

  // Ticks or unticks an item; unticking a study-completed item is remembered so it stays unticked.
  function toggle(id: string) {
    const manual = new Set(store.manual)
    const unticked = new Set(store.unticked)
    if (isDone(id)) {
      manual.delete(id)
      if (autoDone.has(id)) unticked.add(id)
    } else {
      unticked.delete(id)
      manual.add(id)
    }
    storageSetJson(storageKey, [...manual])
    storageSetJson(`${storageKey}_unticked`, [...unticked])
    setStore({ key: storageKey, manual, unticked })
  }

  return { isDone, toggle }
}
