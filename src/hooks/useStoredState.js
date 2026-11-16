import { useEffect, useState } from 'react'
import { readJson, writeJson } from '../utils/storage'

export function useStoredState(key, fallback, epoch) {
  const [value, setValue] = useState(() => readJson(key, fallback))
  const [seenEpoch, setSeenEpoch] = useState(epoch)

  if (seenEpoch !== epoch) {
    setSeenEpoch(epoch)
    setValue(readJson(key, fallback))
  }

  useEffect(() => {
    writeJson(key, value)
  }, [key, value])

  return [value, setValue]
}
