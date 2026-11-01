const DB_NAME = 'znu-cache'
const STORE = 'kv'

let dbPromise = null

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = () => request.result.createObjectStore(STORE)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    }).catch(() => null)
  }
  return dbPromise
}

async function run(mode, action) {
  const db = await openDb()
  if (!db) return null
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const request = action(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(request.result)
      tx.onerror = tx.onabort = () => reject(tx.error)
    })
  } catch {
    return null
  }
}

export const idbGet = key => run('readonly', store => store.get(key))
export const idbSet = (key, value) => run('readwrite', store => store.put(value, key))
export const idbDelete = key => run('readwrite', store => store.delete(key))
export const idbKeys = async () => (await run('readonly', store => store.getAllKeys())) ?? []
