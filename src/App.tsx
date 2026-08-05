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
import { useJogosDiaScheduleExecutor } from "@/hooks/useJogosDiaScheduleExecutor";
import { useAutoImportExecutor } from "@/hooks/useAutoImportExecutor";
import { useSubscriptionMonitor } from "@/hooks/useSubscriptionMonitor";
import { useApiKeyAutoBlocker } from "@/hooks/useApiKeyAutoBlocker";
import { useVersionCheck } from "@/hooks/useVersionCheck";
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
import DuplicadosEpisodiosOtimizado from "./pages/DuplicadosEpisodiosOtimizado";
import FerramentasIA from "./pages/FerramentasIA";
import Usuarios from "./pages/Usuarios";
import Sessoes from "./pages/Sessoes";
import Plataformas from "./pages/Plataformas";
import Configuracoes from "./pages/Configuracoes";
import Recursos from "./pages/Recursos";
import ImportarM3U from "./pages/ImportarM3U";
import ImportacaoAutomatica from "./pages/ImportacaoAutomatica";
import Miniseries from "./pages/Miniseries";
import AtualizacaoSeries from "./pages/AtualizacaoSeries";
import JogosDia from "./pages/JogosDia";
import Perfil from "./pages/Perfil";
import HistoricoAcoes from "./pages/HistoricoAcoes";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminPlanosSolicitados from "./pages/AdminPlanosSolicitados";
import NotFound from "./pages/NotFound";
import Estatisticas from "./pages/Estatisticas";
import AdicionarConteudo from "./pages/AdicionarConteudo";
import Produtos from "./pages/Produtos";
import SuporteAoVivo from "./pages/SuporteAoVivo";
import Precos from "./pages/Precos";
import PrecosInterno from "./pages/PrecosInterno";
import SubstituicaoURLs from "./pages/SubstituicaoURLs";
import Plano2 from "./pages/Plano2";
import Carrosseu from "./pages/Carrosseu";
import Versao from "./pages/Versao";
import Pedido from "./pages/Pedido";
import Avaliacao from "./pages/Avaliacao";
import CategoriaFilmes from "./pages/CategoriaFilmes";
import CategoriaSeries from "./pages/CategoriaSeries";
import CategoriaDorama from "./pages/CategoriaDorama";
import CategoriaAnimes from "./pages/CategoriaAnimes";
import CategoriaNovelas from "./pages/CategoriaNovelas";
import Perfis from "./pages/Perfis";
import MeusAplicativos from "./pages/MeusAplicativos";

import RelatoriosVisualizacao from "./pages/RelatoriosVisualizacao";

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
import Planos from "./pages/Planos";
import MinhaApi from "./pages/MinhaApi";
import ApiDocs from "./pages/ApiDocs";
import { UpdateNotificationModal } from "./components/UpdateNotificationModal";
import { M3UImportProvider } from "./contexts/M3UImportContext";


const queryClient = new QueryClient();

const AppWithMonitor = () => {
  useExpirationMonitor();
  useScheduleExecutor();
  useAutoImportExecutor();
  useJogosDiaScheduleExecutor(); // Novo executor de jogos
  useSubscriptionMonitor();
  useApiKeyAutoBlocker();
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
                                    <JogosDia />
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

                              <Route path="/minha-api" element={
                                <SimpleProtectedRoute>
                                  <Layout>
                                    <PermissionGate feature="minha-api">
                                      <MinhaApi />
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
