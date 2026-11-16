import { useState } from 'react'

export function usePage(filterKey) {
  const [page, setPage] = useState(1)
  const [seen, setSeen] = useState(filterKey)
  if (seen !== filterKey) {
    setSeen(filterKey)
    setPage(1)
  }
  return [page, setPage]
}
