import { EstadoImportacao } from '@/types/importacao';
import { Button } from '@/components/ui/button';
import { Database, Loader2, CheckCircle2 } from 'lucide-react';

interface CadastroFinalProps {
    estado: EstadoImportacao;
    carregando: boolean;
    onCadastrar: () => void;
}

export function CadastroFinal({ estado, carregando, onCadastrar }: CadastroFinalProps) {
    const conteudosProntos = estado.conteudosParaImportar.filter(c => c.status === 'pronto');
    const totalEpisodios = conteudosProntos.reduce(
        (acc, c) => acc + (c.episodios?.length || 0),
        0
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 border-l-4 border-[#76ff03] pl-4">
                <Database className="h-8 w-8 text-[#76ff03]" />
                <div>
                    <h2 className="text-2xl font-bold text-white">Pronto para Cadastrar</h2>
                    <p className="text-sm text-gray-400">Revise os itens antes de cadastrar</p>
                </div>
            </div>

            {/* Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#1e1e1e] rounded-lg p-4 border border-gray-800">
                    <p className="text-gray-400 text-sm mb-1">Conteúdos</p>
                    <p className="text-3xl font-bold text-[#76ff03]">{conteudosProntos.length}</p>
                </div>
                <div className="bg-[#1e1e1e] rounded-lg p-4 border border-gray-800">
                    <p className="text-gray-400 text-sm mb-1">Episódios</p>
                    <p className="text-3xl font-bold text-blue-500">{totalEpisodios}</p>
                </div>
                <div className="bg-[#1e1e1e] rounded-lg p-4 border border-gray-800">
                    <p className="text-gray-400 text-sm mb-1">Total de Itens</p>
                    <p className="text-3xl font-bold text-white">
                        {conteudosProntos.length + totalEpisodios}
                    </p>
                </div>
            </div>

            {/* Lista de Conteúdos */}
            <div className="bg-[#1e1e1e] rounded-lg p-6 border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4">Itens Prontos</h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {conteudosProntos.map((conteudo, index) => {
                        const tmdb = conteudo.tmdbData;
                        if (!tmdb) return null;

                        const titulo = tmdb.title || tmdb.name || conteudo.titulo;
                        const numEpisodios = conteudo.episodios?.length || 0;

                        return (
                            <div
                                key={index}
                                className="flex items-center gap-4 p-3 bg-[#121212] rounded-lg border border-gray-700"
                            >
                                <CheckCircle2 className="h-5 w-5 text-[#76ff03] flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-medium truncate">{titulo}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <span className="px-2 py-0.5 bg-[#76ff03]/20 text-[#76ff03] rounded">
                                            {conteudo.tipo}
                                        </span>
                                        <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded">
                                            {conteudo.idioma}
                                        </span>
                                        {numEpisodios > 0 && (
                                            <span className="text-gray-500">
                                                • {numEpisodios} episódios
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Botão de Cadastro */}
            {carregando ? (
                <div className="flex flex-col items-center justify-center py-8 gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-[#76ff03]" />
                    <p className="text-gray-400">Cadastrando no Baserow...</p>
                    <p className="text-xs text-gray-500">
                        Isso pode levar alguns minutos dependendo da quantidade
                    </p>
                </div>
            ) : (
                <Button
                    onClick={onCadastrar}
                    disabled={conteudosProntos.length === 0}
                    className="w-full bg-[#76ff03] text-black hover:bg-[#69e600] font-semibold py-8 text-xl"
                >
                    <Database className="h-6 w-6 mr-2" />
                    Cadastrar no APP ({conteudosProntos.length} {conteudosProntos.length === 1 ? 'item' : 'itens'})
                </Button>
            )}

            {/* Aviso */}
            <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
                <p className="text-yellow-400 text-sm">
                    ⚠️ A página será recarregada automaticamente após o cadastro
                </p>
            </div>
        </div>
    );
}
