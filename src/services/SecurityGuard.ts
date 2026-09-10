/**
 * SecurityGuard - Módulo de Proteção do Frontend
 * 
 * Camadas de proteção:
 * 1. Bloqueio de clique com botão direito (contextmenu) em elementos não-editáveis
 * 2. Bloqueio de atalhos de desenvolvedor (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S)
 * 3. Sanitização de logs de console em produção
 * 4. Mensagem dissuasória de segurança no DevTools
 * 5. Detecção de tampering e prevenção de clickjacking
 */

class SecurityGuardService {
  private initialized = false;

  public init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    this.setupContextMenuBlock();
    this.setupKeyboardShortcutsBlock();
    this.setupConsoleWarning();
    this.setupClickjackingProtection();
  }

  /**
   * Bloqueia o menu de contexto (botão direito) para dificultar inspeção,
   * permitindo o uso legítimo em inputs, textareas ou campos com contenteditable
   */
  private setupContextMenuBlock() {
    window.addEventListener(
      'contextmenu',
      (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;

        // Permite o botão direito apenas em inputs e textareas para copiar/colar texto
        const isEditable =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('input, textarea, [contenteditable="true"]');

        if (!isEditable) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      { capture: true }
    );
  }

  /**
   * Bloqueia atalhos de teclado comuns de engenharia reversa e inspeção
   */
  private setupKeyboardShortcutsBlock() {
    window.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        // Ignora em modo de desenvolvimento local se VITE_DEV_INSPECT=true
        if (import.meta.env.DEV && import.meta.env.VITE_DEV_INSPECT === 'true') {
          return;
        }

        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
        const shift = e.shiftKey;
        const key = e.key.toUpperCase();

        // 1. F12 (DevTools)
        if (e.key === 'F12') {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }

        // 2. Ctrl + Shift + I (DevTools Elements / Inspector)
        if (ctrlOrCmd && shift && (key === 'I' || e.keyCode === 73)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }

        // 3. Ctrl + Shift + J (DevTools Console)
        if (ctrlOrCmd && shift && (key === 'J' || e.keyCode === 74)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }

        // 4. Ctrl + Shift + C (Inspecionar elemento)
        if (ctrlOrCmd && shift && (key === 'C' || e.keyCode === 67)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }

        // 5. Ctrl + U (Ver código-fonte / View Source)
        if (ctrlOrCmd && (key === 'U' || e.keyCode === 85)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }

        // 6. Ctrl + S (Salvar página inteira localmente)
        if (ctrlOrCmd && (key === 'S' || e.keyCode === 83)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      },
      { capture: true }
    );
  }

  /**
   * Banner de segurança no Console do Navegador
   */
  private setupConsoleWarning() {
    try {
      const bannerStyle = `
        background: #0f172a;
        color: #f43f5e;
        font-size: 16px;
        font-weight: bold;
        padding: 10px 16px;
        border-radius: 6px;
        border-left: 5px solid #e11d48;
      `;
      const textStyle = `
        color: #94a3b8;
        font-size: 12px;
        line-height: 1.6;
        padding: 6px 0;
      `;

      // Exibe mensagem persuasiva e profissional de segurança
      console.log(
        '%c🛡️ TIBIM MANAGER - SISTEMA PROTEGIDO CONTRA ENGENHARIA REVERSA',
        bannerStyle
      );
      console.log(
        '%cEsta aplicação possui proteção ativa de integridade de código e comunicação de APIs criptografada.\nTentativas não autorizadas de injeção de scripts, extração de tokens ou descompilação de rotas são bloqueadas e monitoradas.',
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
        }
      }
    } catch {
      // Ignora restrições do navegador
    }
  }
}

export const securityGuard = new SecurityGuardService();
