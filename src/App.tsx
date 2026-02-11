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
import { SimpleProtectedRoute } from "./components/SimpleProtectedRoute";
import { AdminProtectedRoute } from "./components/AdminProtectedRoute";
import { Layout } from "./components/Layout";
import Apresentacao from "./pages/Apresentacao";
import PrecosPublico from "./pages/PrecosPublico";
import Dashboard from "./pages/Dashboard";
import Conteudos from "./pages/Conteudos";
import Episodios from "./pages/Episodios";
import Banners from "./pages/Banners";
import Categorias from "./pages/Categorias";
import CategoriasTV from "./pages/CategoriasTV";
import CategoriasAnime from "./pages/CategoriasAnime";
import Duplicados from "./pages/Duplicados";
import DuplicadosEpisodios from "./pages/DuplicadosEpisodios";
import Usuarios from "./pages/Usuarios";
import Sessoes from "./pages/Sessoes";
import Plataformas from "./pages/Plataformas";
import Configuracoes from "./pages/Configuracoes";
import Recursos from "./pages/Recursos";
import ImportarM3U from "./pages/ImportarM3U";
import ImportacaoAutomatica from "./pages/ImportacaoAutomatica";
import AtualizacaoSeries from "./pages/AtualizacaoSeries";
import Perfil from "./pages/Perfil";
import HistoricoAcoes from "./pages/HistoricoAcoes";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminPlanosSolicitados from "./pages/AdminPlanosSolicitados";
import NotFound from "./pages/NotFound";
import Estatisticas from "./pages/Estatisticas";
import FerramentasIA from "./pages/FerramentasIA";
import AdicionarConteudo from "./pages/AdicionarConteudo";
import Produtos from "./pages/Produtos";
import SuporteAoVivo from "./pages/SuporteAoVivo";
import Precos from "./pages/Precos";
import PrecosInterno from "./pages/PrecosInterno";
import SubstituicaoURLs from "./pages/SubstituicaoURLs";
import ListaM3U from "./pages/ListaM3U";
import RelatoriosVisualizacao from "./pages/RelatoriosVisualizacao";
import MetricasEngajamento from "./pages/MetricasEngajamento";
import ImportarCanaisTV from "./pages/ImportarCanaisTV";
import Ofertas from "./pages/Ofertas";
import LimpezaDados from "./pages/LimpezaDados";
import MaxPlusImport from "./pages/MaxPlusImport";
import SistemaIndicacao from "./pages/SistemaIndicacao";
import ConfiguracoesAPIs from "./pages/ConfiguracoesAPIs";
import ConfiguracoesSeguranca from "./pages/ConfiguracoesSeguranca";
import ImportarConteudo from "./pages/ImportarConteudo";
import OfertaDetalhes from "./pages/OfertaDetalhes";
import ConfiguracoesAutoImport from "./pages/ConfiguracoesAutoImport";
import GestaoDispositivos from "./pages/GestaoDispositivos";
import Assinatura from "./pages/Assinatura";
import { UpdateNotificationModal } from "./components/UpdateNotificationModal";


const queryClient = new QueryClient();

const AppWithMonitor = () => {
  useExpirationMonitor();
  useScheduleExecutor();
  useAutoImportExecutor(); // ← NOVO: Verificador de importação automática
  useSubscriptionMonitor(); // ← NOVO: Monitor de notificações de assinatura
  return null;
};

const App = () => {
  try {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ThemeProvider>
            <AdminAuthProvider>
              <AdminConfigProvider>
                <SimpleAuthProvider>
                  {/* ✅ UserPermissionsProvider centralizado - apenas 1 listener Firebase */}
                  <UserPermissionsProvider>
                    <ConfigProvider>
                      <TypeModeProvider>
                        <CleanupProvider>
                          <CustomizationProvider>
                          <ZoomProvider>
                          <AppWithMonitor />
                          <UpdateNotificationModal />
                          <Sonner />
                          <BrowserRouter>
                            <Routes>
                              {/* Rota inicial - página de apresentação */}
                              <Route path="/" element={<Apresentacao />} />

                              {/* Rota de preços públicos */}
                              <Route path="/precos-publico" element={<PrecosPublico />} />

                              {/* Rotas de login - ambas agora dentro dos providers */}
                              <Route path="/login" element={<Login />} />
                              <Route path="/cadastro" element={<Cadastro />} />
                              <Route path="/assinatura" element={<Assinatura />} />
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
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <Conteudos />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/episodios" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <Episodios />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/lista-m3u" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <ListaM3U />
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

                              <Route path="/importacao-automatica" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <ImportacaoAutomatica />
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
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <Configuracoes />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/configuracoes-apis" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <ConfiguracoesAPIs />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/configuracoes-seguranca" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <ConfiguracoesSeguranca />
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              <Route path="/configuracoes-auto-import" element={
                                <SimpleProtectedRoute>
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

                              <Route path="/ferramentas-ia" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <FerramentasIA />
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

                              <Route path="/metricas-engajamento" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <MetricasEngajamento />
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

                              <Route path="/maxplus-import" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <PermissionGate feature="maxplus-import">
                                      <MaxPlusImport />
                                    </PermissionGate>
                                  </Layout>
                                </SimpleProtectedRoute>
                              } />

                              {/* Rota 404 - deve ser a última */}
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </BrowserRouter>
                          </ZoomProvider>
                          </CustomizationProvider>
                        </CleanupProvider>
                      </TypeModeProvider>
                    </ConfigProvider>
                  </UserPermissionsProvider>
                </SimpleAuthProvider>
              </AdminConfigProvider>
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
