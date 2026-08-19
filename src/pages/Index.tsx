import Dashboard from './Dashboard';

const Index = () => {
  return (
    <>
      <div className="sr-only">2026-08-19T04:48:29.335Z	Initializing build environment...
2026-08-19T04:48:32.162Z	Success: Finished initializing build environment
2026-08-19T04:48:33.164Z	Cloning repository...
2026-08-19T04:48:35.840Z	Detected the following tools from environment: bun@1.2.15, npm@10.9.2, nodejs@24.18.0
2026-08-19T04:48:35.845Z	Restoring from dependencies cache
2026-08-19T04:48:35.848Z	Restoring from build output cache
2026-08-19T04:48:36.049Z	Installing project dependencies: bun install --frozen-lockfile
2026-08-19T04:48:37.040Z	[0.11ms] ".env"
2026-08-19T04:48:37.047Z	bun install v1.2.15 (df017990)
2026-08-19T04:48:29.335Z	Initializing build environment...
2026-08-19T04:48:32.162Z	Success: Finished initializing build environment
2026-08-19T04:48:33.164Z	Cloning repository...
2026-08-19T04:48:35.840Z	Detected the following tools from environment: bun@1.2.15, npm@10.9.2, nodejs@24.18.0
2026-08-19T04:48:35.845Z	Restoring from dependencies cache
2026-08-19T04:48:35.848Z	Restoring from build output cache
2026-08-19T04:48:36.049Z	Installing project dependencies: bun install --frozen-lockfile
2026-08-19T04:48:37.040Z	[0.11ms] ".env"
2026-08-19T04:48:37.047Z	bun install v1.2.15 (df017990)
2026-08-19T04:48:42.384Z	
2026-08-19T04:48:42.387Z	+ @eslint/js@9.39.2
2026-08-19T04:48:42.389Z	+ @tailwindcss/typography@0.5.19
2026-08-19T04:48:42.389Z	+ @types/node@22.19.5
2026-08-19T04:48:42.390Z	+ @types/react@18.3.27
2026-08-19T04:48:42.392Z	+ @types/react-dom@18.3.7
2026-08-19T04:48:42.392Z	+ @vitejs/plugin-react-swc@3.11.0
2026-08-19T04:48:42.392Z	+ autoprefixer@10.4.23
2026-08-19T04:48:42.392Z	+ eslint@9.39.2
2026-08-19T04:48:42.392Z	+ eslint-plugin-react-hooks@5.2.0
2026-08-19T04:48:42.403Z	+ eslint-plugin-react-refresh@0.4.26
2026-08-19T04:48:42.404Z	+ globals@15.15.0
2026-08-19T04:48:42.405Z	+ lovable-tagger@1.1.13
2026-08-19T04:48:42.405Z	+ postcss@8.5.6
2026-08-19T04:48:42.405Z	+ tailwindcss@3.4.17
2026-08-19T04:48:42.406Z	+ typescript@5.9.3
2026-08-19T04:48:42.406Z	+ typescript-eslint@8.52.0
2026-08-19T04:48:42.406Z	+ vite@5.4.21
2026-08-19T04:48:42.406Z	+ @hookform/resolvers@3.10.0
2026-08-19T04:48:42.406Z	+ @radix-ui/react-accordion@1.2.12
2026-08-19T04:48:42.406Z	+ @radix-ui/react-alert-dialog@1.1.15
2026-08-19T04:48:42.407Z	+ @radix-ui/react-aspect-ratio@1.1.8
2026-08-19T04:48:42.407Z	+ @radix-ui/react-avatar@1.1.11
2026-08-19T04:48:42.407Z	+ @radix-ui/react-checkbox@1.3.3
2026-08-19T04:48:42.407Z	+ @radix-ui/react-collapsible@1.1.12
2026-08-19T04:48:42.407Z	+ @radix-ui/react-context-menu@2.2.16
2026-08-19T04:48:42.413Z	+ @radix-ui/react-dialog@1.1.15
2026-08-19T04:48:42.413Z	+ @radix-ui/react-dropdown-menu@2.1.16
2026-08-19T04:48:42.413Z	+ @radix-ui/react-hover-card@1.1.15
2026-08-19T04:48:42.414Z	+ @radix-ui/react-label@2.1.8
2026-08-19T04:48:42.414Z	+ @radix-ui/react-menubar@1.1.16
2026-08-19T04:48:42.414	+ @radix-ui/react-navigation-menu@1.2.14
2026-08-19T04:48:42.414Z	+ @radix-ui/react-popover@1.1.14
2026-08-19T04:48:42.414Z	+ @radix-ui/react-progress@1.1.8
2026-08-19T04:48:42.415Z	+ @radix-ui/react-radio-group@1.3.7
2026-08-19T04:48:42.415Z	+ @radix-ui/react-scroll-area@1.2.10
2026-08-19T04:48:42.415Z	+ @radix-ui/react-select@2.2.6
2026-08-19T04:48:42.415Z	+ @radix-ui/react-separator@1.1.8
2026-08-19T04:48:42.415Z	+ @radix-ui/react-slider@1.3.6
2026-08-19T04:48:42.416Z	+ @radix-ui/react-slot@1.2.4
2026-08-19T04:48:42.416Z	+ @radix-ui/react-switch@1.2.6
2026-08-19T04:48:42.416Z	+ @radix-ui/react-tabs@1.1.13
2026-08-19T04:48:42.417Z	+ @radix-ui/react-toast@1.2.15
2026-08-19T04:48:42.417Z	+ @radix-ui/react-toggle@1.1.10
2026-08-19T04:48:42.417Z	+ @radix-ui/react-toggle-group@1.1.11
2026-08-19T04:48:42.418Z	+ @radix-ui/react-tooltip@1.2.8
2026-08-19T04:48:42.418Z	+ @supabase/supabase-js@2.101.0
2026-08-19T04:48:42.421Z	+ @tanstack/react-query@5.90.16
2026-08-19T04:48:42.421Z	+ canvas-confetti@1.9.4
2026-08-19T04:48:42.421Z	+ class-variance-authority@0.7.1
2026-08-19T04:48:42.421Z	+ clsx@2.1.1
2026-08-19T04:48:42.421Z	+ cmdk@1.1.1
2026-08-19T04:48:42.421Z	+ date-fns@3.6.0
2026-08-19T04:48:42.422Z	+ embla-carousel-react@8.6.0
2026-08-19T04:48:42.422Z	+ firebase@11.0.2
2026-08-19T04:48:42.422Z	+ framer-motion@12.43.0
2026-08-19T04:48:42.422Z	+ input-otp@1.4.2
2026-08-19T04:48:42.423Z	+ jspdf@4.1.0
2026-08-19T04:48:42.423Z	+ lucide-react@0.462.0
2026-08-19T04:48:42.423Z	+ next-themes@0.3.0
2026-08-19T04:48:42.425Z	+ qrcode.react@4.2.0
2026-08-19T04:48:42.425Z	+ react@18.3.1
2026-08-19T04:48:42.425Z	+ react-day-picker@8.10.1
2026-08-19T04:48:42.425Z	+ react-dom@18.3.1
2026-08-19T04:48:42.426Z	+ react-hook-form@7.71.0
2026-08-19T04:48:42.426Z	+ react-joyride@2.9.3
2026-08-19T04:48:42.426Z	+ react-resizable-panels@2.1.9
2026-08-19T04:48:42.426Z	+ react-router-dom@6.30.3
2026-08-19T04:48:42.426Z	+ react-window@2.2.5
2026-08-19T04:48:42.426Z	+ recharts@2.15.4
2026-08-19T04:48:42.426Z	+ sonner@1.7.4
2026-08-19T04:48:42.426Z	+ tailwind-merge@2.6.0
2026-08-19T04:48:42.427Z	+ tailwindcss-animate@1.0.7
2026-08-19T04:48:42.427Z	+ vaul@0.9.9
2026-08-19T04:48:42.427Z	+ zod@3.25.76
2026-08-19T04:48:42.427Z	
2026-08-19T04:48:42.427Z	498 packages installed [5.44s]
2026-08-19T04:48:42.736Z	Executing user deploy command: npx wrangler deploy
2026-08-19T04:48:46.791Z	npm warn exec The following package was not found and will be installed: wrangler@4.124.0
2026-08-19T04:49:05.571Z	
2026-08-19T04:49:05.571Z	 ⛅️ wrangler 4.124.0
2026-08-19T04:49:05.571Z	────────────────────
2026-08-19T04:49:06.101Z	
2026-08-19T04:49:06.105Z	Detected Project Settings:
2026-08-19T04:49:06.105Z	 - Worker Name: remix-of-tibimmanagerpainel2026
2026-08-19T04:49:06.105Z	 - Framework: Vite
2026-08-19T04:49:06.105Z	 - Build Command: npm run build
2026-08-19T04:49:06.105Z	 - Output Directory: dist
2026-08-19T04:49:06.105Z	
2026-08-19T04:49:06.105Z	? Do you want to modify these settings?
2026-08-19T04:49:06.106Z	🤖 Using fallback value in non-interactive context: no
2026-08-19T04:49:06.115Z	
2026-08-19T04:49:06.115Z	Cloudflare collects anonymous telemetry about your usage of Wrangler. Learn more at https://github.com/cloudflare/workers-sdk/tree/main/packages/wrangler/telemetry.md
2026-08-19T04:49:06.116Z	
2026-08-19T04:49:06.209Z	✘ [ERROR] The version of Vite used in the project ("5.4.21") cannot be automatically configured. Please update the Vite version to at least "6.0.0" and try again.
2026-08-19T04:49:06.209Z	
2026-08-19T04:49:06.209Z	
2026-08-19T04:49:06.238Z	🪵  Logs were written to "/opt/buildhome/.config/.wrangler/logs/wrangler-2026-08-19_04-49-04_597.log"
2026-08-19T04:49:06.384Z	Failed: error occurred while running deploy command</div>
      <Dashboard />
    </>
  );
};

export default Index;
