import openColor from "open-color"

export const OPEN_COLOR_SHADE = 5

export type OpenColorName =
  | "gray"
  | "red"
  | "pink"
  | "grape"
  | "violet"
  | "indigo"
  | "blue"
  | "cyan"
  | "teal"
  | "green"
  | "lime"
  | "yellow"
  | "orange"

export type PrimaryColorTile = {
  id: OpenColorName
  label: string
  hex: string
}

const OPEN_COLOR_NAMES: OpenColorName[] = [
  "gray",
  "red",
  "pink",
  "grape",
  "violet",
  "indigo",
  "blue",
  "cyan",
  "teal",
  "green",
  "lime",
  "yellow",
  "orange",
]

export const PRIMARY_COLOR_TILES: PrimaryColorTile[] = OPEN_COLOR_NAMES.map(
  (name) => ({
    id: name,
    label: name.charAt(0).toUpperCase() + name.slice(1),
    hex: openColor[name][OPEN_COLOR_SHADE]!,
  })
)

export const DEFAULT_PRIMARY_HEX = openColor.blue[OPEN_COLOR_SHADE]!

const HEX_PATTERN = /^#([0-9a-fA-F]{6})$/

export function isHexColor(value: string | null): value is string {
  return typeof value === "string" && HEX_PATTERN.test(value)
}

export function normalizeHex(value: string): string | null {
  const trimmed = value.trim()
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`

  if (/^#[0-9a-fA-F]{3}$/.test(withHash)) {
    const [, r, g, b] = withHash
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }

  if (isHexColor(withHash)) {
    return withHash.toLowerCase()
  }

  return null
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "")
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  }
}

function getContrastForeground(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? "#212529" : "#ffffff"
}

export function getTileForHex(hex: string): PrimaryColorTile | undefined {
  const normalized = normalizeHex(hex)
  if (!normalized) {
    return undefined
  }

  return PRIMARY_COLOR_TILES.find((tile) => tile.hex.toLowerCase() === normalized)
}

export function applyPrimaryColor(hex: string) {
  const normalized = normalizeHex(hex) ?? DEFAULT_PRIMARY_HEX
  const foreground = getContrastForeground(normalized)
  const root = document.documentElement

  root.dataset.primary = normalized
  root.style.setProperty("--primary", normalized)
  root.style.setProperty("--primary-foreground", foreground)
  root.style.setProperty("--ring", normalized)
  root.style.setProperty("--sidebar-primary", normalized)
  root.style.setProperty("--sidebar-primary-foreground", foreground)
  root.style.setProperty("--sidebar-ring", normalized)
}
