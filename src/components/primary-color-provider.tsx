/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

import {
  applyPrimaryColor,
  DEFAULT_PRIMARY_HEX,
  isHexColor,
  normalizeHex,
} from "@/lib/primary-colors"
import { fetchAppConfig, settingsApi } from "@/lib/api"

type PrimaryColorProviderProps = {
  children: React.ReactNode
  defaultPrimaryColor?: string
  storageKey?: string
}

type PrimaryColorProviderState = {
  primaryColor: string
  /** Applies immediately; persists to the server when `persist` is set. */
  setPrimaryColor: (color: string, options?: { persist?: boolean }) => void
}

const PrimaryColorContext = React.createContext<
  PrimaryColorProviderState | undefined
>(undefined)

export function PrimaryColorProvider({
  children,
  defaultPrimaryColor = DEFAULT_PRIMARY_HEX,
  storageKey = "primary-color",
}: PrimaryColorProviderProps) {
  const [primaryColor, setPrimaryColorState] = React.useState(() => {
    const stored = localStorage.getItem(storageKey)
    if (isHexColor(stored)) {
      return stored.toLowerCase()
    }

    return normalizeHex(defaultPrimaryColor) ?? DEFAULT_PRIMARY_HEX
  })

  // The stored value is only a cache for instant paint; the server is the
  // source of truth once it answers.
  React.useEffect(() => {
    let cancelled = false

    fetchAppConfig()
      .then((config) => {
        const normalized = normalizeHex(config.branding.primaryColor)

        if (!cancelled && normalized) {
          localStorage.setItem(storageKey, normalized)
          setPrimaryColorState(normalized)
        }
      })
      .catch(() => {
        // Keep whatever was cached locally.
      })

    return () => {
      cancelled = true
    }
  }, [storageKey])

  const setPrimaryColor = React.useCallback(
    (nextColor: string, options?: { persist?: boolean }) => {
      const normalized = normalizeHex(nextColor)
      if (!normalized) {
        return
      }

      localStorage.setItem(storageKey, normalized)
      setPrimaryColorState(normalized)

      if (options?.persist) {
        // Dragging the picker fires constantly, so callers persist on commit.
        void settingsApi
          .updateTheme({ primaryColor: normalized })
          .catch(() => undefined)
      }
    },
    [storageKey]
  )

  React.useEffect(() => {
    applyPrimaryColor(primaryColor)
  }, [primaryColor])

  React.useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.storageArea !== localStorage || event.key !== storageKey) {
        return
      }

      if (isHexColor(event.newValue)) {
        setPrimaryColorState(event.newValue.toLowerCase())
        return
      }

      setPrimaryColorState(
        normalizeHex(defaultPrimaryColor) ?? DEFAULT_PRIMARY_HEX
      )
    }

    window.addEventListener("storage", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [defaultPrimaryColor, storageKey])

  const value = React.useMemo(
    () => ({
      primaryColor,
      setPrimaryColor,
    }),
    [primaryColor, setPrimaryColor]
  )

  return (
    <PrimaryColorContext.Provider value={value}>
      {children}
    </PrimaryColorContext.Provider>
  )
}

export function usePrimaryColor() {
  const context = React.useContext(PrimaryColorContext)

  if (context === undefined) {
    throw new Error(
      "usePrimaryColor must be used within a PrimaryColorProvider"
    )
  }

  return context
}
