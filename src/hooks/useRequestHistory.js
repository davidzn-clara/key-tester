import { useState } from 'react'

export function useRequestHistory() {
  const [history, setHistory] = useState([])

  const addEntry = (entry) => {
    setHistory((prev) => [entry, ...prev].slice(0, 20))
  }

  return { history, addEntry }
}
