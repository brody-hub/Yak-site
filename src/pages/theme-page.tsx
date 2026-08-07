import * as React from "react"
import { HexColorInput, HexColorPicker } from "react-colorful"
import {
  CheckIcon,
  ImagePlusIcon,
  PipetteIcon,
  Trash2Icon,
} from "lucide-react"

import { toast } from "sonner"

import { useBranding } from "@/components/branding-provider"
import { usePrimaryColor } from "@/components/primary-color-provider"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  getTileForHex,
  OPEN_COLOR_SHADE,
  PRIMARY_COLOR_TILES,
} from "@/lib/primary-colors"
import { cn } from "@/lib/utils"

export function ThemePage() {
  const { primaryColor, setPrimaryColor } = usePrimaryColor()
  const { name, logo, setName, uploadLogo, removeLogo } = useBranding()
  const [draftName, setDraftName] = React.useState(name)
  const [savingName, setSavingName] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const selectedTile = getTileForHex(primaryColor)
  const isCustom = !selectedTile

  React.useEffect(() => {
    setDraftName(name)
  }, [name])

  const saveName = async () => {
    if (draftName.trim() === name) {
      return
    }

    setSavingName(true)

    try {
      await setName(draftName)
      toast.success("Brand name updated")
    } catch {
      setDraftName(name)
      toast.error("Could not save the brand name")
    } finally {
      setSavingName(false)
    }
  }

  const handleLogoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file || !file.type.startsWith("image/")) {
      return
    }

    setUploading(true)

    try {
      await uploadLogo(file)
      toast.success("Logo updated")
    } catch {
      toast.error("Could not upload that image")
    } finally {
      setUploading(false)
    }
  }

  const handleLogoRemove = async () => {
    try {
      await removeLogo()
      toast.success("Logo removed")
    } catch {
      toast.error("Could not remove the logo")
    }
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>
              Set the app name and logo shown in the sidebar and on the sign in
              screen. The logo is also used as the browser favicon.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex size-20 items-center justify-center overflow-hidden rounded-xl border border-dashed bg-muted/30 transition-colors outline-none hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {logo ? (
                      <img
                        src={logo}
                        alt="App logo"
                        className="size-full object-cover"
                      />
                    ) : (
                      <ImagePlusIcon className="size-6 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploading ? "Uploading…" : "Upload image"}
                    </Button>
                    {logo && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleLogoRemove()}
                      >
                        <Trash2Icon />
                        Remove
                      </Button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => void handleLogoUpload(event)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand-name">Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="brand-name"
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    onBlur={() => void saveName()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        void saveName()
                      }
                    }}
                    placeholder="Stand"
                  />
                  <Button
                    type="button"
                    onClick={() => void saveName()}
                    disabled={savingName || draftName.trim() === name}
                  >
                    {savingName ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Primary color</CardTitle>
            <CardDescription>
              Pick an Open Color shade {OPEN_COLOR_SHADE} tile, or choose a
              custom color with the picker.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-7">
              {PRIMARY_COLOR_TILES.map((tile) => {
                const isSelected = selectedTile?.id === tile.id

                return (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={() => setPrimaryColor(tile.hex, { persist: true })}
                    className={cn(
                      "relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "hover:bg-muted/50"
                    )}
                  >
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <CheckIcon className="size-2.5" />
                      </span>
                    )}
                    <span
                      className="size-10 rounded-lg border shadow-sm"
                      style={{ backgroundColor: tile.hex }}
                      aria-hidden
                    />
                    <span className="text-xs font-medium">{tile.label}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {tile.id}
                      {OPEN_COLOR_SHADE}
                    </span>
                  </button>
                )
              })}

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                      isCustom
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "hover:bg-muted/50"
                    )}
                  >
                    {isCustom && (
                      <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <CheckIcon className="size-2.5" />
                      </span>
                    )}
                    <span
                      className="flex size-10 items-center justify-center rounded-lg border shadow-sm"
                      style={{
                        background: isCustom
                          ? primaryColor
                          : "conic-gradient(from 180deg, #ff6b6b, #fcc419, #51cf66, #339af0, #845ef7, #f06595, #ff6b6b)",
                      }}
                    >
                      {!isCustom && (
                        <PipetteIcon className="size-4 text-white drop-shadow" />
                      )}
                    </span>
                    <span className="text-xs font-medium">Custom</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {isCustom ? primaryColor : "picker"}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto space-y-3 p-3"
                  align="start"
                  // Dragging updates the preview continuously; the value is
                  // only written to the server once the popover closes.
                  onCloseAutoFocus={() =>
                    setPrimaryColor(primaryColor, { persist: true })
                  }
                >
                  <HexColorPicker
                    color={primaryColor}
                    onChange={setPrimaryColor}
                    className="!w-56"
                  />
                  <HexColorInput
                    color={primaryColor}
                    onChange={setPrimaryColor}
                    prefixed
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
