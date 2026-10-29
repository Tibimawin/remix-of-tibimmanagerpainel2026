# Project Notes

- The Vercel main deployment `https://tibimmanagerpainel2026.vercel.app` is disabled (HTTP 402 DEPLOYMENT_DISABLED, Vercel budget exhausted). All client proxies (`/api/asaas-proxy`, `/api/baserow-proxy`, `/api/public-api`) must default to the working alias `https://tibimmanagerpainel2026-git-main-apktibim-1235s-projects.vercel.app` (see `src/config/proxyConfig.ts`). Keep one shared base; never reintroduce the disabled domain.
- In React components, never place a `useEffect`/`useMemo` that references a `const` declared later in the same function body (its dependency array is evaluated during render and throws a TDZ "Cannot access ... before initialization"). Declare hooks in dependency order (fixed in `src/pages/GeradorM3U.tsx`).
- `src/services/SecurityGuard.ts` runs capture-phase global keydown/contextmenu handlers; any property read there (e.g. `navigator.platform`, `e.key`) must be null-safe because synthetic events and newer browsers can return undefined.
