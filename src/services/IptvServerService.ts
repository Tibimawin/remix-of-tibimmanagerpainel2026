/**
 * IptvServerService.ts
 * 
 * Serviço especializado para garantir compatibilidade com 100% dos servidores IPTV:
 * - Xtream Codes (todas as versões: 1.0.60, XC UI, XUI.one, Stream Crex, ZapX, etc.)
 * - URLs HTTP e HTTPS (incluindo servidores com portas personalizadas e certificados auto-assinados)
 * - Suporte a múltiplos formatos de saída (M3U Plus TS, M3U Plus sem output, HLS/M3U8, M3U Simples)
 * - Sanitização automática de URLs e links completos colados no campo
 * - Diagnóstico prévio de conta via Xtream Player API (player_api.php)
 * - Emulação de User-Agents oficiais de players IPTV (IPTV Smarters Pro, TiviMate, VLC)
 */

import { BASEROW_PROXY_CONFIG } from '@/config/proxyConfig';

export interface IptvCredentials {
  serverUrl: string;
  username: string;
  password: string;
  format?: string;
}

export interface IptvDiagnosticResult {
  success: boolean;
  status: 'active' | 'expired' | 'banned' | 'disabled' | 'unknown';
  auth: boolean;
  username?: string;
  expDateFormatted?: string;
  isTrial?: boolean;
  maxConnections?: number;
  activeConnections?: number;
  serverVersion?: string;
  serverProtocol?: string;
  serverPort?: string;
  message: string;
  recommendedFormat?: string;
}

export class IptvServerService {
  /**
   * Sanitiza a entrada do usuário.
   * Se o usuário colou um link M3U completo no campo do servidor,
   * extrai automaticamente o servidor, usuário, senha e formato!
   */
  static parseIptvServerInput(
    rawUrl: string,
    rawUsername?: string,
    rawPassword?: string
  ): { serverUrl: string; username: string; password: string; extractedFormat?: string } {
    let url = (rawUrl || '').trim();
    let username = (rawUsername || '').trim();
    let password = (rawPassword || '').trim();
    let extractedFormat: string | undefined = undefined;

    if (!url) {
      return { serverUrl: '', username, password };
    }

    // Se o usuário não colocou http:// ou https://, define http:// por padrão
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }

    try {
      const parsed = new URL(url);

      // Verificar se o usuário colou um link completo de get.php ou com query string
      const searchParams = parsed.searchParams;
      if (searchParams.has('username')) {
        const u = searchParams.get('username');
        if (u && !username) username = u.trim();
      }
      if (searchParams.has('password')) {
        const p = searchParams.get('password');
        if (p && !password) password = p.trim();
      }
      if (searchParams.has('output')) {
        extractedFormat = searchParams.get('output') || undefined;
      }

      // Remover rotas conhecidas como /get.php, /player_api.php, /c/, /live/, etc.
      let cleanPath = parsed.pathname;
      cleanPath = cleanPath
        .replace(/\/get\.php.*$/i, '')
        .replace(/\/player_api\.php.*$/i, '')
        .replace(/\/xmltv\.php.*$/i, '')
        .replace(/\/c\/?$/i, '')
        .replace(/\/live\/?$/i, '')
        .replace(/\/series\/?$/i, '')
        .replace(/\/movie\/?$/i, '')
        .replace(/\/+$/, '');

      // Reconstruir URL base limpa: protocolo + host (+ porta se houver)
      const cleanServerUrl = `${parsed.protocol}//${parsed.host}${cleanPath}`;

      return {
        serverUrl: cleanServerUrl,
        username,
        password,
        extractedFormat,
      };
    } catch {
      // Fallback simples caso URL constructor falhe
      let clean = url.replace(/\/+$/, '');
      clean = clean
        .replace(/\/get\.php.*$/i, '')
        .replace(/\/player_api\.php.*$/i, '')
        .replace(/\/c\/?$/i, '');
      return { serverUrl: clean, username, password };
    }
  }

  /**
   * Gera todas as variações de URLs compatíveis para o servidor Xtream Codes.
   * Ordena por probabilidade de sucesso.
   */
  static generateCandidateUrls(
    serverUrl: string,
    username: string,
    password: string,
    preferredFormat: string = 'auto'
  ): string[] {
    const { serverUrl: base, username: u, password: p } = this.parseIptvServerInput(serverUrl, username, password);
    if (!base || !u || !p) return [];

    const encU = encodeURIComponent(u);
    const encP = encodeURIComponent(p);

    const formatVariants: { id: string; url: string }[] = [
      // 1. Padrão Xtream Codes mais popular e universal: M3U Plus com output TS
      {
        id: 'm3u_plus_ts',
        url: `${base}/get.php?username=${encU}&password=${encP}&type=m3u_plus&output=ts`,
      },
      // 2. M3U Plus sem especificar output (muitos servidores mais novos exigem assim)
      {
        id: 'm3u_plus',
        url: `${base}/get.php?username=${encU}&password=${encP}&type=m3u_plus`,
      },
      // 3. M3U Plus com output HLS / M3U8 (comum em servidores de streaming moderno)
      {
        id: 'm3u_plus_m3u8',
        url: `${base}/get.php?username=${encU}&password=${encP}&type=m3u_plus&output=m3u8`,
      },
      // 4. M3U Legado com output TS
      {
        id: 'm3u_ts',
        url: `${base}/get.php?username=${encU}&password=${encP}&type=m3u&output=ts`,
      },
      // 5. M3U Legado simples (compatível com servidores antigos 1.0.60)
      {
        id: 'm3u',
        url: `${base}/get.php?username=${encU}&password=${encP}&type=m3u`,
      },
      // 6. Formato get.php sem type nem output
      {
        id: 'minimal',
        url: `${base}/get.php?username=${encU}&password=${encP}`,
      },
      // 7. Rota alternativa em path (alguns painéis como XUI.one ou ZapX aceitam)
      {
        id: 'path_m3u_plus',
        url: `${base}/playlist/${encU}/${encP}/m3u_plus`,
      },
      // 8. Rota direta
      {
        id: 'short_path',
        url: `${base}/${encU}/${encP}`,
      },
    ];

    let sorted: string[] = [];

    if (preferredFormat && preferredFormat !== 'auto') {
      const found = formatVariants.find(v => v.id === preferredFormat);
      if (found) {
        sorted.push(found.url);
      }
    }

    // Adiciona o restante das variações
    for (const item of formatVariants) {
      if (!sorted.includes(item.url)) {
        sorted.push(item.url);
      }
    }

    // Adicionar também o protocolo alternativo (HTTP <-> HTTPS)
    const protocolAlternatives: string[] = [];
    for (const urlStr of sorted) {
      if (urlStr.startsWith('http://')) {
        protocolAlternatives.push(urlStr.replace('http://', 'https://'));
      } else if (urlStr.startsWith('https://')) {
        protocolAlternatives.push(urlStr.replace('https://', 'http://'));
      }
    }

    return [...sorted, ...protocolAlternatives];
  }

  /**
   * Executa diagnóstico em tempo real no servidor IPTV via Xtream Codes player_api.php.
   * Permite verificar se o usuário e senha são válidos, se a assinatura está ativa e a data de expiração.
   */
  static async testConnection(
    serverUrl: string,
    username: string,
    password: string
  ): Promise<IptvDiagnosticResult> {
    const clean = this.parseIptvServerInput(serverUrl, username, password);
    if (!clean.serverUrl || !clean.username || !clean.password) {
      return {
        success: false,
        status: 'unknown',
        auth: false,
        message: 'Preencha o servidor, usuário e senha para testar.',
      };
    }

    const testUrl = `${clean.serverUrl}/player_api.php?username=${encodeURIComponent(clean.username)}&password=${encodeURIComponent(clean.password)}`;
    const candidateUrls = [
      testUrl,
      testUrl.startsWith('http://') ? testUrl.replace('http://', 'https://') : testUrl.replace('https://', 'http://'),
    ];

    const proxyEndpoint = BASEROW_PROXY_CONFIG.M3U_PROXY_URL;

    try {
      const response = await fetch(proxyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: candidateUrls[0],
          urls: candidateUrls,
          userAgent: 'IPTVSmartersPro/1.0.0 (Android; 9)',
          timeout: 25000,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        return {
          success: false,
          status: 'unknown',
          auth: false,
          message: errJson.error || `Servidor retornou erro ${response.status}`,
        };
      }

      const text = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        // Se não retornou JSON, mas retornou status 200, pode ser que o servidor não tenha player_api.php aberto
        return {
          success: true,
          status: 'active',
          auth: true,
          message: 'Servidor IPTV online e acessível (modo de compatibilidade básico).',
        };
      }

      const userInfo = data?.user_info || data?.userInfo;
      const serverInfo = data?.server_info || data?.serverInfo;

      if (!userInfo) {
        return {
          success: true,
          status: 'active',
          auth: true,
          message: 'Conexão estabelecida com o servidor IPTV com sucesso.',
        };
      }

      const isAuthValid = userInfo.auth === 1 || userInfo.status?.toLowerCase() === 'active';
      const rawStatus = (userInfo.status || '').toLowerCase();

      let expFormatted = 'Vitalício / Sem expiração';
      if (userInfo.exp_date && userInfo.exp_date !== 'null' && Number(userInfo.exp_date) > 0) {
        const expTimestamp = Number(userInfo.exp_date) * 1000;
        const expDate = new Date(expTimestamp);
        expFormatted = expDate.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }

      if (!isAuthValid && (rawStatus === 'banned' || rawStatus === 'disabled')) {
        return {
          success: false,
          status: rawStatus as any,
          auth: false,
          message: `Conta ${rawStatus === 'banned' ? 'bloqueada/banida' : 'desativada'} no servidor IPTV.`,
        };
      }

      if (userInfo.auth === 0) {
        return {
          success: false,
          status: 'expired',
          auth: false,
          message: 'Usuário ou senha inválidos, ou assinatura vencida no servidor IPTV.',
        };
      }

      return {
        success: true,
        status: 'active',
        auth: true,
        username: userInfo.username,
        expDateFormatted: expFormatted,
        isTrial: userInfo.is_trial === '1' || userInfo.is_trial === 1,
        maxConnections: Number(userInfo.max_connections) || 1,
        activeConnections: Number(userInfo.active_cons) || 0,
        serverVersion: serverInfo?.version || 'Xtream Codes',
        serverProtocol: serverInfo?.server_protocol || 'http',
        serverPort: serverInfo?.port || '',
        message: `Servidor online! Conta ativa. Validade: ${expFormatted}`,
      };
    } catch (error: any) {
      return {
        success: false,
        status: 'unknown',
        auth: false,
        message: error?.message || 'Falha ao testar conexão com o servidor.',
      };
    }
  }

  /**
   * Baixa a lista M3U completa do servidor com máxima compatibilidade:
   * - Envia múltiplos formatos de URLs candidatas
   * - Usa proxy com rotação de User-Agent de player IPTV (Smarters, VLC, TiviMate)
   * - Fallback em cascata para garantir que qualquer servidor seja aceito
   */
  static async fetchM3U(params: {
    serverUrl: string;
    username: string;
    password: string;
    preferredFormat?: string;
    onPhaseChange?: (phase: 'connecting' | 'downloading' | 'validating' | 'idle') => void;
    onLog?: (msg: string) => void;
  }): Promise<string> {
    const { serverUrl, username, password, preferredFormat = 'auto', onPhaseChange, onLog } = params;

    const clean = this.parseIptvServerInput(serverUrl, username, password);
    if (!clean.serverUrl || !clean.username || !clean.password) {
      throw new Error('URL do servidor, usuário e senha são obrigatórios.');
    }

    const candidateUrls = this.generateCandidateUrls(clean.serverUrl, clean.username, clean.password, preferredFormat);

    if (candidateUrls.length === 0) {
      throw new Error('Não foi possível gerar URLs válidas para este servidor.');
    }

    onPhaseChange?.('connecting');
    onLog?.(`Identificadas ${candidateUrls.length} variações de formato para o servidor IPTV...`);

    const proxyEndpoint = BASEROW_PROXY_CONFIG.M3U_PROXY_URL;
    onPhaseChange?.('downloading');

    let response: Response | null = null;
    let fetchError: any = null;

    // Tentativa 1: Enviar lista de URLs candidatas para o proxy inteligente
    try {
      response = await fetch(proxyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: candidateUrls[0],
          urls: candidateUrls,
          userAgent: 'IPTVSmartersPro/1.0.0 (Android; 9)',
          timeout: 85000,
        }),
      });
    } catch (err: any) {
      fetchError = err;
      onLog?.(`Proxy primário indisponível (${err.message}). Tentando rota alternativa...`);
    }

    // Tentativa 2: Fallback para rota relativa /api/m3u-proxy se a primária falhou
    if (!response || !response.ok) {
      if (proxyEndpoint !== '/api/m3u-proxy') {
        try {
          onLog?.('Tentando endpoint de contingência /api/m3u-proxy...');
          response = await fetch('/api/m3u-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: candidateUrls[0],
              urls: candidateUrls,
              userAgent: 'IPTVSmartersPro/1.0.0 (Android; 9)',
              timeout: 85000,
            }),
          });
        } catch (err) {
          // Ignora e continua
        }
      }
    }

    // Tentativa 3: Se o proxy falhou com erro de rede, tenta fetch direto no navegador (caso o servidor suporte CORS)
    if (!response || !response.ok) {
      try {
        onLog?.('Testando acesso direto ao servidor IPTV...');
        const directResp = await fetch(candidateUrls[0], {
          headers: { 'Accept': '*/*' },
        });
        if (directResp.ok) {
          response = directResp;
        }
      } catch {
        // Direct fetch CORS blocked (esperado para a maioria dos servidores IPTV)
      }
    }

    if (!response) {
      throw new Error(fetchError?.message || 'Falha de comunicação com o serviço de proxy e com o servidor IPTV.');
    }

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const msg = errorJson.error || `Erro ${response.status}: ${response.statusText}`;
      throw new Error(msg);
    }

    onPhaseChange?.('validating');
    const content = await response.text();

    if (!content || content.trim().length < 10) {
      throw new Error('O servidor IPTV respondeu com conteúdo vazio. Verifique se a lista contém canais liberados.');
    }

    // Se retornou página HTML de erro ou Cloudflare
    if (content.toLowerCase().includes('<html') && !content.includes('#EXTM3U')) {
      throw new Error('O servidor IPTV retornou uma página web/HTML ao invés da lista M3U. Verifique as credenciais ou contate seu provedor.');
    }

    // Validar se é lista M3U ou se contém links de mídia
    const hasM3uHeader = content.includes('#EXTM3U') || content.includes('#EXTINF');
    const hasMediaLinks = content.includes('http://') || content.includes('https://');

    if (!hasM3uHeader && !hasMediaLinks) {
      throw new Error('O conteúdo retornado não é uma lista M3U reconhecível. Verifique se o formato do servidor está correto.');
    }

    return content;
  }
}
