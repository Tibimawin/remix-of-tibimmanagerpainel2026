// ⚠️ DEPRECADO: Este arquivo agora apenas re-exporta do UserPermissionsContext
// Todos os componentes devem usar useUserPermissions do contexto centralizado
// Isso garante que haverá apenas 1 listener Firebase compartilhado

export { useUserPermissions } from '@/contexts/UserPermissionsContext';
