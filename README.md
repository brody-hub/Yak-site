# Stand admin panel

React + TypeScript + Vite front end for the Stand admin panel. It is a pure
client: every piece of data comes from a `yak-server` deployment over its JSON
API, and the session lives in a cross-site cookie issued by that server.

## Running locally

```bash
npm install
cp .env.example .env
npm run dev
```

`VITE_API_URL` must point at the backend. It defaults to
`http://localhost:8080`, which is where `yak-server` listens in development.

You need a running backend with at least one account before you can sign in.
In the `yak-server` checkout:

```bash
npm run db:migrate
npm run create:owner
npm run dev
```

## Scripts

| Script              | Purpose                                  |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Vite dev server                          |
| `npm run build`     | Type check and produce a production build |
| `npm run typecheck` | Type check only                          |
| `npm run lint`      | ESLint                                   |
| `npm run format`    | Prettier                                 |

## How auth works

- Access is invite only. There is no sign-up screen; an owner or admin invites
  people from **Settings → User management**.
- Invited accounts get a temporary password and are held on the
  change-password screen until they choose their own.
- `AuthProvider` (`src/components/auth-provider.tsx`) owns the session.
  `RequireAuth` and `RequirePermission` (`src/components/route-guards.tsx`)
  guard the routes, and the sidebar hides sections the user cannot open.
- Permissions are enforced again on the server, so hiding a link is a
  convenience rather than the security boundary.

## Data flow

`src/lib/api.ts` is the single place that talks to the backend. Everything else
goes through a provider that wraps it:

| Provider                   | Backing endpoints                    |
| -------------------------- | ------------------------------------ |
| `AuthProvider`             | `/api/auth/*`, `/api/me`             |
| `SystemUsersProvider`      | `/api/system-users`, `/api/activity` |
| `TasksProvider`            | `/api/tasks/*`                       |
| `DiscordWebhooksProvider`  | `/api/discord`                       |
| `BrandingProvider`         | `/api/config`, `/api/settings/theme` |

Reports, analytics, and app-user search query the API directly from their
pages, because their filters map onto server-side queries.

Dashboard and KPIs still render demo data on purpose; they are not wired to the
backend yet.

## Adding components

```bash
npx shadcn@latest add button
```

Components land in `src/components/ui`.
