import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Archive, 
  DownloadCloud, 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  FileJson, 
  Sparkles, 
  RefreshCw, 
  Database, 
  Film, 
  Tv, 
  ListVideo, 
  Layers, 
  Image as ImageIcon, 
  Trophy, 
  Users, 
  Clapperboard, 
  ShieldCheck, 
  Info,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

import { useConfig } from '@/contexts/ConfigContext';
import { useBaserowService } from '@/services/BaserowService';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { useAppName } from '@/contexts/AppNameContext';
import { 
  backupService, 
  BACKUP_ENTITIES, 
  BackupEntityType, 
  BackupProgress, 
  BackupFileStructure,
  RestoreResult 
} from '@/services/BackupService';
import { isDemoSessionActive } from '@/services/BaserowDemoData';

const ENTITY_ICONS: Record<BackupEntityType, React.ElementType> = {
  conteudos: Film,
  episodios: ListVideo,
  canaisTv: Tv,
  miniseries: Clapperboard,
  miniseriesEpisodios: ListVideo,
  categorias: Layers,
  banners: ImageIcon,
  jogosDia: Trophy,
  plataformas: Layers,
  usuarios: Users
};

const BackupRestauracao: React.FC = () => {
  const { config, isConfigured } = useConfig();
  const baserowService = useBaserowService();
  const { userInfo } = useSimpleAuth();
  const { appDisplayName } = useAppName();
  const isDemo = isDemoSessionActive() || !!userInfo?.isDemo;

  // Estado da aba
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');

  // Estado de Exportação (Backup)
  const [selectedExportEntities, setSelectedExportEntities] = useState<BackupEntityType[]>(() =>
    BACKUP_ENTITIES.filter(e => e.defaultSelected).map(e => e.key)
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<BackupProgress | null>(null);

  // Estado de Importação (Restauração)
  const [uploadedBackup, setUploadedBackup] = useState<BackupFileStructure | null>(null);
  const [selectedImportEntities, setSelectedImportEntities] = useState<BackupEntityType[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<BackupProgress | null>(null);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seleção e alternância de entidades no Backup
  const toggleExportEntity = (key: BackupEntityType) => {
    setSelectedExportEntities(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const selectAllExport = () => {
    setSelectedExportEntities(BACKUP_ENTITIES.map(e => e.key));
  };

  const deselectAllExport = () => {
    setSelectedExportEntities([]);
  };

  // Executar Exportação
  const handleStartExport = async () => {
    if (selectedExportEntities.length === 0) {
      toast.warning('Selecione ao menos uma categoria para exportar.');
      return;
    }

    if (!isConfigured && !isDemo) {
      toast.error('Configure as credenciais e tabelas do Baserow em Configurações antes de exportar.');
      return;
    }

    try {
      setIsExporting(true);
      setExportProgress({
        stage: 'exporting',
        currentEntity: '',
        currentEntityLabel: 'Iniciando',
        entityProgress: 0,
        totalProgress: 0,
        processedItems: 0,
        totalItems: 0,
        message: 'Conectando ao banco de dados...'
      });

      const backup = await backupService.exportBackup(
        baserowService,
        config.tableIds || {},
        selectedExportEntities,
        appDisplayName,
        userInfo?.email,
        (progress) => setExportProgress(progress)
      );

      backupService.downloadBackupFile(backup, `backup-${appDisplayName.toLowerCase().replace(/\s+/g, '-')}`);
      toast.success('Backup exportado e baixado com sucesso!');
    } catch (err: any) {
      console.error('Erro na exportação de backup:', err);
      toast.error(`Falha ao exportar backup: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Upload e Validação de Arquivo de Backup
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Selecione um arquivo de backup no formato .json');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const validation = backupService.validateBackupFile(content);

      if (!validation.valid || !validation.data || !validation.metadata) {
        toast.error(validation.error || 'Arquivo de backup inválido.');
        setUploadedBackup(null);
        return;
      }

      const availableEntities = Object.keys(validation.data).filter(
        k => (validation.data as any)[k]?.length > 0
      ) as BackupEntityType[];

      const fileStructure: BackupFileStructure = {
        tibimBackup: true,
        version: validation.metadata.version,
        metadata: validation.metadata,
        data: validation.data
      };

      setUploadedBackup(fileStructure);
      setSelectedImportEntities(availableEntities);
      setRestoreResult(null);
      toast.success(`Arquivo validado! ${validation.metadata.totalRecords} itens identificados.`);
    };

    reader.onerror = () => {
      toast.error('Erro ao ler arquivo selecionado.');
    };

    reader.readAsText(file);
  };

  const toggleImportEntity = (key: BackupEntityType) => {
    setSelectedImportEntities(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Executar Restauração
  const handleStartRestore = async () => {
    if (!uploadedBackup || !uploadedBackup.data) {
      toast.error('Carregue um arquivo de backup antes de iniciar a restauração.');
      return;
    }

    if (selectedImportEntities.length === 0) {
      toast.warning('Selecione ao menos uma categoria para restaurar.');
      return;
    }

    if (!isConfigured && !isDemo) {
      toast.error('Configure as credenciais e tabelas do Baserow em Configurações antes de restaurar.');
      return;
    }

    try {
      setIsImporting(true);
      setRestoreResult(null);
      setImportProgress({
        stage: 'importing',
        currentEntity: '',
        currentEntityLabel: 'Iniciando',
        entityProgress: 0,
        totalProgress: 0,
        processedItems: 0,
        totalItems: 0,
        message: 'Iniciando motor de restauração...'
      });

      const result = await backupService.restoreBackup(
        baserowService,
        config.tableIds || {},
        uploadedBackup.data,
        {
          mode: 'merge',
          selectedEntities: selectedImportEntities
        },
        (progress) => setImportProgress(progress)
      );

      setRestoreResult(result);
      if (result.success) {
        toast.success(`Restauração concluída! ${result.totalRestored} registros processados.`);
      } else {
        toast.warning(`Restauração concluída com avisos: ${result.errors.length} falhas.`);
      }
    } catch (err: any) {
      console.error('Erro na restauração de backup:', err);
      toast.error(`Falha crítica na restauração: ${err?.message || 'Erro de conexão'}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header com Visual Hero */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-6 md:p-10 shadow-2xl shadow-primary/5"
      >
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-[100px] pointer-events-none" />
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs font-bold uppercase tracking-wider text-primary">
              <ShieldCheck className="h-4 w-4" />
              Segurança & Continuidade dos Dados
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
              Central de Backup & Restauração
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm md:text-base leading-relaxed">
              Exporte todo o seu catálogo (Filmes, Séries, Episódios, Canais, Banners e Categorias) em um arquivo compactado seguro ou restaure para qualquer painel ou tabela com 1 clique.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md text-xs font-medium text-muted-foreground w-full sm:w-auto justify-center">
              <Database className="h-4 w-4 text-primary" />
              {isDemo ? (
                <span className="text-amber-400 font-semibold">Modo Demonstração (Memória)</span>
              ) : isConfigured ? (
                <span className="text-emerald-400 font-semibold">Baserow Conectado</span>
              ) : (
                <span className="text-yellow-400 font-semibold">Aguardando Configuração</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs Principais: Exportar e Restaurar */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md h-12 p-1 bg-white/5 border border-white/10 rounded-2xl">
          <TabsTrigger
            value="export"
            className="flex items-center gap-2 text-sm font-semibold rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
          >
            <DownloadCloud className="h-4 w-4" />
            Exportar Catálogo
          </TabsTrigger>
          <TabsTrigger
            value="import"
            className="flex items-center gap-2 text-sm font-semibold rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
          >
            <UploadCloud className="h-4 w-4" />
            Restaurar Backup
          </TabsTrigger>
        </TabsList>

        {/* ======================================================== */}
        {/* ABA 1: EXPORTAR BACKUP                                  */}
        {/* ======================================================== */}
        <TabsContent value="export" className="space-y-6 focus-visible:outline-none">
          <Card className="border border-white/10 bg-card/60 backdrop-blur-xl rounded-3xl shadow-xl overflow-hidden">
            <CardHeader className="p-6 md:p-8 border-b border-white/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl md:text-2xl font-bold flex items-center gap-3">
                    <Archive className="h-6 w-6 text-primary" />
                    Selecione o que deseja exportar
                  </CardTitle>
                  <CardDescription className="text-sm mt-1">
                    Marque as tabelas e dados que farão parte do arquivo de backup consolidado.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllExport}
                    disabled={isExporting}
                    className="rounded-xl border-white/10 hover:bg-white/5 text-xs"
                  >
                    Marcar Todos
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deselectAllExport}
                    disabled={isExporting}
                    className="rounded-xl hover:bg-white/5 text-xs text-muted-foreground"
                  >
                    Desmarcar
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 md:p-8 space-y-6">
              {/* Grade de Entidades */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {BACKUP_ENTITIES.map(entity => {
                  const Icon = ENTITY_ICONS[entity.key];
                  const isChecked = selectedExportEntities.includes(entity.key);

                  return (
                    <div
                      key={entity.key}
                      onClick={() => !isExporting && toggleExportEntity(entity.key)}
                      className={`relative flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                        isChecked
                          ? 'border-primary/50 bg-primary/10 shadow-lg shadow-primary/5'
                          : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04] opacity-80'
                      }`}
                    >
                      <div className="pt-0.5">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleExportEntity(entity.key)}
                          disabled={isExporting}
                          className="rounded-md data-[state=checked]:bg-primary"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${isChecked ? 'text-primary' : 'text-muted-foreground'}`} />
                          <Label className="text-sm font-semibold cursor-pointer text-foreground">
                            {entity.label}
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {entity.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Informações do Arquivo */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">Formato Padronizado Tibim:</span> O backup é gerado em formato JSON criptograficamente estruturado e compactado, contendo links de capas em alta resolução, sinopses originais, links de streams e associações diretas entre episódios e temporadas.
                </div>
              </div>

              {/* Progresso de Exportação */}
              {isExporting && exportProgress && (
                <div className="space-y-3 p-5 rounded-2xl border border-primary/30 bg-primary/10">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-primary font-semibold flex items-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      {exportProgress.message}
                    </span>
                    <span className="text-foreground font-bold">{exportProgress.totalProgress}%</span>
                  </div>
                  <Progress value={exportProgress.totalProgress} className="h-2 rounded-full" />
                </div>
              )}
            </CardContent>

            <CardFooter className="p-6 md:p-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{selectedExportEntities.length}</span> categoria(s) selecionada(s) para o arquivo de backup.
              </div>
              <Button
                size="lg"
                onClick={handleStartExport}
                disabled={isExporting || selectedExportEntities.length === 0}
                className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xl shadow-primary/20 gap-3"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Gerando Backup...
                  </>
                ) : (
                  <>
                    <DownloadCloud className="h-5 w-5" />
                    Gerar e Baixar Backup (.json)
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* ABA 2: RESTAURAR BACKUP                                  */}
        {/* ======================================================== */}
        <TabsContent value="import" className="space-y-6 focus-visible:outline-none">
          <Card className="border border-white/10 bg-card/60 backdrop-blur-xl rounded-3xl shadow-xl overflow-hidden">
            <CardHeader className="p-6 md:p-8 border-b border-white/5">
              <CardTitle className="text-xl md:text-2xl font-bold flex items-center gap-3">
                <UploadCloud className="h-6 w-6 text-primary" />
                Restaurar Backup do Catálogo
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                Envie o arquivo .json gerado previamente para reinserir ou clonar seus conteúdos no painel.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 md:p-8 space-y-6">
              {/* Dropzone de Upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />

              {!uploadedBackup ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative flex flex-col items-center justify-center p-10 md:p-14 border-2 border-dashed border-white/15 hover:border-primary/50 rounded-3xl bg-white/[0.01] hover:bg-primary/[0.03] transition-all cursor-pointer text-center space-y-4"
                >
                  <div className="h-16 w-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <FileJson className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-foreground">
                      Clique para selecionar o arquivo de backup (.json)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Suporta arquivos exportados pelo Tibim Manager ou coleções em formato JSON compatível.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-xl border-white/10 mt-2">
                    Navegar nos Arquivos
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Resumo do Arquivo Carregado */}
                  <div className="p-5 rounded-2xl border border-primary/30 bg-primary/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                        <FileJson className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base text-foreground">
                            {uploadedBackup.metadata.appName || 'Backup Tibim'}
                          </h4>
                          <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
                            v{uploadedBackup.metadata.version || '1.0'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                          <Clock className="h-3 w-3" />
                          Gerado em: {new Date(uploadedBackup.metadata.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block">Total no Arquivo</span>
                        <span className="text-lg font-black text-primary">
                          {uploadedBackup.metadata.totalRecords} itens
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setUploadedBackup(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        disabled={isImporting}
                        className="rounded-xl border-white/10 hover:bg-white/10 text-xs"
                      >
                        Trocar Arquivo
                      </Button>
                    </div>
                  </div>

                  {/* Checklist de Itens para Restaurar */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold text-foreground">
                        Selecione quais categorias restaurar:
                      </Label>
                      <div className="text-xs text-muted-foreground">
                        {selectedImportEntities.length} selecionadas
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {BACKUP_ENTITIES.map(entity => {
                        const count = uploadedBackup.metadata.counts[entity.key] || 0;
                        if (count === 0 && !uploadedBackup.data[entity.key]) return null;

                        const Icon = ENTITY_ICONS[entity.key];
                        const isChecked = selectedImportEntities.includes(entity.key);

                        return (
                          <div
                            key={entity.key}
                            onClick={() => !isImporting && toggleImportEntity(entity.key)}
                            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                              isChecked
                                ? 'border-primary/40 bg-primary/5'
                                : 'border-white/5 bg-white/[0.02] opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => toggleImportEntity(entity.key)}
                                disabled={isImporting}
                                className="rounded-md"
                              />
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-primary" />
                                <span className="text-xs font-semibold text-foreground">
                                  {entity.label}
                                </span>
                              </div>
                            </div>
                            <Badge variant="secondary" className="bg-white/10 text-xs">
                              {count}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Progresso de Restauração */}
                  {isImporting && importProgress && (
                    <div className="space-y-3 p-5 rounded-2xl border border-primary/30 bg-primary/10">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-primary font-semibold flex items-center gap-2">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          {importProgress.message}
                        </span>
                        <span className="text-foreground font-bold">{importProgress.totalProgress}%</span>
                      </div>
                      <Progress value={importProgress.totalProgress} className="h-2 rounded-full" />
                    </div>
                  )}

                  {/* Resumo Final de Conclusão */}
                  {restoreResult && (
                    <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-3">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                        <CheckCircle2 className="h-5 w-5" />
                        Restauração Concluída com Sucesso!
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Foram inseridos <span className="font-semibold text-foreground">{restoreResult.totalRestored}</span> registros no banco de dados. Os vínculos entre séries e episódios foram sincronizados automaticamente.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>

            {uploadedBackup && (
              <CardFooter className="p-6 md:p-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Preserva temporadas, metadados e vínculos entre séries e episódios.
                </div>
                <Button
                  size="lg"
                  onClick={handleStartRestore}
                  disabled={isImporting || selectedImportEntities.length === 0}
                  className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xl shadow-emerald-600/20 gap-3"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      Restaurando Catálogo...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-5 w-5" />
                      Iniciar Restauração em 1 Clique
                    </>
                  )}
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BackupRestauracao;
