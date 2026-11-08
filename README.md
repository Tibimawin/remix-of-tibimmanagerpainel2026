# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/e0987bc5-6d82-4aff-9259-9d3b410cfea1

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/e0987bc5-6d82-4aff-9259-9d3b410cfea1) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/e0987bc5-6d82-4aff-9259-9d3b410cfea1) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Running the panel in another environment (AI Studio, Vercel, local)

The panel already ships with default values for Firebase and the Vercel proxy
(`src/config/firebase.ts` and `src/config/proxyConfig.ts`), so it runs without any
`.env`. To point it at a different backend, follow the steps below.

### 1. Create the `.env` file

```sh
cp .env.example .env
```

`.env.example` documents every variable, which ones are required vs. optional,
and where each value comes from.

### 2. Fill in the variables

**Firebase (public keys, used by the panel)** — see `.lovable/plan.md` for the
current values in use:

```sh
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_DEBUG_ERRORS=false
```

**Vercel proxy** — when the panel runs outside Vercel (AI Studio, Lovable,
local), the serverless routes `/api/*` (baserow-proxy, stream-proxy,
m3u-proxy, asaas-proxy) don't exist on that host. Point
`VITE_VERCEL_PROXY_BASE` at the existing Vercel deploy so the panel keeps
talking to those routes via absolute URLs. On Vercel itself (or a custom
domain hosted on Vercel) this variable is not needed — `/api/*` works
natively.

**Supabase / Lovable Cloud backend** — `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_PROJECT_ID` are managed
by this project. Copy them from the project's `.env` (Files tab). Without
them, screens that rely on the backend (chat, functions, storage) break.

### 3. Install and run locally

```sh
bun install
bun run dev
```

For a production build:

```sh
bun run build
bun run preview
```

### 4. Deploy to Vercel

The same `VITE_*` variables must be set in **Project Settings →
Environment Variables** on Vercel. Remember that Vite injects `VITE_*` at
**build time**: changing a variable requires a new build, not just a restart.

### Fallbacks that already exist

- **Firebase**: hardcoded defaults in `src/config/firebase.ts` for the panel's
  own Firebase project.
- **Proxy**: hardcoded default `VITE_VERCEL_PROXY_BASE` in
  `src/config/proxyConfig.ts` pointing to the panel's Vercel deploy.
- **Persistence**: `authReady` in `src/config/firebase.ts` falls back
  localStorage → sessionStorage → in-memory (Safari ITP / private mode).

No business-logic changes: this is environment configuration and
documentation only.
