import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import { useBranding } from "@/components/branding-provider"
import { cn } from "@/lib/utils"

/**
 * The centered card layout of the screens before sign in: login, sign up,
 * email confirmation. The brand links back to the landing page.
 */
export function AuthShell({
  children,
  subtitle = "Admin panel",
  wide = false,
}: {
  children: ReactNode
  subtitle?: string
  wide?: boolean
}) {
  const branding = useBranding()

  return (
    <div className="bg-muted/40 flex min-h-svh items-center justify-center p-6">
      <div className={cn("w-full", wide ? "max-w-3xl" : "max-w-sm")}>
        <Link
          to="/"
          className="mb-6 flex flex-col items-center gap-3 text-center"
        >
          {branding.logo ? (
            <img
              src={branding.logo}
              alt={branding.name}
              className="size-12 rounded-lg object-contain"
            />
          ) : null}
          <div>
            <h1 className="text-xl font-semibold">{branding.name}</h1>
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          </div>
        </Link>

        {children}
      </div>
    </div>
  )
}
