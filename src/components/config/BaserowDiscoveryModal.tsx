import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Wand2,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Layers,
  KeyRound,
  Mail,
  Lock,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import {
  DiscoveryResult,
  DetectedTableMatch,
  TableKey,
  TABLE_DEFINITIONS,
  BaserowTableDiscoveryService,
} from '@/services/BaserowTableDiscoveryService';
import { toast } from 'sonner';

interface BaserowDiscoveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseUrl?: string;
  apiToken?: string;
  discoveryResult: DiscoveryResult | null;
  onDiscoverySuccess: (result: DiscoveryResult, token?: string) => void;
  onDatabaseChange: (databaseId: string | number) => void;
  onApply: (selectedMappings: Partial<Record<string, string>>) => void;
  isApplying?: boolean;
}

export const BaserowDiscoveryModal: React.FC<BaserowDiscoveryModalProps> = ({
  open,
  onOpenChange,
  baseUrl = '',
  apiToken = '',
  discoveryResult,
  onDiscoverySuccess,
  onDatabaseChange,
  onApply,
  isApplying = false,
}) => {
  const [selectedKeys, setSelectedKeys] = useState<Record<TableKey, boolean>>({} as any);

  // Estados de autenticação caso a descoberta precise de credenciais JWT
  const [authMode, setAuthMode] = useState<'credentials' | 'jwt'>('credentials');
  const [connectionUrl, setConnectionUrl] = useState(baseUrl);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [jwtToken, setJwtToken] = useState(apiToken?.startsWith('eyJ') ? apiToken : '');
  const [isConnecting, setIsConnecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Sincronizar URL quando abrir o modal
  useEffect(() => {
    if (baseUrl && !connectionUrl) {
      setConnectionUrl(baseUrl);
    }
    if (apiToken?.startsWith('eyJ') && !jwtToken) {
      setJwtToken(apiToken);
    }
  }, [baseUrl, apiToken]);

  // Inicializar todas as tabelas detectadas como marcadas ao receber discoveryResult
  useEffect(() => {
    if (discoveryResult) {
      const initial: Record<string, boolean> = {};
      Object.entries(discoveryResult.matches).forEach(([key, match]) => {
        if (match) {
          initial[key] = true;
        }
      });
      setSelectedKeys(initial as any);
      setAuthError(null);
    }
  }, [discoveryResult]);

  const toggleKey = (key: TableKey) => {
    setSelectedKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelectAll = (select: boolean) => {
    if (!discoveryResult) return;
    const updated: Record<string, boolean> = {};
    Object.values(discoveryResult.matches).forEach((m) => {
      if (m) updated[m.key] = select;
    });
    setSelectedKeys(updated as any);
  };

  const handleApply = () => {
    if (!discoveryResult) return;
    const toApply: Record<string, string> = {};
    Object.values(discoveryResult.matches).forEach((m) => {
      if (m && selectedKeys[m.key]) {
        toApply[m.key] = m.tableId;
      }
    });
    onApply(toApply);
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const targetUrl = connectionUrl.trim() || baseUrl.trim();
    if (!targetUrl) {
      setAuthError('Informe a URL do seu servidor Baserow.');
      return;
    }

    try {
      new URL(targetUrl);
    } catch {
      setAuthError('URL do Baserow inválida. Exemplo: https://meu-baserow.com');
      return;
    }

    try {
      setIsConnecting(true);

      let result: DiscoveryResult;
      let effectiveJwt = '';

      if (authMode === 'credentials') {
        if (!email.trim() || !password) {
          setAuthError('Preencha seu Email e Senha do Baserow para autenticar.');
          setIsConnecting(false);
          return;
        }

        toast.info('Autenticando no Baserow com segurança...');
        effectiveJwt = await BaserowTableDiscoveryService.loginWithCredentials(targetUrl, email, password);
        result = await BaserowTableDiscoveryService.discover(targetUrl, effectiveJwt);
      } else {
        if (!jwtToken.trim()) {
          setAuthError('Cole seu Token JWT de usuário do Baserow.');
          setIsConnecting(false);
          return;
        }

        effectiveJwt = jwtToken.trim();
        result = await BaserowTableDiscoveryService.discover(targetUrl, effectiveJwt);
      }

      toast.success(`🎉 ${result.totalMatched} tabelas identificadas com sucesso!`);
      onDiscoverySuccess(result, effectiveJwt);
    } catch (err: any) {
      console.error('Erro na conexão/descoberta:', err);
      const msg = err?.message || 'Falha ao autenticar no Baserow.';
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setIsConnecting(false);
    }
  };

  // Se ainda não tiver discoveryResult, exibe o painel de autenticação
  if (!discoveryResult) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-gradient-to-r from-primary/10 via-background to-orange-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/20 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  Mapeamento Automático de Tabelas
                </DialogTitle>
                <DialogDescription className="text-sm mt-0.5">
                  Conecte sua conta do Baserow para identificar todas as tabelas em 1 clique
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleConnect} className="p-6 space-y-5">
            {/* Notificação Explicativa */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-foreground/90 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-primary">
                <KeyRound className="h-4 w-4" />
                <span>Por que a autenticação de conta é necessária?</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                O Baserow só permite listar toda a estrutura de bancos e tabelas quando autenticado com um login de usuário. Tokens de banco comuns (Database Tokens) só acessam linhas de tabelas individuais.
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Seus dados são transmitidos diretamente para seu Baserow e nunca salvos.</span>
              </div>
            </div>

            {/* Alternador de Modo */}
            <div className="flex rounded-lg bg-muted/60 p-1 border border-border/40 text-xs">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('credentials');
                  setAuthError(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-md font-medium transition-all ${
                  authMode === 'credentials'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Email e Senha (Recomendado)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('jwt');
                  setAuthError(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-md font-medium transition-all ${
                  authMode === 'jwt'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Token JWT Direto
              </button>
            </div>

            {/* Formulário */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="discovery-url" className="text-xs">URL do Baserow</Label>
                <Input
                  id="discovery-url"
                  placeholder="https://seu-baserow.com"
                  value={connectionUrl}
                  onChange={(e) => setConnectionUrl(e.target.value)}
                  className="text-xs"
                />
              </div>

              {authMode === 'credentials' ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="discovery-email" className="text-xs flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      Email ou Usuário do Baserow
                    </Label>
                    <Input
                      id="discovery-email"
                      type="text"
                      placeholder="seu.email@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="text-xs"
                      autoComplete="username"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="discovery-pass" className="text-xs flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      Senha do Baserow
                    </Label>
                    <Input
                      id="discovery-pass"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="text-xs"
                      autoComplete="current-password"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="discovery-jwt" className="text-xs flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                    Token JWT de Usuário (inicia com &apos;eyJ...&apos;)
                  </Label>
                  <Input
                    id="discovery-jwt"
                    type="password"
                    placeholder="eyJhbGciOi..."
                    value={jwtToken}
                    onChange={(e) => setJwtToken(e.target.value)}
                    className="text-xs font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Obtido via API do Baserow em <code>POST /api/user/token-auth/</code>.
                  </p>
                </div>
              )}
            </div>

            {/* Mensagem de Erro se houver */}
            {authError && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isConnecting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isConnecting}
                className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-white gap-2 shadow"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Conectando e Mapeando...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    <span>Conectar e Buscar Tabelas</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // Se já tiver discoveryResult, exibe a revisão e seleção de tabelas
  const { databases, selectedDatabaseId, matches, unmatchedTables, totalMatched } = discoveryResult;

  const matchedList = Object.entries(matches)
    .filter(([_, match]) => match !== null)
    .map(([_, match]) => match as DetectedTableMatch);

  const missingDefs = TABLE_DEFINITIONS.filter((def) => !matches[def.key]);
  const countSelected = Object.values(selectedKeys).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-gradient-to-r from-primary/10 via-background to-orange-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  Mapeamento de Tabelas
                </DialogTitle>
                <DialogDescription className="text-sm mt-0.5">
                  Revise os IDs detectados no seu Baserow e marque os que deseja preencher.
                </DialogDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onDiscoverySuccess(null as any)}
              className="text-xs gap-1.5 h-8 border-border/60 hover:bg-muted"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reconectar
            </Button>
          </div>

          {/* Seletor de Banco de Dados se houver múltiplos */}
          {databases.length > 1 && (
            <div className="mt-4 flex items-center gap-3 bg-muted/60 p-3 rounded-lg border border-border/40">
              <Database className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">Banco de Dados:</span>
              <Select
                value={String(selectedDatabaseId)}
                onValueChange={(val) => onDatabaseChange(val)}
              >
                <SelectTrigger className="h-8 flex-1 bg-background text-xs">
                  <SelectValue placeholder="Selecione o banco de dados" />
                </SelectTrigger>
                <SelectContent>
                  {databases.map((db) => (
                    <SelectItem key={db.id} value={String(db.id)} className="text-xs">
                      {db.name} ({db.tables.length} tabelas)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Resumo de Matches */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-border/30 text-xs">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 gap-1.5 py-1 px-2.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {totalMatched} tabelas identificadas
              </Badge>
              {missingDefs.length > 0 && (
                <Badge variant="outline" className="text-muted-foreground gap-1.5 py-1 px-2.5">
                  <HelpCircle className="h-3.5 w-3.5" />
                  {missingDefs.length} não encontradas
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                onClick={() => handleSelectAll(true)}
              >
                Selecionar Todas
              </Button>
              <span className="text-muted-foreground/40">•</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                onClick={() => handleSelectAll(false)}
              >
                Desmarcar Todas
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Lista Rolável de Tabelas */}
        <ScrollArea className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Seção 1: Tabelas Encontradas */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Tabelas Reconhecidas ({matchedList.length})
              </h4>

              {matchedList.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-lg border border-dashed border-border/60 bg-muted/20">
                  <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm font-medium">Nenhuma tabela conhecida foi identificada</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    Os nomes das tabelas no seu Baserow não coincidiram com os padrões conhecidos. 
                    Você ainda pode preencher os IDs manualmente nos campos da tela.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {matchedList.map((match) => {
                    const isChecked = !!selectedKeys[match.key];
                    return (
                      <div
                        key={match.key}
                        onClick={() => toggleKey(match.key)}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-primary/5 border-primary/40 shadow-sm'
                            : 'bg-muted/30 border-border/50 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleKey(match.key)}
                            onClick={(e) => e.stopPropagation()}
                            id={`check-${match.key}`}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <label
                                htmlFor={`check-${match.key}`}
                                className="text-sm font-semibold text-foreground cursor-pointer"
                              >
                                {match.label}
                              </label>
                              {match.category === 'tibim' && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] py-0 px-1.5 h-4 text-orange-500 border-orange-500/30 bg-orange-500/5"
                                >
                                  Modo Tibim
                                </Badge>
                              )}
                              {match.confidence === 'high' ? (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] py-0 px-1.5 h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                >
                                  Exato
                                </Badge>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] py-0 px-1.5 h-4 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                >
                                  Similar
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                              <span>Tabela no Baserow:</span>
                              <span className="font-mono text-foreground font-medium bg-muted/50 px-1.5 py-0.5 rounded">
                                {match.tableName}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-right">
                          <div className="text-right">
                            <span className="text-[11px] text-muted-foreground block">ID Detectado</span>
                            <span className="font-mono text-sm font-bold text-primary">
                              #{match.tableId}
                            </span>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground/50 ml-1" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Seção 2: Tabelas Não Encontradas */}
            {missingDefs.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  Tabelas Não Identificadas ({missingDefs.length})
                </h4>
                <div className="rounded-lg border border-border/40 bg-muted/10 p-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    Não encontramos correspondência para as tabelas abaixo. Se você utiliza esses recursos, crie as tabelas no Baserow ou informe seus IDs manualmente:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {missingDefs.map((def) => (
                      <Badge
                        key={def.key}
                        variant="outline"
                        className="text-xs py-0.5 px-2 bg-background/50 text-muted-foreground border-border/60"
                      >
                        {def.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Seção 3: Tabelas que sobraram no Baserow */}
            {unmatchedTables.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  Outras Tabelas no Baserow ({unmatchedTables.length})
                </h4>
                <div className="rounded-lg border border-border/40 bg-muted/10 p-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    Tabelas presentes no seu banco que não foram vinculadas a nenhuma função do painel:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {unmatchedTables.map((t) => (
                      <Badge
                        key={t.id}
                        variant="secondary"
                        className="text-[11px] font-mono py-0.5 px-2 bg-muted text-muted-foreground"
                      >
                        {t.name} (ID: {t.id})
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border/40 bg-muted/30 flex items-center justify-between sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {countSelected > 0 ? (
              <span>
                <strong>{countSelected}</strong> {countSelected === 1 ? 'tabela selecionada' : 'tabelas selecionadas'}
              </span>
            ) : (
              <span className="text-amber-500 font-medium">Nenhuma tabela selecionada</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isApplying}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              disabled={countSelected === 0 || isApplying}
              className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-white gap-1.5 shadow"
            >
              <Wand2 className="h-4 w-4" />
              {isApplying ? 'Aplicando e Salvando...' : `Aplicar ${countSelected} IDs`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
