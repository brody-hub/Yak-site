import * as React from "react"
import { Link } from "react-router-dom"
import { KeyRoundIcon, PlusIcon, RefreshCwIcon } from "lucide-react"
import { toast } from "sonner"

import {
  ApiKeySecretDialog,
  type ApiKeySecretDetails,
} from "@/components/api-key-secret-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ApiError,
  apiKeysApi,
  type ApiKeySummary,
} from "@/lib/api"
import { formatDateTime } from "@/lib/kpis"

type ScopeOption = { id: string; description: string }

export function IntegrationsPage() {
  const [keys, setKeys] = React.useState<ApiKeySummary[]>([])
  const [scopes, setScopes] = React.useState<ScopeOption[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [createOpen, setCreateOpen] = React.useState(false)
  const [secretDetails, setSecretDetails] =
    React.useState<ApiKeySecretDetails | null>(null)
  const [secretOpen, setSecretOpen] = React.useState(false)
  const [busyId, setBusyId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [nextKeys, nextScopes] = await Promise.all([
        apiKeysApi.list(),
        apiKeysApi.scopes(),
      ])
      setKeys(nextKeys)
      setScopes(nextScopes)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load API keys"
      )
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const activeKeys = keys.filter((key) => !key.revokedAt)

  const showSecret = (details: ApiKeySecretDetails) => {
    setSecretDetails(details)
    setSecretOpen(true)
  }

  const handleCreated = (key: ApiKeySummary, secret: string) => {
    setKeys((current) => [key, ...current])
    showSecret({ name: key.name, secret, mode: "created" })
  }

  const rotateKey = async (key: ApiKeySummary) => {
    const confirmed = window.confirm(
      `Rotate “${key.name}”? A new secret will be created and the current key will stop working immediately.`
    )

    if (!confirmed) {
      return
    }

    setBusyId(key.id)

    try {
      const { key: created, secret } = await apiKeysApi.create({
        name: key.name,
        scopes: key.scopes,
      })
      await apiKeysApi.revoke(key.id)
      await load()
      showSecret({
        name: created.name,
        secret,
        mode: "rotated",
      })
      toast.success("API key rotated")
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not rotate API key"
      )
    } finally {
      setBusyId(null)
    }
  }

  const revokeKey = async (key: ApiKeySummary) => {
    const confirmed = window.confirm(
      `Revoke “${key.name}”? Integrations using this key will fail until you create a new one.`
    )

    if (!confirmed) {
      return
    }

    setBusyId(key.id)

    try {
      await apiKeysApi.revoke(key.id)
      await load()
      toast.success("API key revoked")
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not revoke API key"
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div className="space-y-1.5">
              <CardTitle>Integrations</CardTitle>
              <CardDescription>
                Generate API keys for your app to send reports, events, and user
                sync into Stand. See{" "}
                <Link
                  to="/settings/documentation"
                  className="text-foreground underline underline-offset-4"
                >
                  Documentation
                </Link>{" "}
                for request examples.
              </CardDescription>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              Create key
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Prefix</TableHead>
                    <TableHead>Scopes</TableHead>
                    <TableHead>Last used</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-8" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : error ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-destructive py-8 text-center"
                      >
                        {error}
                      </TableCell>
                    </TableRow>
                  ) : activeKeys.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center">
                        <div className="text-muted-foreground flex flex-col items-center gap-2">
                          <KeyRoundIcon className="size-5" />
                          <p className="text-sm">No active API keys yet.</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCreateOpen(true)}
                          >
                            Create your first key
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeKeys.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell className="font-medium">{key.name}</TableCell>
                        <TableCell>
                          <code className="text-muted-foreground font-mono text-xs">
                            {key.prefix}…
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {key.scopes.map((scope) => (
                              <Badge key={scope} variant="secondary">
                                {scope}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {key.lastUsedAt
                            ? formatDateTime(key.lastUsedAt)
                            : "Never"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDateTime(key.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busyId === key.id}
                              onClick={() => void rotateKey(key)}
                            >
                              <RefreshCwIcon />
                              Rotate
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={busyId === key.id}
                              onClick={() => void revokeKey(key)}
                            >
                              Revoke
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <CreateApiKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        scopes={scopes}
        onCreated={handleCreated}
      />

      <ApiKeySecretDialog
        open={secretOpen}
        onOpenChange={setSecretOpen}
        details={secretDetails}
      />
    </div>
  )
}

function CreateApiKeyDialog({
  open,
  onOpenChange,
  scopes,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  scopes: ScopeOption[]
  onCreated: (key: ApiKeySummary, secret: string) => void
}) {
  const [name, setName] = React.useState("")
  const [selectedScopes, setSelectedScopes] = React.useState<string[]>([])
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setName("")
      setSelectedScopes([])
      setSaving(false)
      return
    }

    // Default to every known scope so a new integration can file reports and sync.
    if (scopes.length > 0) {
      setSelectedScopes(scopes.map((scope) => scope.id))
    }
  }, [open, scopes])

  const toggleScope = (scopeId: string, checked: boolean) => {
    setSelectedScopes((current) =>
      checked
        ? [...current, scopeId]
        : current.filter((id) => id !== scopeId)
    )
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()

    const trimmed = name.trim()
    if (!trimmed) {
      toast.error("Name is required")
      return
    }

    if (selectedScopes.length === 0) {
      toast.error("Select at least one scope")
      return
    }

    setSaving(true)

    try {
      const { key, secret } = await apiKeysApi.create({
        name: trimmed,
        scopes: selectedScopes,
      })

      if (!secret) {
        throw new Error("Server did not return the API key secret")
      }

      onOpenChange(false)
      onCreated(key, secret)
      toast.success("API key created")
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not create API key"
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={(event) => void submit(event)}>
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>
              Name the connection and choose which ingest scopes it can use.
              The secret is shown once after creation.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key-name">Name</Label>
              <Input
                id="api-key-name"
                placeholder="Production app"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Scopes</Label>
              <div className="space-y-2 rounded-xl border p-3">
                {scopes.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Loading scopes…
                  </p>
                ) : (
                  scopes.map((scope) => {
                    const checked = selectedScopes.includes(scope.id)

                    return (
                      <label
                        key={scope.id}
                        className="hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-lg p-2"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) =>
                            toggleScope(scope.id, value === true)
                          }
                          className="mt-0.5"
                        />
                        <span className="space-y-0.5">
                          <span className="block font-mono text-sm">
                            {scope.id}
                          </span>
                          <span className="text-muted-foreground block text-xs">
                            {scope.description}
                          </span>
                        </span>
                      </label>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create key"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
