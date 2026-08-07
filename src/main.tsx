import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { BrandingProvider } from "@/components/branding-provider.tsx"
import { PrimaryColorProvider } from "@/components/primary-color-provider.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"

// Providers that fetch authenticated data are mounted inside the route guards
// in App, so they never fire requests from the login screen.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <PrimaryColorProvider>
        <BrandingProvider>
          <App />
        </BrandingProvider>
      </PrimaryColorProvider>
    </ThemeProvider>
  </StrictMode>
)
