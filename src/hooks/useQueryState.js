import { useSearchParams } from 'react-router-dom'

export function useQueryState(defaults) {
  const [params, setParams] = useSearchParams()
  const values = {}
  Object.entries(defaults).forEach(([key, fallback]) => {
    values[key] = params.get(key) ?? fallback
  })

  function setValue(key, value) {
    const next = new URLSearchParams(params)
    if (value == null || value === '' || value === defaults[key]) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  function clear(keys) {
    const next = new URLSearchParams(params)
    keys.forEach((key) => next.delete(key))
    setParams(next, { replace: true })
  }

  return { values, setValue, clear }
}
