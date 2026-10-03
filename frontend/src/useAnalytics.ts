import { useEffect, useState } from 'react'

export type AnalyticsState<T> = {
  data: T | null
  error: string | null
  loading: boolean
}

/** Loads one analytics payload; keeps the previous data visible while refetching. */
export function useAnalytics<T>(load: () => Promise<T>, key: string): AnalyticsState<T> {
  const [state, setState] = useState<AnalyticsState<T>>({
    data: null,
    error: null,
    loading: true,
  })

  useEffect(() => {
    let cancelled = false
    setState((prev) => ({ ...prev, loading: true }))
    load()
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setState({
          data: null,
          error: err instanceof Error ? err.message : 'Failed to load analytics',
          loading: false,
        })
      })
    return () => {
      cancelled = true
    }
    // `key` captures every input of `load`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state
}
