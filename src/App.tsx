import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import { UpdateNotificationModal } from "./components/UpdateNotificationModal";
import { M3UImportProvider } from "./contexts/M3UImportContext";

// 🚀 OTIMIZAÇÃO: Lazy Loading de todas as páginas para dividir o bundle de 5.2MB em micro-chunks
const Apresentacao = lazy(() => import("./pages/Apresentacao"));
const PrecosPublico = lazy(() => import("./pages/PrecosPublico"));
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
const Ofertas = lazy(() => import("./pages/Ofertas"));
const LimpezaDados = lazy(() => import("./pages/LimpezaDados"));
const MaxPlusImport = lazy(() => import("./pages/MaxPlusImport"));
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
                  <AdminConfigProvider>
                  {/* ✅ UserPermissionsProvider centralizado - apenas 1 listener Firebase */}
                  <UserPermissionsProvider>
                    <ConfigProvider>
                      <TypeModeProvider>
                        <CleanupProvider>
                          <CustomizationProvider>
                          <ZoomProvider>
                          <M3UImportProvider>
                          <AppWithMonitor />
                          <UpdateNotificationModal />
                          <Sonner />
                          <BrowserRouter>
                            <Suspense fallback={<PageLoadingFallback />}>
                              <Routes>
                              {/* Rota inicial - página de apresentação */}
                              <Route path="/" element={<Apresentacao />} />

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
                                  <AdminDashboard />
                                </AdminProtectedRoute>
                              } />

                              {/* Rota de planos solicitados - admin */}
                              <Route path="/admin/planos-solicitados" element={
                                <AdminProtectedRoute>
                                  <AdminPlanosSolicitados />
                                </AdminProtectedRoute>
                              } />

                              {/* Rota do dashboard do cliente */}
                              <Route path="/dashboard" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <Dashboard />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              {/* Rotas específicas do painel do cliente - protegidas */}
                              <Route path="/conteudos" element={
                                <SimpleProtectedRoute allowExpired>
                                  <Layout>
                                    <Conteudos />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/episodios" element={
                                <SimpleProtectedRoute allowExpired>
                                  <Layout>
                                    <Episodios />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />


                              <Route path="/banners" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <Banners />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/categorias" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <Categorias />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/categorias-tv" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <CategoriasTV />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/categorias-anime" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <CategoriasAnime />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/duplicados" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <Duplicados />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/duplicados-episodios" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <DuplicadosEpisodios />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/duplicados-episodios-otimizado" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <DuplicadosEpisodiosOtimizado />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/ferramentas-ia" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <FerramentasIA />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/usuarios" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <Usuarios />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/sessoes" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <Sessoes />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/plataformas" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <Plataformas />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/produtos" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <Produtos />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/produto/:id" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <ProdutoDetalhes />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/gerador-post" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <PermissionGate feature="gerador-post">
                                      <GeradorPost type="post" />
                                    </PermissionGate>
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/gerador-banner" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <PermissionGate feature="gerador-banner">
                                      <GeradorPost type="banner" />
                                    </PermissionGate>
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/carrinho" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <Carrinho />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/checkout" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <Checkout />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/suporte-ao-vivo" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <SuporteAoVivo />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/atualizacao-series" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <AtualizacaoSeries />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/jogos-dia" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <PermissionGate feature="jogos-dia">
                                      <JogosDia />
                                    </PermissionGate>
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/importacao-automatica" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <ImportacaoAutomatica />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/miniseries" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <Miniseries />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/substituicao-urls" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <SubstituicaoURLs />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/configuracoes" element={
                                <SimpleProtectedRoute allowExpired>
                                  <Layout>
                                    <Configuracoes />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/plano2" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <Plano2 />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/perfis" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <Perfis />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/meus-aplicativos" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <MeusAplicativos />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/meus-apps" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <PermissionGate feature="meus-app">
                                      <MeusApp />
                                    </PermissionGate>
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/meus-app" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <PermissionGate feature="meus-app">
                                      <MeusApp />
                                    </PermissionGate>
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/carrosseu" element={
                                <SimpleProtectedRoute allowExpired>
                                  <Layout>
                                    <Carrosseu />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/versao" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <Versao />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/pedido" element={
                                <SimpleProtectedRoute allowExpired>
                                  <Layout>
                                    <Pedido />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/avaliacao" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <Avaliacao />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/categoria-filmes" element={
                                <SimpleProtectedRoute allowExpired>
                                  <Layout>
                                    <CategoriaFilmes />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/categoria-series" element={
                                <SimpleProtectedRoute allowExpired>
                                  <Layout>
                                    <CategoriaSeries />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/categoria-dorama" element={
                                <SimpleProtectedRoute allowExpired>
                                  <Layout>
                                    <CategoriaDorama />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/categoria-animes" element={
                                <SimpleProtectedRoute allowExpired>
                                  <Layout>
                                    <CategoriaAnimes />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/categoria-novelas" element={
                                <SimpleProtectedRoute allowExpired>
                                  <Layout>
                                    <CategoriaNovelas />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/configuracoes-apis" element={
                                <SimpleProtectedRoute allowExpired>
                                  <Layout>
                                    <ConfiguracoesAPIs />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/configuracoes-seguranca" element={
                                <SimpleProtectedRoute allowExpired>
                                  <Layout>
                                    <ConfiguracoesSeguranca />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/configuracoes-auto-import" element={
                                <SimpleProtectedRoute allowExpired>
                                  <Layout>
                                    <ConfiguracoesAutoImport />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/recursos" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <Recursos />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/importar-m3u" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <ImportarM3U />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/estatisticas" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <Estatisticas />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />


                              <Route path="/adicionar-conteudo" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <AdicionarConteudo />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/importar-canais-tv" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <ImportarCanaisTV />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/importar-conteudo" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <ImportarConteudo />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />


                              <Route path="/precos" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <Precos />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/precos-interno" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <PrecosInterno />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/sistema-indicacao" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <SistemaIndicacao />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/relatorios-visualizacao" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <RelatoriosVisualizacao />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/perfil" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <Perfil />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/historico-acoes" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <PermissionGate feature="historico-acoes">
                                      <HistoricoAcoes />
                                    </PermissionGate>
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/gestao-dispositivos" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <PermissionGate feature="gestao-dispositivos">
                                      <GestaoDispositivos />
                                    </PermissionGate>
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/ofertas" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <Ofertas />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/oferta/:id" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <OfertaDetalhes />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/limpeza-dados" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <PermissionGate feature="clean-data">
                                      <LimpezaDados />
                                    </PermissionGate>
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/planos" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <Planos />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/status" element={
                                <SimpleProtectedRoute allowExpired>
                                  <Layout>
                                    <Status />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/statur" element={
                                <SimpleProtectedRoute allowExpired>
                                  <Layout>
                                    <Status />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/minha-api" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <PermissionGate feature="minha-api">
                                      <MinhaApi />
                                    </PermissionGate>
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/maxplus" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <PermissionGate feature="maxplus">
                                      <MaxPlus />
                                    </PermissionGate>
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/maxplus-import" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <PermissionGate feature="maxplus">
                                      <MaxPlus />
                                    </PermissionGate>
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              {/* Rota 404 - deve ser a última */}
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </Suspense>
                        </BrowserRouter>
                          </M3UImportProvider>
                          </ZoomProvider>
                          </CustomizationProvider>
                        </CleanupProvider>
                      </TypeModeProvider>
                    </ConfigProvider>
                  </UserPermissionsProvider>
                  </AdminConfigProvider>
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
