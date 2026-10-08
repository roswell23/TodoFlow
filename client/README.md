# TodoFlow — Web Client

The frontend for **TodoFlow**, a high-performance single-page task management application built with **React 19**, **Vite 8**, and **Vanilla CSS**.

For the complete project documentation, system architecture, and API specifications, see the [Root README](../README.md).

---

## 🛠️ Tech Stack & Highlights

- **React 19**: Declarative UI leveraging hooks and context providers (`AuthContext`, `ThemeContext`).
- **Vite 8**: Ultra-fast hot module replacement (HMR) and optimized rollup production bundles.
- **Pure CSS Variables**: Lightweight custom design system supporting seamless light/dark/system theme switching with zero flash of unstyled content (FOUC).
- **Native History Routing**: Zero-dependency router utilizing the HTML5 History API (`window.history.pushState` and `popstate`) for lightweight client-side navigation.
- **Oxlint**: Fast Rust-based linter enforcing clean code standards.

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Base API endpoint | Automatically resolves to `http://localhost:4000/api` on local development |

### 3. Run development server
```bash
npm run dev
```
Access the application at `http://localhost:5173`.

---

## 📜 Available Scripts

| Command | Action |
|---|---|
| `npm run dev` | Starts the Vite dev server with instant HMR |
| `npm run build` | Builds the production bundle into `dist/` |
| `npm run lint` | Runs Oxlint to inspect code quality |
| `npm run preview` | Locally previews the production build |

---

## 📁 Source Layout

```text
src/
├── assets/          # Static assets and icons
├── components/      # Modular UI components (Navbar, TodoItem, ThemeToggle, AdminLayout)
├── context/         # AuthContext and ThemeContext state providers
├── pages/           # Application views (Dashboard, Login, Signup, admin/*)
├── services/        # Fetch service adapters (authService, todoService, adminService)
├── App.jsx          # Client router and route guards
├── index.css        # Design tokens and responsive styles
└── main.jsx         # App mounting point with providers
```
