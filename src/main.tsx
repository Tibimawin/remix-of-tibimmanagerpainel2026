import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

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

createRoot(document.getElementById("root")!).render(<App />);
