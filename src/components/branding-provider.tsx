/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

import { fetchAppConfig, settingsApi, uploadsApi } from "@/lib/api"

const NAME_STORAGE_KEY = "brand-name"
const LOGO_STORAGE_KEY = "brand-logo"
const DEFAULT_NAME = "Stand"
const DEFAULT_FAVICON = "/vite.svg"

type BrandingProviderProps = {
  children: React.ReactNode
}

type BrandingProviderState = {
  name: string
  logo: string | null
  /** True until the first response from the server arrives. */
  loading: boolean
  setName: (name: string) => Promise<void>
  uploadLogo: (file: File) => Promise<void>
  removeLogo: () => Promise<void>
}

const BrandingContext = React.createContext<BrandingProviderState | undefined>(
  undefined
)

function applyFavicon(href: string) {
  const head = document.head
  let link = head.querySelector<HTMLLinkElement>("link[rel='icon']")

  if (!link) {
    link = document.createElement("link")
    link.rel = "icon"
    head.appendChild(link)
  }

  if (href.startsWith("data:")) {
    const mime = href.slice(5, href.indexOf(";"))
    link.type = mime || "image/png"
  } else if (href.endsWith(".svg")) {
    link.type = "image/svg+xml"
  } else {
    link.removeAttribute("type")
  }

  link.href = href
}

/**
 * Branding lives on the server, but the cached copy in localStorage is painted
 * first so the login screen is never briefly unbranded on a cold load.
 */
export function BrandingProvider({ children }: BrandingProviderProps) {
  const [name, setNameState] = React.useState(
    () => localStorage.getItem(NAME_STORAGE_KEY) || DEFAULT_NAME
  )
  const [logo, setLogoState] = React.useState<string | null>(() =>
    localStorage.getItem(LOGO_STORAGE_KEY)
  )
  const [loading, setLoading] = React.useState(true)

  const applyBranding = React.useCallback(
    (next: { brandName: string; logoUrl: string | null }) => {
      setNameState(next.brandName)
      setLogoState(next.logoUrl)
      localStorage.setItem(NAME_STORAGE_KEY, next.brandName)

      if (next.logoUrl) {
        localStorage.setItem(LOGO_STORAGE_KEY, next.logoUrl)
      } else {
        localStorage.removeItem(LOGO_STORAGE_KEY)
      }
    },
    []
  )

  // Branding comes from the unauthenticated config endpoint so it is available
  // on the login screen too.
  React.useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const config = await fetchAppConfig()

        if (!cancelled) {
          applyBranding(config.branding)
        }
      } catch {
        // Offline or the API is down. The cached values stay in place.
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [applyBranding])

  const setName = React.useCallback(
    async (nextName: string) => {
      const trimmed = nextName.trim() || DEFAULT_NAME
      const settings = await settingsApi.updateTheme({ brandName: trimmed })
      applyBranding({
        brandName: settings.brandName,
        logoUrl: settings.logoUrl,
      })
    },
    [applyBranding]
  )

  const uploadLogo = React.useCallback(
    async (file: File) => {
      const imageId = await uploadsApi.uploadImage(file, "branding")
      const settings = await settingsApi.updateTheme({ logoImageId: imageId })
      applyBranding({
        brandName: settings.brandName,
        logoUrl: settings.logoUrl,
      })
    },
    [applyBranding]
  )

  const removeLogo = React.useCallback(async () => {
    const settings = await settingsApi.updateTheme({ logoImageId: null })
    applyBranding({ brandName: settings.brandName, logoUrl: settings.logoUrl })
  }, [applyBranding])

  React.useEffect(() => {
    document.title = name
  }, [name])

  React.useEffect(() => {
    applyFavicon(logo || DEFAULT_FAVICON)
  }, [logo])

  const value = React.useMemo(
    () => ({ name, logo, loading, setName, uploadLogo, removeLogo }),
    [name, logo, loading, setName, uploadLogo, removeLogo]
  )

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding() {
  const context = React.useContext(BrandingContext)

  if (context === undefined) {
    throw new Error("useBranding must be used within a BrandingProvider")
  }

  return context
}
