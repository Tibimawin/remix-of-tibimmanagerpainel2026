import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, ChevronRight, Star, Trash2 } from 'lucide-react';
import { getValueByPossibleKeys } from '@/utils/baserowHelpers';

interface Props {
  grupo: { key: string; records: any[]; fields: string[] };
  indice: number;
  aberto: boolean;
  onToggleAberto: () => void;
  selecionados: Record<string, boolean>;
  onToggleRegistro: (record: any, grupo: any) => void;
  onSelecionarGrupo: (grupo: any) => void;
  manterId: string;
  onExcluir: (record: any, grupo: any) => void;
  desabilitado?: boolean;
}

const field = (r: any, k: string) => {
  const v = getValueByPossibleKeys(r, k);
  if (v === undefined || v === null || v === '') return '';
  return typeof v === 'object' ? (v.value ?? v.name ?? '') : String(v);
};

export const GrupoDuplicado: React.FC<Props> = ({
  grupo,
  indice,
  aberto,
  onToggleAberto,
  selecionados,
  onToggleRegistro,
  onSelecionarGrupo,
  manterId,
  onExcluir,
  desabilitado,
}) => {
  const primeiro = grupo.records[0];
  const nome = field(primeiro, 'Nome') || 'Sem nome';
  const capa = field(primeiro, 'Capa');
  const tipo = field(primeiro, 'Tipo');
  const categoria = field(primeiro, 'Categoria');
  const selecionadosNoGrupo = grupo.records.filter(r => selecionados[String(r.id)]).length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4">
        <div className="flex items-start gap-3">
          <button
            onClick={onToggleAberto}
            className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={aberto ? 'Recolher grupo' : 'Expandir grupo'}
          >
            {aberto ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </button>

          {capa ? (
            <img
              src={capa}
              alt={`Capa de ${nome}`}
              loading="lazy"
              className="h-16 w-11 rounded object-cover bg-muted shrink-0"
              onError={e => ((e.target as HTMLImageElement).style.visibility = 'hidden')}
            />
          ) : (
            <div className="h-16 w-11 rounded bg-muted shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold truncate">{nome}</h3>
              <Badge variant="destructive">{grupo.records.length} cópias</Badge>
              {selecionadosNoGrupo > 0 && (
                <Badge variant="secondary">{selecionadosNoGrupo} marcadas</Badge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Grupo #{indice + 1}</span>
              {tipo && <Badge variant="outline">{tipo}</Badge>}
              {categoria && <Badge variant="outline" className="truncate max-w-[16rem]">{categoria}</Badge>}
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onSelecionarGrupo(grupo)}
            disabled={desabilitado}
          >
            Marcar extras
          </Button>
        </div>
      </CardHeader>

      {aberto && (
        <CardContent className="pt-0 px-4 pb-4">
          <div className="divide-y divide-border rounded-md border border-border">
            {grupo.records.map((record, i) => {
              const id = String(record.id);
              const manter = id === manterId;
              return (
                <div
                  key={id}
                  className={`flex items-start gap-3 p-3 transition-colors ${
                    manter ? 'bg-primary/5' : 'hover:bg-muted/40'
                  }`}
                >
                  <Checkbox
                    checked={!!selecionados[id]}
                    onCheckedChange={() => onToggleRegistro(record, grupo)}
                    disabled={desabilitado}
                    aria-label={`Selecionar cópia ${i + 1}`}
                    className="mt-1"
                  />

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono text-muted-foreground">Cópia #{i + 1}</span>
                      <span className="text-muted-foreground">ID: {id}</span>
                      {manter && (
                        <Badge className="gap-1">
                          <Star className="h-3 w-3" /> Manter
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Views</span>
                        <p className="font-medium">{field(record, 'Views') || '0'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Idioma</span>
                        <p className="font-medium">{field(record, 'Idioma') || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Lançamento</span>
                        <p className="font-medium">{field(record, 'Data de Lançamento') || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Temporadas</span>
                        <p className="font-medium">{field(record, 'Temporadas') || '-'}</p>
                      </div>
                    </div>

                    {field(record, 'Link') && (
                      <p className="text-xs text-muted-foreground truncate" title={field(record, 'Link')}>
                        <span className="font-medium">Link:</span> {field(record, 'Link')}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onExcluir(record, grupo)}
                    disabled={desabilitado}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    title="Excluir esta cópia"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
};
