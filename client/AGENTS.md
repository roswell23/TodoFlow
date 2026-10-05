# Client — TodoFlow web

React 19 + Vite 8 SPA. No router or state library — plain hooks + History API.
**Token budget: keep this file ≤ ~100 lines.** Facts + pointers only — never paste code or JSX here; link to the file instead.

## Commands (run in `client/`)
| Task | Command |
|---|---|
| Dev server | `npm run dev` (port 5173) |
| Build | `npm run build` |
| Lint (oxlint) | `npm run lint` — must pass before hand-off |
| Preview build | `npm run preview` |

## Layout
```
src/main.jsx          providers: ThemeProvider → AuthProvider → App
src/App.jsx           manual router: /login, /signup, /dashboard (default /login)
src/pages/            Login, Signup, Dashboard (the whole app UI, ~760 lines)
src/components/       Navbar, ProtectedRoute, TodoItem, ThemeToggle, Loading
src/context/          AuthContext (user, loading, login, logout), ThemeContext
src/services/         authService, todoService — ALL fetch calls live here
src/index.css         single stylesheet; CSS variables drive light/dark/system theme
index.html            theme flash guard (reads `todoflow-theme` before React boots)
```

## Environment
`VITE_API_URL` (optional). Fallbacks: `http://localhost:4000/api` on localhost, else `https://todoflow-ymps.onrender.com/api`.

## Data flow
page → `src/services/*` → `fetch(API_URL)` → server. Never call `fetch` outside services.
Storage keys: `todoflow_token` (JWT), `todoflow-theme`.
Server contract lives in `../server/AGENTS.md` — keep both in sync when an endpoint changes.

## Conventions
1. Redirects happen in `useEffect` + `navigate()`, never during render (StrictMode double-invokes render).
2. One default export per file; pages own state, components take props (`TodoItem`: `onToggle`, `onUpdate`, `onDelete`).
3. Auth gate is `ProtectedRoute`; auth state comes only from `useAuth()`.
4. Styling: reuse existing classes/`var(--*)` tokens in `index.css`. No new dependencies, no emoji — inline SVG icons.
5. Client title cap is 160 chars (server allows 200) — keep both when changing limits.
6. `Dashboard.jsx` holds list/filter/stats state; extract presentational bits into `components/` instead of growing it.

## Update this file when
routing, services, env vars, storage keys, or the conventions above change.
