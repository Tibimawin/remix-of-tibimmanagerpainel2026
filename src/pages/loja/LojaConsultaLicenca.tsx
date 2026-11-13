import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Key,
  Search,
  CheckCircle2,
  XCircle,
  Download,
  Copy,
  MessageCircle,
  Smartphone,
  Tv,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  FileText,
  Clock,
  User,
  ExternalLink,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { LojaLayout } from '@/components/loja/LojaLayout';
import { LojaService, LojaLicenca, LojaConfig, DEFAULT_LOJA_CONFIG } from '@/services/LojaService';

export const LojaConsultaLicenca: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [inputKey, setInputKey] = useState(() => searchParams.get('chave') || '');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [licenca, setLicenca] = useState<LojaLicenca | null>(null);
  const [recentLicenses, setRecentLicenses] = useState<LojaLicenca[]>([]);
  const [config, setConfig] = useState<LojaConfig>(DEFAULT_LOJA_CONFIG);

  useEffect(() => {
    document.title = 'Consultar Licença & Meus Apps - Loja Oficial';
    const unsub = LojaService.subscribeConfig(setConfig);

    // Carregar histórico local de licenças salvas no navegador
    try {
      const stored = localStorage.getItem('loja_licencas_backup');
      if (stored) {
        setRecentLicenses(JSON.parse(stored));
      }
    } catch {
      // ignore
    }

    // Se veio chave na URL, consulta automaticamente
    const queryKey = searchParams.get('chave');
    if (queryKey) {
      handleSearch(queryKey);
    }

    return () => unsub();
  }, []);

  const handleSearch = async (chaveToSearch?: string) => {
    const raw = (chaveToSearch || inputKey).trim().toUpperCase();
    if (!raw) {
      toast.error('Informe o código da chave de licença');
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const found = await LojaService.getLicenseByKey(raw);
      setLicenca(found);
      if (found) {
        toast.success('Licença localizada com sucesso!');
      } else {
        toast.error('Chave de licença não encontrada');
      }
    } catch (err) {
      console.error('Erro ao consultar licença:', err);
      toast.error('Erro ao consultar o servidor de licenças');
    } finally {
      setLoading(false);
    }
  };

  const copyKey = (chave: string) => {
    navigator.clipboard.writeText(chave);
    toast.success(`Chave ${chave} copiada!`);
  };

  const openWhatsappSupport = (chave?: string, produto?: string) => {
    const text = encodeURIComponent(
      chave
        ? `Olá! Gostaria de suporte sobre minha Chave de Licença *${chave}* do produto *${produto || ''}*.`
        : `Olá! Vim pela área de Licenças da ${config.nomeLoja} e preciso de ajuda com minha chave.`
    );
    window.open(LojaService.formatWhatsappUrl(config.whatsappVendas, text), '_blank');
  };

  const isAppProduct = (lic: LojaLicenca) => {
    const text = `${lic.categoria} ${lic.produtoNome}`.toLowerCase();
    return text.includes('app') || text.includes('android') || text.includes('tv');
  };

  return (
    <LojaLayout>
      <div className="container mx-auto max-w-4xl px-4 py-10 space-y-8">
        {/* Voltar */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/loja')}
            className="text-white/70 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Voltar para a Loja
          </Button>

          <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10 text-xs px-3 py-1 font-bold">
            <Key className="w-3.5 h-3.5 mr-1.5" />
            Central de Licenças & Downloads
          </Badge>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
            <Key className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Consultar Licença & Meus Apps
          </h1>
          <p className="text-sm text-white/60 leading-relaxed">
            Insira a chave de licença que você recebeu após a compra (ex: <code className="text-emerald-400 font-mono font-bold">TIBIM-XXXX-XXXX-XXXX</code>) para baixar seu aplicativo, acessar métodos e verificar a validade do seu produto.
          </p>
        </div>

        {/* Caixa de Busca */}
        <Card className="bg-[#0B0E17] border-white/15 text-white shadow-2xl overflow-hidden">
          <CardContent className="p-6 space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="relative flex-1">
                <Key className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value.toUpperCase())}
                  placeholder="Cole aqui sua chave: TIBIM-XXXX-XXXX-XXXX"
                  className="pl-10 h-12 bg-black/60 border-white/15 text-white font-mono text-sm tracking-wider uppercase placeholder:text-white/30 rounded-xl"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="h-12 px-7 font-black text-sm bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 shadow-lg shadow-emerald-600/20"
              >
                {loading ? (
                  'Verificando...'
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Consultar Licença
                  </>
                )}
              </Button>
            </form>

            <div className="flex flex-wrap items-center justify-between text-xs text-white/40 pt-1">
              <span>Formato padrão: TIBIM-4D8A-9E2B-1C7F</span>
              <button
                type="button"
                onClick={() => openWhatsappSupport()}
                className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Perdeu sua chave? Fale com o suporte
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Resultado da Consulta */}
        {searched && (
          <div className="space-y-6">
            {licenca ? (
              <Card className="bg-[#0D111D] border-emerald-500/40 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />
                <CardHeader className="pb-4 border-b border-white/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                          LICENÇA VÁLIDA & ATIVA
                        </Badge>
                        <Badge variant="outline" className="text-white/60 text-[10px] uppercase font-bold border-white/20">
                          {licenca.categoria || 'Produto Digital'}
                        </Badge>
                      </div>
                      <CardTitle className="text-2xl font-black text-white pt-1">
                        {licenca.produtoNome}
                      </CardTitle>
                    </div>

                    <div className="text-right sm:border-l sm:border-white/10 sm:pl-4">
                      <span className="text-[11px] text-white/40 block">Data de Emissão</span>
                      <span className="text-xs font-bold text-white/80">
                        {new Date(licenca.criadoEm).toLocaleDateString('pt-BR')} às {new Date(licenca.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  {/* Caixa da Chave Oficial */}
                  <div className="p-4 rounded-xl bg-black/70 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60 font-semibold flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-amber-400" />
                        Chave Oficial de Ativação:
                      </span>
                      <span className="text-emerald-400 font-bold uppercase text-[11px]">Uso Exclusivo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-4 py-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 font-mono text-emerald-400 font-black text-lg tracking-widest select-all text-center sm:text-left">
                        {licenca.chave}
                      </div>
                      <Button
                        onClick={() => copyKey(licenca.chave)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 px-4 shrink-0"
                      >
                        <Copy className="w-4 h-4 mr-1.5" />
                        Copiar
                      </Button>
                    </div>
                  </div>

                  {/* Informações do Comprador */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white/[0.02] p-3.5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-2 text-white/70">
                      <User className="w-4 h-4 text-white/40" />
                      <span>Comprador: <strong className="text-white">{licenca.clienteNome}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-white/70">
                      <MessageCircle className="w-4 h-4 text-emerald-400" />
                      <span>WhatsApp Vinculado: <strong className="text-white">{licenca.clienteWhatsapp}</strong></span>
                    </div>
                  </div>

                  {/* Instruções Específicas do Produto */}
                  {licenca.instrucoes && (
                    <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-1.5">
                      <h4 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Instruções de Acesso & Entrega
                      </h4>
                      <p className="text-xs text-white/80 leading-relaxed whitespace-pre-line">
                        {licenca.instrucoes}
                      </p>
                    </div>
                  )}

                  {/* Seção Exclusiva para Aplicativos (Mobile & TV) */}
                  {isAppProduct(licenca) ? (
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/30 to-indigo-950/30 border border-blue-500/30 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-base font-black text-white flex items-center gap-2">
                            <Smartphone className="w-5 h-5 text-cyan-400" />
                            Aplicativo Liberado para Instalação
                          </h4>
                          <p className="text-xs text-white/60 mt-1">
                            Este aplicativo foi personalizado com sua licença e está pronto para download em Celular Android, TV Box ou Android TV.
                          </p>
                        </div>
                      </div>

                      {licenca.downloadUrl ? (
                        <div className="pt-1">
                          <Button
                            asChild
                            size="lg"
                            className="w-full sm:w-auto h-12 px-8 font-black text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xl shadow-blue-600/30"
                          >
                            <a href={licenca.downloadUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="w-4 h-4 mr-2" />
                              Baixar Aplicativo APK Oficial
                            </a>
                          </Button>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                          ℹ️ O link direto do APK está sendo personalizado com sua logo e será enviado também no seu WhatsApp pela nossa equipe de suporte.
                        </div>
                      )}

                      {/* Guia Rápido de Instalação */}
                      <div className="border-t border-white/10 pt-4 space-y-2">
                        <span className="text-xs font-bold text-white/90 block">
                          Como instalar no seu Celular ou TV Box:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-white/70">
                          <div className="p-3 rounded-lg bg-black/40 border border-white/10 space-y-1">
                            <span className="text-emerald-400 font-bold block">Passo 1</span>
                            <span>Baixe o arquivo APK no seu dispositivo.</span>
                          </div>
                          <div className="p-3 rounded-lg bg-black/40 border border-white/10 space-y-1">
                            <span className="text-emerald-400 font-bold block">Passo 2</span>
                            <span>Autorize fontes desconhecidas se solicitado.</span>
                          </div>
                          <div className="p-3 rounded-lg bg-black/40 border border-white/10 space-y-1">
                            <span className="text-emerald-400 font-bold block">Passo 3</span>
                            <span>Abra o app e use sua chave para ativar.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Seção para Métodos, Cursos, Scripts e Outros Produtos */
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/30 to-violet-950/30 border border-purple-500/30 space-y-4">
                      <div>
                        <h4 className="text-base font-black text-white flex items-center gap-2">
                          <Package className="w-5 h-5 text-purple-400" />
                          Material & Conteúdo Liberado
                        </h4>
                        <p className="text-xs text-white/60 mt-1">
                          Sua chave dá acesso completo ao método, vídeos e ferramentas deste produto digital.
                        </p>
                      </div>

                      {licenca.downloadUrl ? (
                        <Button
                          asChild
                          size="lg"
                          className="w-full sm:w-auto h-12 px-8 font-black text-sm bg-purple-600 hover:bg-purple-500 text-white shadow-xl shadow-purple-600/30"
                        >
                          <a href={licenca.downloadUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Acessar Conteúdo / Pasta do Método
                          </a>
                        </Button>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
                          ℹ️ Caso precise de links complementares do método, nossa equipe está pronta para te atender no WhatsApp com sua chave informada.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ações de Suporte */}
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-white/10">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openWhatsappSupport(licenca.chave, licenca.produtoNome)}
                      className="w-full sm:w-auto border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Falar com Suporte sobre esta Licença
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/loja')}
                      className="text-white/60 hover:text-white"
                    >
                      Explorar Mais Produtos na Loja
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Não Encontrado */
              <Card className="bg-[#0D111D] border-red-500/30 text-white text-center p-8 space-y-4">
                <div className="w-14 h-14 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
                  <XCircle className="w-8 h-8" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-lg font-bold text-white">Chave de Licença Não Encontrada</h3>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Não encontramos nenhuma licença ativa com o código <strong className="text-white font-mono">{inputKey}</strong>.
                    Verifique se copiou todos os caracteres corretamente (ex: TIBIM-XXXX-XXXX-XXXX).
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    onClick={() => openWhatsappSupport(inputKey)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                  >
                    <MessageCircle className="w-4 h-4 mr-1.5" />
                    Solicitar Ajuda no WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setInputKey('');
                      setSearched(false);
                    }}
                    className="border-white/20 text-xs"
                  >
                    Tentar Outra Chave
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Histórico Recente de Licenças do Navegador */}
        {!searched && recentLicenses.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-white/10">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Suas Licenças Recentes neste Aparelho ({recentLicenses.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentLicenses.slice(0, 4).map((rec, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setInputKey(rec.chave);
                    handleSearch(rec.chave);
                  }}
                  className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-3">
                    <span className="text-xs font-bold text-white truncate block group-hover:text-emerald-400 transition-colors">
                      {rec.produtoNome}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 block mt-0.5">
                      {rec.chave}
                    </span>
                  </div>
                  <Badge variant="outline" className="border-white/20 text-[10px] text-white/60 shrink-0">
                    Consultar
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </LojaLayout>
  );
};

export default LojaConsultaLicenca;
