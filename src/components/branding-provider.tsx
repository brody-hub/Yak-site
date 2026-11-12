/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

import { brandingApi, fetchAppConfig, settingsApi, uploadsApi } from "@/lib/api"

const NAME_STORAGE_KEY = "brand-name"
const LOGO_STORAGE_KEY = "brand-logo"
const DEFAULT_NAME = "Yak"

/**
 * Whose brand to show. Signed-out visitors and super admins see the product's
 * own brand; a tenant user sees their workspace's.
 */
export type BrandingSession = "public" | "tenant"

type ServerBranding = {
  brandName: string
  logoUrl: string | null
  primaryColor: string
}
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
  /**
   * Loads the brand for the current session. Called by BrandingSync whenever
   * the signed-in user changes. Resolves with the brand's primary colour.
   */
  loadFor: (session: BrandingSession) => Promise<string | null>
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
 * first so the login screen is never briefly unbranded on a cold load. Which
 * brand to fetch depends on who is signed in, so loading is driven from inside
 * the auth provider by BrandingSync.
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

  // Only the latest request may apply, so a slow config response cannot paint
  // the product brand over a tenant brand that arrived first.
  const loadSeq = React.useRef(0)

  const loadFor = React.useCallback(
    async (session: BrandingSession) => {
      const seq = ++loadSeq.current

      try {
        const branding: ServerBranding =
          session === "tenant"
            ? await brandingApi.get()
            : (await fetchAppConfig()).branding

        if (seq !== loadSeq.current) {
          return null
        }

        applyBranding(branding)
        return branding.primaryColor
      } catch {
        // Offline or the API is down. The cached values stay in place.
        return null
      } finally {
        if (seq === loadSeq.current) {
          setLoading(false)
        }
      }
    },
    [applyBranding]
  )

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
    () => ({ name, logo, loading, setName, uploadLogo, removeLogo, loadFor }),
    [name, logo, loading, setName, uploadLogo, removeLogo, loadFor]
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
