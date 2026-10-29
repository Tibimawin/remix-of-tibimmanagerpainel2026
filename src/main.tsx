import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { securityGuard } from './services/SecurityGuard'

// Inicializar proteção de segurança do frontend (anti-inspeção, atalhos e clickjacking)
securityGuard.init();

// Desabilitar todos os logs do console em produção para segurança
if (import.meta.env.PROD) {
  const noop = () => {};
  console.log = noop;
  console.warn = noop;
  console.error = noop;
  console.debug = noop;
  console.info = noop;
  console.trace = noop;
  console.dir = noop;
  console.table = noop;
  console.group = noop;
  console.groupEnd = noop;
  console.groupCollapsed = noop;
}

// TEMPORÁRIO (debug): rastreia refs passados para function components
if (import.meta.env.DEV) {
  const [ReactMod, JsxMod, JsxDevMod] = await Promise.all([
    import('react'),
    import('react/jsx-runtime'),
    import('react/jsx-dev-runtime').catch(() => ({} as any)),
  ]);
  console.log('[REF-DEBUG-INSTALLED]', typeof ReactMod.createElement, typeof JsxMod.jsx, typeof (JsxDevMod as any)?.jsxDEV);
  const report = (fnName: string, type: any, props: any) => {
    if (props && props.ref != null && typeof type === 'function') {
      const name = (type as any).displayName || (type as any).name || 'anonymous';
      console.warn(`[REF-DEBUG] ref no function component "${name}" via ${fnName}\n`, new Error().stack);
    }
  };
  const origJsx = JsxMod.jsx;
  const origJsxs = JsxMod.jsxs;
  (JsxMod as any).jsx = (type: any, props: any, key: any) => { report('jsx', type, props); return origJsx(type, props, key); };
  (JsxMod as any).jsxs = (type: any, props: any, key: any) => { report('jsxs', type, props); return origJsxs(type, props, key); };
  const origJsxDev = (JsxDevMod as any)?.jsxDEV;
  if (typeof origJsxDev === 'function') {
    (JsxDevMod as any).jsxDEV = (type: any, props: any, key: any, ...rest: any[]) => { report('jsxDEV', type, props); return origJsxDev(type, props, key, ...rest); };
  }
  const origCreate = ReactMod.createElement;
  (ReactMod as any).createElement = function (type: any, config: any, ...children: any[]) {
    if (config && config.ref != null && typeof type === 'function') {
      const name = type.displayName || type.name || 'anonymous';
      console.warn(`[REF-DEBUG] ref no function component "${name}" via createElement\n`, new Error().stack);
    }
    return (origCreate as any)(type, config, ...children);
  };
  const origClone = (ReactMod as any).cloneElement;
  if (typeof origClone === 'function') {
    (ReactMod as any).cloneElement = function (element: any, config: any, ...children: any[]) {
      const newRef = config && config.ref != null ? config.ref : (element?.ref ?? null);
      if (newRef != null) {
        const name = element?.type?.displayName || element?.type?.name || 'anonymous';
        console.warn(`[REF-DEBUG-CLONE] ref em "${name}" via cloneElement (config.ref=${config && config.ref != null ? 'sim' : 'herdado'})\n`, new Error().stack);
      }
      return origClone(element, config, ...children);
    };
  }
}

createRoot(document.getElementById("root")!).render(<App />);
