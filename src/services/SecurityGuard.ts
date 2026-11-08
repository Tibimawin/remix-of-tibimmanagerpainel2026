/**
 * SecurityGuard - Módulo de Proteção e Integridade do Frontend
 * 
 * Melhores práticas de segurança:
 * 1. Prevenção de Clickjacking (Framebusting seguro para evitar incorporação em domínios não autorizados)
 * 2. Mensagem informativa e dissuasória no console de desenvolvimento
 * 
 * ℹ️ NOTA DE ARQUITETURA:
 * O bloqueio de clique direito (contextmenu) e de atalhos de teclado (F12, Ctrl+U, etc.)
 * foi descontinuado para garantir plena acessibilidade, permitir que usuários legítimos
 * usem a área de transferência do sistema operacional e evitar falsa sensação de segurança.
 * A segurança real é aplicada nos endpoints, regras de autorização e backend.
 */

class SecurityGuardService {
  private initialized = false;

  public init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    this.setupConsoleWarning();
    this.setupClickjackingProtection();
  }

  /**
   * Banner informativo de segurança no Console do Navegador
   */
  private setupConsoleWarning() {
    try {
      const bannerStyle = `
        background: #0f172a;
        color: #f43f5e;
        font-size: 14px;
        font-weight: bold;
        padding: 8px 14px;
        border-radius: 6px;
        border-left: 4px solid #e11d48;
      `;
      const textStyle = `
        color: #94a3b8;
        font-size: 11px;
        line-height: 1.5;
        padding: 4px 0;
      `;

      console.log(
        '%c🛡️ TIBIM MANAGER - SISTEMA PROTEGIDO',
        bannerStyle
      );
      console.log(
        '%cTodas as operações do painel são auditadas e validadas criptograficamente.\nNunca compartilhe suas chaves de API, senhas ou tokens com terceiros.',
        textStyle
      );
    } catch {
      // Falha silenciosa se console for restrito
    }
  }

  /**
   * Prevenção de Clickjacking (Framebusting se carregado fora dos domínios autorizados)
   */
  private setupClickjackingProtection() {
    try {
      if (window.self !== window.top) {
        // Executando dentro de um iframe
        const allowedAncestors = [
          'localhost',
          '127.0.0.1',
          'run.app',
          'google.com',
          'lovable.app',
          'lovableproject.com',
          'vercel.app',
          'firebaseapp.com'
        ];

        let isPermitted = false;
        try {
          const ancestorOrigin = document.referrer ? new URL(document.referrer).hostname : '';
          isPermitted = allowedAncestors.some((domain) => ancestorOrigin.includes(domain));
        } catch {
          // Se cross-origin bloquear a leitura do referrer, mantém execução padrão
          isPermitted = true;
        }

        if (!isPermitted && document.referrer) {
          console.warn('⚠️ [Segurança] Carregamento em frame não autorizado bloqueado.');
          try {
            // Se carregado em frame malicioso, tenta redirecionar para a janela principal
            if (window.top) {
              window.top.location.href = window.self.location.href;
            }
          } catch {
            // Ignora se bloqueado por sandbox
          }
        }
      }
    } catch {
      // Ignora restrições do navegador
    }
  }
}

export const securityGuard = new SecurityGuardService();

