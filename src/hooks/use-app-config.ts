import * as React from "react"

import { type AppConfig, fetchAppConfig } from "@/lib/api"

/**
 * The public config (/api/config) for screens shown before sign in. Null
 * while loading, and when the server cannot be reached.
 */
export function useAppConfig() {
  const [config, setConfig] = React.useState<AppConfig | null>(null)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false

    fetchAppConfig()
      .then((result) => {
        if (!cancelled) {
          setConfig(result)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { config, failed }
}
