import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useBaserowService } from '@/services/BaserowService';
import { useConfig } from '@/contexts/ConfigContext';
import {
  useOptimizedDuplicates,
  MATCH_MODE_LABELS,
  MatchMode,
  normalizeValue,
} from '@/hooks/useOptimizedDuplicates';
import { GrupoDuplicado } from '@/components/duplicados/GrupoDuplicado';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  Trash2,
  RefreshCw,
  Settings,
  CheckCircle,
  Search,
  X,
  Layers,
  Database,
  ChevronDown,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getValueByPossibleKeys } from '@/utils/baserowHelpers';

const POR_PAGINA = 20;
const LOTE_EXCLUSAO = 50;

const num = (v: any) => {
  const n = parseInt(String(v ?? '0').replace(/\D/g, ''), 10);
  return isNaN(n) ? 0 : n;
};

/** Cópia recomendada para manter: mais views, empate = id mais antigo */
const escolherManter = (records: any[]): string => {
  const melhor = [...records].sort((a, b) => {
    const diff = num(getValueByPossibleKeys(b, 'Views')) - num(getValueByPossibleKeys(a, 'Views'));
    if (diff !== 0) return diff;
    return Number(a.id || 0) - Number(b.id || 0);
  })[0];
  return String(melhor?.id);
};

const Duplicados = () => {
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const [processingDelete, setProcessingDelete] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ feitos: 0, total: 0 });
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState<'copias' | 'nome'>('copias');
  const [pagina, setPagina] = useState(1);
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const cancelDeleteRef = useRef(false);

  const baserowService = useBaserowService();
  const { config, isConfigured } = useConfig();

  const {
    duplicates,
    loading,
    progress,
    error,
    findDuplicates,
    scanAll,
    cancelScan,
    removeRecordsLocally,
    totalRecords,
    recordsScanned,
    hasMoreData,
    totalExcedentes,
    matchMode,
    setMatchMode,
  } = useOptimizedDuplicates(config.tableIds?.conteudos || '');

  const manterPorGrupo = useMemo(() => {
    const map: Record<string, string> = {};
    duplicates.forEach(g => (map[g.key] = escolherManter(g.records)));
    return map;
  }, [duplicates]);

  const gruposFiltrados = useMemo(() => {
    const termo = normalizeValue(busca);
    let lista = duplicates;
    if (termo) {
      lista = lista.filter(g =>
        g.records.some(r => normalizeValue(getValueByPossibleKeys(r, 'Nome')).includes(termo))
      );
    }
    if (ordem === 'nome') {
      lista = [...lista].sort((a, b) =>
        normalizeValue(getValueByPossibleKeys(a.records[0], 'Nome')).localeCompare(
          normalizeValue(getValueByPossibleKeys(b.records[0], 'Nome'))
        )
      );
    }
    return lista;
  }, [duplicates, busca, ordem]);

  const totalPaginas = Math.max(1, Math.ceil(gruposFiltrados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const gruposVisiveis = gruposFiltrados.slice(
    (paginaAtual - 1) * POR_PAGINA,
    paginaAtual * POR_PAGINA
  );

  useEffect(() => setPagina(1), [busca, ordem, matchMode]);

  const iniciarVarredura = (completa = false) => {
    if (!isConfigured || !config.tableIds?.conteudos) {
      toast.error('Configure a conexão com o banco antes de verificar duplicatas.');
      return;
    }
    setSelectedRows({});
    completa ? scanAll() : findDuplicates();
  };

  useEffect(() => {
    if (isConfigured && config.tableIds?.conteudos) findDuplicates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfigured, config.tableIds?.conteudos]);

  // ---- seleção ----
  const toggleRegistro = (record: any, grupo: any) => {
    const id = String(record.id);
    setSelectedRows(prev => {
      const next = { ...prev, [id]: !prev[id] };
      const marcados = grupo.records.filter((r: any) => next[String(r.id)]).length;
      if (marcados >= grupo.records.length) {
        toast.warning('É preciso manter pelo menos uma cópia de cada grupo.');
        return prev;
      }
      return next;
    });
  };

  const marcarExtrasDoGrupo = (grupo: any) => {
    const manterId = manterPorGrupo[grupo.key];
    setSelectedRows(prev => {
      const next = { ...prev };
      grupo.records.forEach((r: any) => {
        const id = String(r.id);
        if (id !== manterId) next[id] = true;
      });
      return next;
    });
  };

  const desmarcarGrupo = (grupo: any) => {
    setSelectedRows(prev => {
      const next = { ...prev };
      grupo.records.forEach((r: any) => {
        delete next[String(r.id)];
      });
      return next;
    });
  };

  const marcarTodosExtras = (criterio: 'views' | 'antigo') => {
    const next: Record<string, boolean> = {};
    gruposFiltrados.forEach(g => {
      const manterId =
        criterio === 'views'
          ? manterPorGrupo[g.key]
          : String([...g.records].sort((a, b) => Number(a.id) - Number(b.id))[0]?.id);
      g.records.forEach(r => {
        const id = String(r.id);
        if (id !== manterId) next[id] = true;
      });
    });
    setSelectedRows(next);
    const total = Object.keys(next).length;
    toast.success(`${total} cópia(s) marcada(s) para exclusão.`);
  };

  const selectedIds = useMemo(
    () => Object.entries(selectedRows).filter(([, v]) => v).map(([id]) => id),
    [selectedRows]
  );

  // ---- exclusão ----
  const excluirIds = async (ids: string[]) => {
    if (!ids.length) return;
    cancelDeleteRef.current = false;
    setProcessingDelete(true);
    setDeleteProgress({ feitos: 0, total: ids.length });

    const removidos: string[] = [];
    let erros = 0;

    for (let i = 0; i < ids.length; i += LOTE_EXCLUSAO) {
      if (cancelDeleteRef.current) break;
      const lote = ids.slice(i, i + LOTE_EXCLUSAO);
      try {
        await baserowService.deleteRowsBatch(config.tableIds.conteudos, lote);
        removidos.push(...lote);
      } catch (err) {
        console.error('Erro ao excluir lote:', err);
        erros += lote.length;
      }
      setDeleteProgress({ feitos: Math.min(i + lote.length, ids.length), total: ids.length });
    }

    if (removidos.length) {
      removeRecordsLocally(removidos);
      toast.success(`${removidos.length} registro(s) excluído(s).`);
    }
    if (erros) toast.error(`${erros} registro(s) não puderam ser excluídos.`);
    if (cancelDeleteRef.current) toast.info('Exclusão cancelada.');

    setSelectedRows({});
    setProcessingDelete(false);
    setDeleteProgress({ feitos: 0, total: 0 });
  };

  const excluirSelecionados = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Excluir ${selectedIds.length} registro(s) selecionados?`)) return;
    await excluirIds(selectedIds);
  };

  const excluirUm = async (record: any, grupo: any) => {
    if (grupo.records.length <= 1) {
      toast.warning('Este grupo já tem apenas uma cópia.');
      return;
    }
    if (!window.confirm('Excluir este registro?')) return;
    await excluirIds([String(record.id)]);
  };

  if (!isConfigured) {
    return (
      <div className="w-full bg-background min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <Settings className="h-12 w-12 mb-4 mx-auto text-muted-foreground" />
              <CardTitle>Configuração Necessária</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-6">
                Para verificar duplicatas é necessário configurar a conexão com o banco de dados.
              </p>
              <Button onClick={() => (window.location.href = '/configuracoes')}>
                <Settings className="mr-2 h-4 w-4" /> Ir para Configurações
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-background min-h-screen py-8 px-4 sm:px-6 lg:px-8 animate-fade-in-up">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Duplicatas: Conteúdos</h1>
        <p className="text-muted-foreground mt-1">
          Encontre e remova conteúdos repetidos mantendo sempre uma cópia.
        </p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Grupos duplicados', valor: duplicates.length, icon: Layers },
          { label: 'Cópias excedentes', valor: totalExcedentes, icon: AlertTriangle },
          { label: 'Registros analisados', valor: recordsScanned, icon: Database },
          { label: 'Total na tabela', valor: totalRecords, icon: Database },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <item.icon className="h-4 w-4" />
                {item.label}
              </div>
              <p className="text-2xl font-bold">{item.valor.toLocaleString('pt-BR')}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {hasMoreData && !loading && (
        <Card className="mb-6 border-destructive/40">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-sm">
              A varredura analisou {recordsScanned.toLocaleString('pt-BR')} de{' '}
              {totalRecords.toLocaleString('pt-BR')} registros. Pode haver duplicatas fora dessa faixa.
            </p>
            <Button variant="outline" onClick={() => iniciarVarredura(true)}>
              Analisar tudo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Controles */}
      <Card className="mb-6">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar por nome..."
                className="pl-9"
              />
            </div>

            <Select value={matchMode} onValueChange={v => setMatchMode(v as MatchMode)}>
              <SelectTrigger className="w-full lg:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MATCH_MODE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={ordem} onValueChange={v => setOrdem(v as 'copias' | 'nome')}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="copias">Mais cópias primeiro</SelectItem>
                <SelectItem value="nome">Ordem alfabética</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => (loading ? cancelScan() : iniciarVarredura())}
              disabled={processingDelete}
              variant={loading ? 'outline' : 'default'}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Cancelar varredura' : 'Verificar novamente'}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={loading || processingDelete || !gruposFiltrados.length}
                >
                  Marcar todos extras <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => marcarTodosExtras('views')}>
                  Manter a cópia com mais views
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => marcarTodosExtras('antigo')}>
                  Manter a cópia mais antiga
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" variant="ghost" onClick={() => setSelectedRows({})} disabled={!selectedIds.length}>
              <X className="mr-1 h-4 w-4" /> Desmarcar todos
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={excluirSelecionados}
              disabled={!selectedIds.length || processingDelete}
              className="ml-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir selecionados ({selectedIds.length})
            </Button>
          </div>

          {processingDelete && (
            <div className="space-y-2">
              <Progress value={(deleteProgress.feitos / Math.max(1, deleteProgress.total)) * 100} />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Excluindo {deleteProgress.feitos} de {deleteProgress.total}...
                </span>
                <Button size="sm" variant="outline" onClick={() => (cancelDeleteRef.current = true)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conteúdo */}
      {loading ? (
        <Card>
          <CardContent className="text-center py-12 max-w-md mx-auto">
            <p className="mb-4">Analisando conteúdos...</p>
            <Progress value={progress} className="mb-2" />
            <p className="text-sm text-muted-foreground">
              {progress}% • {recordsScanned.toLocaleString('pt-BR')} registros lidos
            </p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-8 w-8 mb-2 mx-auto text-destructive" />
            <p className="text-destructive mb-2">Erro ao carregar duplicados</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => iniciarVarredura()} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : gruposFiltrados.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="h-8 w-8 mb-2 mx-auto text-primary" />
            <p className="text-lg font-medium mb-1">
              {busca ? 'Nenhum grupo corresponde à busca' : 'Nenhum conteúdo duplicado encontrado!'}
            </p>
            <p className="text-sm text-muted-foreground">
              {busca ? 'Tente outro termo.' : 'Todos os conteúdos analisados são únicos.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {gruposVisiveis.map((grupo, i) => (
            <GrupoDuplicado
              key={grupo.key}
              grupo={grupo}
              indice={(paginaAtual - 1) * POR_PAGINA + i}
              aberto={abertos[grupo.key] ?? false}
              onToggleAberto={() =>
                setAbertos(prev => ({ ...prev, [grupo.key]: !prev[grupo.key] }))
              }
              selecionados={selectedRows}
              onToggleRegistro={toggleRegistro}
              onSelecionarGrupo={marcarExtrasDoGrupo}
              manterId={manterPorGrupo[grupo.key]}
              onExcluir={excluirUm}
              desabilitado={processingDelete}
            />
          ))}

          {totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={paginaAtual === 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {paginaAtual} de {totalPaginas}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={paginaAtual === totalPaginas}
              >
                Próxima
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Duplicados;
