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
} from 'lucide-react';
import {
  DiscoveryResult,
  DetectedTableMatch,
  TableKey,
  TABLE_DEFINITIONS,
} from '@/services/BaserowTableDiscoveryService';

interface BaserowDiscoveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discoveryResult: DiscoveryResult | null;
  onDatabaseChange: (databaseId: string | number) => void;
  onApply: (selectedMappings: Partial<Record<string, string>>) => void;
  isApplying?: boolean;
}

export const BaserowDiscoveryModal: React.FC<BaserowDiscoveryModalProps> = ({
  open,
  onOpenChange,
  discoveryResult,
  onDatabaseChange,
  onApply,
  isApplying = false,
}) => {
  const [selectedKeys, setSelectedKeys] = useState<Record<TableKey, boolean>>({} as any);

  // Inicializar todas as tabelas detectadas como marcadas
  useEffect(() => {
    if (discoveryResult) {
      const initial: Record<string, boolean> = {};
      Object.entries(discoveryResult.matches).forEach(([key, match]) => {
        if (match) {
          initial[key] = true;
        }
      });
      setSelectedKeys(initial as any);
    }
  }, [discoveryResult]);

  if (!discoveryResult) return null;

  const { databases, selectedDatabaseId, matches, unmatchedTables, totalMatched } =
    discoveryResult;

  const matchedList = Object.entries(matches)
    .filter(([_, match]) => match !== null)
    .map(([_, match]) => match as DetectedTableMatch);

  const missingDefs = TABLE_DEFINITIONS.filter((def) => !matches[def.key]);

  const toggleKey = (key: TableKey) => {
    setSelectedKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelectAll = (select: boolean) => {
    const updated: Record<string, boolean> = {};
    matchedList.forEach((m) => {
      updated[m.key] = select;
    });
    setSelectedKeys(updated as any);
  };

  const handleApply = () => {
    const toApply: Record<string, string> = {};
    matchedList.forEach((m) => {
      if (selectedKeys[m.key]) {
        toApply[m.key] = m.tableId;
      }
    });
    onApply(toApply);
  };

  const countSelected = Object.values(selectedKeys).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-gradient-to-r from-primary/10 via-background to-orange-500/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/20 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                Mapeamento Automático de Tabelas
              </DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                Revise os IDs detectados no seu banco do Baserow e selecione quais deseja aplicar.
              </DialogDescription>
            </div>
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
                    Os nomes das tabelas no seu Baserow não coincidem com os padrões conhecidos. 
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
                                  className="text-[10px] py-0 px-1.5 h-4 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                >
                                  Similar
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                              <span>Tabela Baserow:</span>
                              <strong className="text-foreground font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">
                                "{match.tableName}"
                              </strong>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-[11px] text-muted-foreground block">ID da Tabela</span>
                            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                              {match.tableId}
                            </span>
                          </div>
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
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  Tabelas Não Localizadas no Baserow ({missingDefs.length})
                </h4>
                <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    As seguintes tabelas do painel não tiveram correspondência no banco. Os campos correspondentes manterão o valor atual:
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
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

            {/* Seção 3: Tabelas que sobraram no Baserow (Para transparência) */}
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
