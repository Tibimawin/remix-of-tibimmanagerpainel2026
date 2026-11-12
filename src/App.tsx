import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ConfigProvider } from "./contexts/ConfigContext";
import { AdminConfigProvider } from "./contexts/AdminConfigContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TypeModeProvider } from "./contexts/TypeModeContext";
import { ZoomProvider } from "./contexts/ZoomContext";
import { CustomizationProvider } from "./contexts/CustomizationContext";
import { SimpleAuthProvider } from "./contexts/SimpleAuthContext";
import { UserPermissionsProvider } from "./contexts/UserPermissionsContext";
import { CleanupProvider } from "./contexts/CleanupContext";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import { PermissionGate } from "./components/PermissionGate";
import { useExpirationMonitor } from "@/hooks/useExpirationMonitor";
import { useScheduleExecutor } from "@/hooks/useScheduleExecutor";
import { useAutoImportExecutor } from "@/hooks/useAutoImportExecutor";
import { useSubscriptionMonitor } from "@/hooks/useSubscriptionMonitor";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { SimpleProtectedRoute } from "./components/SimpleProtectedRoute";
import { AdminProtectedRoute } from "./components/AdminProtectedRoute";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { UpdateNotificationModal } from "./components/UpdateNotificationModal";
import { ConsoleInspector } from "./components/ConsoleInspector";
import { M3UImportProvider } from "./contexts/M3UImportContext";
import { MaxPlusImportProvider } from "./contexts/MaxPlusImportContext";
import { MaxPlusFloatingProgress } from "./components/maxplus/MaxPlusFloatingProgress";
import { AppNameProvider } from "./contexts/AppNameContext";
import { LojaCartProvider } from "./contexts/LojaCartContext";

// 🚀 OTIMIZAÇÃO: Lazy Loading de todas as páginas para dividir o bundle de 5.2MB em micro-chunks
const Apresentacao = lazy(() => import("./pages/Apresentacao"));
const PrecosPublico = lazy(() => import("./pages/PrecosPublico"));
const LojaHome = lazy(() => import("./pages/loja/LojaHome"));
const LojaProdutoDetalhes = lazy(() => import("./pages/loja/LojaProdutoDetalhes"));
const LojaCarrinho = lazy(() => import("./pages/loja/LojaCarrinho"));
const LojaCheckout = lazy(() => import("./pages/loja/LojaCheckout"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Conteudos = lazy(() => import("./pages/Conteudos"));
const Episodios = lazy(() => import("./pages/Episodios"));
const Banners = lazy(() => import("./pages/Banners"));
const Categorias = lazy(() => import("./pages/Categorias"));
const CategoriasTV = lazy(() => import("./pages/CategoriasTV"));
const CategoriasAnime = lazy(() => import("./pages/CategoriasAnime"));
const Duplicados = lazy(() => import("./pages/Duplicados"));
const DuplicadosEpisodios = lazy(() => import("./pages/DuplicadosEpisodios"));
const DuplicadosEpisodiosOtimizado = lazy(() => import("./pages/DuplicadosEpisodiosOtimizado"));
const FerramentasIA = lazy(() => import("./pages/FerramentasIA"));
const Usuarios = lazy(() => import("./pages/Usuarios"));
const Sessoes = lazy(() => import("./pages/Sessoes"));
const Plataformas = lazy(() => import("./pages/Plataformas"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Recursos = lazy(() => import("./pages/Recursos"));
const ImportarM3U = lazy(() => import("./pages/ImportarM3U"));
const GeradorM3U = lazy(() => import("./pages/GeradorM3U"));
const MinhasRevendas = lazy(() => import("./pages/MinhasRevendas"));
const ResellerAuthProvider = lazy(() => import("./contexts/ResellerAuthContext").then(m => ({ default: m.ResellerAuthProvider })));
const ResellerLogin = lazy(() => import("./pages/revendas/ResellerLogin"));
const ResellerCadastro = lazy(() => import("./pages/revendas/ResellerCadastro"));
const ResellerLayout = lazy(() => import("./components/revendas/ResellerLayout").then(m => ({ default: m.ResellerLayout })));
const ResellerDashboard = lazy(() => import("./pages/revendas/ResellerDashboard"));
const ResellerComprarCreditos = lazy(() => import("./pages/revendas/ResellerComprarCreditos"));
const ResellerLinhas = lazy(() => import("./pages/revendas/ResellerLinhas"));
const ResellerGerarLinha = lazy(() => import("./pages/revendas/ResellerGerarLinha"));
const ImportacaoAutomatica = lazy(() => import("./pages/ImportacaoAutomatica"));
const Miniseries = lazy(() => import("./pages/Miniseries"));
const AtualizacaoSeries = lazy(() => import("./pages/AtualizacaoSeries"));
const JogosDia = lazy(() => import("./pages/JogosDia"));
const Perfil = lazy(() => import("./pages/Perfil"));
const HistoricoAcoes = lazy(() => import("./pages/HistoricoAcoes"));
const Login = lazy(() => import("./pages/Login"));
const Cadastro = lazy(() => import("./pages/Cadastro"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminPlanosSolicitados = lazy(() => import("./pages/AdminPlanosSolicitados"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Estatisticas = lazy(() => import("./pages/Estatisticas"));
const AdicionarConteudo = lazy(() => import("./pages/AdicionarConteudo"));
const Produtos = lazy(() => import("./pages/Produtos"));
const ProdutoDetalhes = lazy(() => import("./pages/ProdutoDetalhes"));
const SuporteAoVivo = lazy(() => import("./pages/SuporteAoVivo"));
const Precos = lazy(() => import("./pages/Precos"));
const PrecosInterno = lazy(() => import("./pages/PrecosInterno"));
const Carrinho = lazy(() => import("./pages/Carrinho"));
const Checkout = lazy(() => import("./pages/Checkout"));
const SubstituicaoURLs = lazy(() => import("./pages/SubstituicaoURLs"));
const Plano2 = lazy(() => import("./pages/Plano2"));
const Carrosseu = lazy(() => import("./pages/Carrosseu"));
const Versao = lazy(() => import("./pages/Versao"));
const Pedido = lazy(() => import("./pages/Pedido"));
const Avaliacao = lazy(() => import("./pages/Avaliacao"));
const CategoriaFilmes = lazy(() => import("./pages/CategoriaFilmes"));
const CategoriaSeries = lazy(() => import("./pages/CategoriaSeries"));
const CategoriaDorama = lazy(() => import("./pages/CategoriaDorama"));
const CategoriaAnimes = lazy(() => import("./pages/CategoriaAnimes"));
const CategoriaNovelas = lazy(() => import("./pages/CategoriaNovelas"));
const Perfis = lazy(() => import("./pages/Perfis"));
const MeusAplicativos = lazy(() => import("./pages/MeusAplicativos"));
const MeusApp = lazy(() => import("./pages/MeusApp"));
const RelatoriosVisualizacao = lazy(() => import("./pages/RelatoriosVisualizacao"));
const ImportarCanaisTV = lazy(() => import("./pages/ImportarCanaisTV"));
const VerificarLinks = lazy(() => import("./pages/VerificarLinks"));
const Ofertas = lazy(() => import("./pages/Ofertas"));
const LimpezaDados = lazy(() => import("./pages/LimpezaDados"));
const MaxPlus = lazy(() => import("./pages/MaxPlus"));
const SistemaIndicacao = lazy(() => import("./pages/SistemaIndicacao"));
const ConfiguracoesAPIs = lazy(() => import("./pages/ConfiguracoesAPIs"));
const ConfiguracoesSeguranca = lazy(() => import("./pages/ConfiguracoesSeguranca"));
const ImportarConteudo = lazy(() => import("./pages/ImportarConteudo"));
const OfertaDetalhes = lazy(() => import("./pages/OfertaDetalhes"));
const ConfiguracoesAutoImport = lazy(() => import("./pages/ConfiguracoesAutoImport"));
const GestaoDispositivos = lazy(() => import("./pages/GestaoDispositivos"));
const Planos = lazy(() => import("./pages/Planos"));
const MinhaApi = lazy(() => import("./pages/MinhaApi"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const GeradorPost = lazy(() => import("./pages/GeradorPost"));
const Status = lazy(() => import("./pages/Status"));
const BackupRestauracao = lazy(() => import("./pages/BackupRestauracao"));

// ⚡ Fallback elegante e ultraleve durante transições de rota
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[50vh] w-full" aria-busy="true">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      <span className="text-xs text-muted-foreground font-medium animate-pulse">Carregando painel...</span>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos de cache em memória
      gcTime: 1000 * 60 * 15,   // 15 minutos em garbage collection
      refetchOnWindowFocus: false, // Não re-disparar todas as requisições ao focar na janela
      retry: 1,
    },
  },
});

const AppWithMonitor = () => {
  useExpirationMonitor();
  useScheduleExecutor();
  useAutoImportExecutor();
  useSubscriptionMonitor();
  useVersionCheck();
  return null;
};

const App = () => {
  try {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ThemeProvider>
              <AdminAuthProvider>
                <SimpleAuthProvider>
                  <AppNameProvider>
                    <AdminConfigProvider>
                  {/* ✅ UserPermissionsProvider centralizado - apenas 1 listener Firebase */}
                  <UserPermissionsProvider>
                    <ConfigProvider>
                      <TypeModeProvider>
                        <CleanupProvider>
                          <CustomizationProvider>
                          <ZoomProvider>
                          <M3UImportProvider>
                          <MaxPlusImportProvider>
                          <AppWithMonitor />
                          <UpdateNotificationModal />
                          <ConsoleInspector />
                          <Sonner />
                          <LojaCartProvider>
                          <BrowserRouter>
                            <MaxPlusFloatingProgress />
                            <Suspense fallback={<PageLoadingFallback />}>
                              <Routes>
                              {/* Rota inicial - página de apresentação */}
                              <Route path="/" element={<Apresentacao />} />

                              {/* Loja Pública Independente */}
                              <Route path="/loja" element={<LojaHome />} />
                              <Route path="/loja/produto/:id" element={<LojaProdutoDetalhes />} />
                              <Route path="/loja/carrinho" element={<LojaCarrinho />} />
                              <Route path="/loja/checkout" element={<LojaCheckout />} />

                              {/* Rota de preços públicos */}
                              <Route path="/precos-publico" element={<PrecosPublico />} />
                              <Route path="/api-docs" element={<ApiDocs />} />

                              {/* Rotas de login - ambas agora dentro dos providers */}
                              <Route path="/login" element={<Login />} />
                              <Route path="/cadastro" element={<Cadastro />} />
                              <Route path="/admin-login" element={<AdminLogin />} />

                              {/* Rota do painel administrativo - protegida */}
                              <Route path="/admin-dashboard" element={
                                <AdminProtectedRoute>
                                  <ErrorBoundary>
                                    <AdminDashboard />
                                  </ErrorBoundary>
                                </AdminProtectedRoute>
                              } />

                              {/* Rota de planos solicitados - admin */}
                              <Route path="/admin/planos-solicitados" element={
                                <AdminProtectedRoute>
                                  <AdminPlanosSolicitados />
                                </AdminProtectedRoute>
                              } />

                              {/* Rotas do painel do cliente - Layout persistente compartilhado via Outlet */}
                              <Route element={<SimpleProtectedRoute><Layout /></SimpleProtectedRoute>}>
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/conteudos" element={<Conteudos />} />
                                <Route path="/episodios" element={<Episodios />} />
                                <Route path="/banners" element={<Banners />} />
                                <Route path="/categorias" element={<Categorias />} />
                                <Route path="/categorias-tv" element={<CategoriasTV />} />
                                <Route path="/categorias-anime" element={<CategoriasAnime />} />
                                <Route path="/duplicados" element={<Duplicados />} />
                                <Route path="/duplicados-episodios" element={<DuplicadosEpisodios />} />
                                <Route path="/duplicados-episodios-otimizado" element={<DuplicadosEpisodiosOtimizado />} />
                                <Route path="/ferramentas-ia" element={<FerramentasIA />} />
                                <Route path="/usuarios" element={<Usuarios />} />
                                <Route path="/sessoes" element={<Sessoes />} />
                                <Route path="/plataformas" element={<Plataformas />} />
                                <Route path="/produtos" element={<Produtos />} />
                                <Route path="/produto/:id" element={<ProdutoDetalhes />} />
                                <Route path="/gerador-post" element={<PermissionGate feature="gerador-post"><GeradorPost type="post" /></PermissionGate>} />
                                <Route path="/gerador-banner" element={<PermissionGate feature="gerador-banner"><GeradorPost type="banner" /></PermissionGate>} />
                                <Route path="/carrinho" element={<Carrinho />} />
                                <Route path="/checkout" element={<Checkout />} />
                                <Route path="/suporte-ao-vivo" element={<SuporteAoVivo />} />
                                <Route path="/atualizacao-series" element={<AtualizacaoSeries />} />
                                <Route path="/jogos-dia" element={<PermissionGate feature="jogos-dia"><JogosDia /></PermissionGate>} />
                                <Route path="/importacao-automatica" element={<ImportacaoAutomatica />} />
                                <Route path="/miniseries" element={<Miniseries />} />
                                <Route path="/substituicao-urls" element={<SubstituicaoURLs />} />
                                <Route path="/configuracoes" element={<Configuracoes />} />
                                <Route path="/plano2" element={<Plano2 />} />
                                <Route path="/perfis" element={<Perfis />} />
                                <Route path="/meus-aplicativos" element={<MeusAplicativos />} />
                                <Route path="/meus-apps" element={<PermissionGate feature="meus-app"><MeusApp /></PermissionGate>} />
                                <Route path="/meus-app" element={<PermissionGate feature="meus-app"><MeusApp /></PermissionGate>} />
                                <Route path="/carrosseu" element={<Carrosseu />} />
                                <Route path="/versao" element={<Versao />} />
                                <Route path="/pedido" element={<Pedido />} />
                                <Route path="/avaliacao" element={<Avaliacao />} />
                                <Route path="/categoria-filmes" element={<CategoriaFilmes />} />
                                <Route path="/categoria-series" element={<CategoriaSeries />} />
                                <Route path="/categoria-dorama" element={<CategoriaDorama />} />
                                <Route path="/categoria-animes" element={<CategoriaAnimes />} />
                                <Route path="/categoria-novelas" element={<CategoriaNovelas />} />
                                <Route path="/configuracoes-apis" element={<ConfiguracoesAPIs />} />
                                <Route path="/configuracoes-seguranca" element={<ConfiguracoesSeguranca />} />
                                <Route path="/configuracoes-auto-import" element={<ConfiguracoesAutoImport />} />
                                <Route path="/recursos" element={<Recursos />} />
                                <Route path="/importar-m3u" element={<ImportarM3U />} />
                                <Route path="/gerar-m3u" element={<PermissionGate feature="gerador-m3u"><GeradorM3U /></PermissionGate>} />
                                <Route path="/estatisticas" element={<Estatisticas />} />
                                <Route path="/adicionar-conteudo" element={<AdicionarConteudo />} />
                                <Route path="/importar-canais-tv" element={<ImportarCanaisTV />} />
                                <Route path="/verificar-links" element={<VerificarLinks />} />
                                <Route path="/importar-conteudo" element={<ImportarConteudo />} />
                                <Route path="/precos" element={<Precos />} />
                                <Route path="/precos-interno" element={<PrecosInterno />} />
                                <Route path="/sistema-indicacao" element={<SistemaIndicacao />} />
                                <Route path="/relatorios-visualizacao" element={<RelatoriosVisualizacao />} />
                                <Route path="/perfil" element={<Perfil />} />
                                <Route path="/historico-acoes" element={<PermissionGate feature="historico-acoes"><HistoricoAcoes /></PermissionGate>} />
                                <Route path="/gestao-dispositivos" element={<PermissionGate feature="gestao-dispositivos"><GestaoDispositivos /></PermissionGate>} />
                                <Route path="/ofertas" element={<Ofertas />} />
                                <Route path="/oferta/:id" element={<OfertaDetalhes />} />
                                <Route path="/limpeza-dados" element={<PermissionGate feature="clean-data"><LimpezaDados /></PermissionGate>} />
                                <Route path="/backup-restauracao" element={<BackupRestauracao />} />
                                <Route path="/planos" element={<Planos />} />
                                <Route path="/status" element={<Status />} />
                                <Route path="/statur" element={<Status />} />
                                <Route path="/minha-api" element={<PermissionGate feature="minha-api"><MinhaApi /></PermissionGate>} />
                                <Route path="/maxplus" element={<PermissionGate feature="maxplus"><MaxPlus /></PermissionGate>} />
                                {/* Minhas Revendas — aba do master no painel (permissão de plano) */}
                                <Route path="/minhas-revendas" element={<PermissionGate feature="minhas-revendas"><MinhasRevendas /></PermissionGate>} />
                              </Route>

                              <Route path="/maxplus-import" element={<Navigate to="/maxplus" replace />} />

                              {/* ===== Módulo de Revendas (créditos): rota própria, fora do painel ===== */}
                              <Route path="/revendas-creditos" element={
                                <ResellerAuthProvider>
                                  <Outlet />
                                </ResellerAuthProvider>
                              }>
                                <Route path="login" element={<ResellerLogin />} />
                                <Route path="cadastro" element={<ResellerCadastro />} />
                                <Route path="dashboard" element={
                                  <ResellerLayout>
                                    <ResellerDashboard />
                                  </ResellerLayout>
                                } />
                                <Route path="comprar-creditos" element={
                                  <ResellerLayout>
                                    <ResellerComprarCreditos />
                                  </ResellerLayout>
                                } />
                                <Route path="linhas" element={
                                  <ResellerLayout>
                                    <ResellerLinhas />
                                  </ResellerLayout>
                                } />
                                <Route path="gerar-linha" element={
                                  <ResellerLayout>
                                    <ResellerGerarLinha />
                                  </ResellerLayout>
                                } />
                                <Route index element={<Navigate to="/revendas-creditos/dashboard" replace />} />
                              </Route>

                              {/* Rota 404 - deve ser a última */}
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </Suspense>
                        </BrowserRouter>
                        </LojaCartProvider>
                          </MaxPlusImportProvider>
                          </M3UImportProvider>
                          </ZoomProvider>
                          </CustomizationProvider>
                        </CleanupProvider>
                      </TypeModeProvider>
                    </ConfigProvider>
                  </UserPermissionsProvider>
                  </AdminConfigProvider>
                  </AppNameProvider>
                </SimpleAuthProvider>
            </AdminAuthProvider>
          </ThemeProvider>
        </TooltipProvider>
      </QueryClientProvider>
    );
  } catch (error) {
    return (
      <div style={{ color: 'red', padding: 40, fontSize: 20, background: 'black' }}>
        Erro crítico na árvore de Providers/App: {error?.message?.toString() ?? String(error)}
      </div>
    );
  }
};

export default App;
