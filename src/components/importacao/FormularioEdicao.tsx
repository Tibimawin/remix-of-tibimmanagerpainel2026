import { ConteudoParaImportar } from '@/types/importacao';
import { Button } from '@/components/ui/button';
// import { tmdbService } from '@/services/TMDBService'; // Temporariamente desabilitado
const tmdbService = {
    getImageUrl: (path: string, size: string) => path ? `https://image.tmdb.org/t/p/${size}${path}` : '',
    getGenres: (genres: any[]) => genres?.map(g => g.name).join(', ') || '',
    formatVoteAverage: (vote: number) => vote?.toFixed(1) || '0.0',
    formatDate: (date: string) => date || '',
    formatRuntime: (runtime: number) => {
        const hours = Math.floor(runtime / 60);
        const mins = runtime % 60;
        return `${hours}h ${mins}m`;
    }
};
import { Edit, Check, Loader2 } from 'lucide-react';

interface FormularioEdicaoProps {
    conteudo: ConteudoParaImportar;
    carregando: boolean;
    onConfirmar: () => void;
}

export function FormularioEdicao({
    conteudo,
    carregando,
    onConfirmar
}: FormularioEdicaoProps) {
    const tmdb = conteudo.tmdbData;

    if (!tmdb) {
        return null;
    }

    const posterUrl = tmdbService.getImageUrl(tmdb.poster_path, 'w500');
    const titulo = tmdb.title || tmdb.name || conteudo.titulo;
    const generos = tmdbService.getGenres(tmdb.genres);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 border-l-4 border-[#76ff03] pl-4">
                <Edit className="h-8 w-8 text-[#76ff03]" />
                <div>
                    <h2 className="text-2xl font-bold text-white">Validação de Links</h2>
                    <p className="text-sm text-gray-400">
                        {carregando ? 'Validando servidor...' : 'Link validado com sucesso'}
                    </p>
                </div>
            </div>

            {carregando ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-[#76ff03]" />
                    <p className="text-gray-400">Testando servidores de streaming...</p>
                    <p className="text-xs text-gray-500">Isso pode levar alguns segundos</p>
                </div>
            ) : (
                <>
                    {/* Informações do Conteúdo */}
                    <div className="bg-[#1e1e1e] rounded-lg p-6 border border-gray-800">
                        <div className="flex gap-6 mb-6">
                            <img
                                src={posterUrl}
                                alt={titulo}
                                className="w-24 h-36 object-cover rounded-lg shadow-lg"
                            />
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-white mb-2">{titulo}</h3>
                                <div className="flex items-center gap-3 text-sm mb-3">
                                    <span className="px-2 py-1 bg-[#76ff03] text-black rounded font-semibold">
                                        {conteudo.tipo}
                                    </span>
                                    <span className="px-2 py-1 bg-blue-600 text-white rounded font-semibold">
                                        {conteudo.idioma}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-400">
                                    <span className="font-semibold text-white">Categoria:</span> {generos}, {conteudo.categoriaPrincipal}
                                </p>
                            </div>
                        </div>

                        {/* Detalhes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-500 mb-1">Nota IMDb</p>
                                <p className="text-white font-semibold">
                                    ⭐ {tmdbService.formatVoteAverage(tmdb.vote_average || 0)}
                                </p>
                            </div>

                            <div>
                                <p className="text-gray-500 mb-1">Data de Lançamento</p>
                                <p className="text-white font-semibold">
                                    {tmdbService.formatDate(tmdb.release_date || tmdb.first_air_date)}
                                </p>
                            </div>

                            {conteudo.tipo === 'Filme' && tmdb.runtime && (
                                <div>
                                    <p className="text-gray-500 mb-1">Duração</p>
                                    <p className="text-white font-semibold">
                                        {tmdbService.formatRuntime(tmdb.runtime)}
                                    </p>
                                </div>
                            )}

                            {conteudo.tipo === 'Serie' && (
                                <div>
                                    <p className="text-gray-500 mb-1">Temporadas</p>
                                    <p className="text-white font-semibold">
                                        {tmdb.number_of_seasons || 0} temporadas
                                    </p>
                                </div>
                            )}

                            {conteudo.tipo === 'Filme' && conteudo.linkValidado && (
                                <div className="md:col-span-2">
                                    <p className="text-gray-500 mb-1">Link Validado</p>
                                    <p className="text-[#76ff03] font-mono text-xs break-all">
                                        {conteudo.linkValidado}
                                    </p>
                                </div>
                            )}

                            {conteudo.tipo === 'Serie' && conteudo.servidor && (
                                <div className="md:col-span-2">
                                    <p className="text-gray-500 mb-1">Servidor Validado</p>
                                    <p className="text-[#76ff03] font-mono text-xs break-all">
                                        {conteudo.servidor}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Episódios (apenas para séries) */}
                    {conteudo.tipo === 'Serie' && tmdb.seasons && tmdb.seasons.length > 0 && (
                        <div className="bg-[#1e1e1e] rounded-lg p-6 border border-gray-800">
                            <h3 className="text-lg font-semibold text-white mb-3">Episódios a Gerar</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {tmdb.seasons.map(season => (
                                    <div
                                        key={season.id}
                                        className="bg-[#121212] p-3 rounded-lg border border-gray-700"
                                    >
                                        <p className="text-white font-semibold text-sm">
                                            Temporada {season.season_number}
                                        </p>
                                        <p className="text-gray-400 text-xs">
                                            {season.episode_count} episódios
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-3">
                                Total de episódios: {tmdb.seasons.reduce((acc, s) => acc + s.episode_count, 0)}
                            </p>
                        </div>
                    )}

                    {/* Botão de Confirmação */}
                    <Button
                        onClick={onConfirmar}
                        className="w-full bg-[#76ff03] text-black hover:bg-[#69e600] font-semibold py-6 text-lg"
                    >
                        <Check className="h-5 w-5 mr-2" />
                        Confirmar e Preparar Cadastro
                    </Button>
                </>
            )}
        </div>
    );
}
