// FIX TEMPORÁRIO - Cole no console do navegador para corrigir o encoding duplo:

// Interceptar a função getTableData para garantir que não haja encoding duplo
const originalFetch = window.fetch;
window.fetch = function (...args) {
    let url = args[0];
    if (typeof url === 'string' && url.includes('%2520')) {
        console.warn('🔧 [FIX] Detectado encoding duplo, corrigindo...', url);
        url = url.replace(/%2520/g, '%20');
        args[0] = url;
        console.log('✅ [FIX] URL corrigida:', url);
    }
    return originalFetch.apply(this, args);
};

console.log('✅ FIX de encoding duplo ativado! Recarregue e teste novamente.');
