import { ConteudoParaImportar } from '@/types/importacao';
import { Button } from '@/components/ui/button';
// import { tmdbService } from '@/services/TMDBService'; // Temporariamente desabilitado
const tmdbService = {
    getImageUrl: (path: string, size: string) => path ? `https://image.tmdb.org/t/p/${size}${path}` : '',
    getGenres: (genres: any[]) => genres?.map(g => g.name).join(', ') || '',
    formatVoteAverage: (vote: number) => vote?.toFixed(1) || '0.0',
    formatDate: (date: string) => date || ''
};
import { Loader2, Search, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';

interface ResultadosBuscaProps {
    conteudo: ConteudoParaImportar;
    carregando: boolean;
    onValidarAutomatico: () => void; // Nova prop para validação automática
    onPular: () => void;
}

export function ResultadosBusca({
    conteudo,
    carregando,
    onValidarAutomatico,
    onPular
}: ResultadosBuscaProps) {
    const tmdb = conteudo.tmdbData;

    if (carregando) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-[#76ff03]" />
                <p className="text-gray-400">Buscando no TMDB...</p>
            </div>
        );
    }

    if (conteudo.status === 'erro') {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3 border-l-4 border-red-500 pl-4">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                    <div>
                        <h2 className="text-2xl font-bold text-white">Erro na Busca</h2>
                        <p className="text-sm text-gray-400">{conteudo.erro}</p>
                    </div>
                </div>

                <div className="bg-[#1e1e1e] rounded-lg p-6 border border-red-500/30">
                    <p className="text-white mb-4">
                        Não foi possível encontrar: <span className="font-bold text-red-500">{conteudo.titulo}</span>
                    </p>
                    <Button
                        onClick={onPular}
                        className="w-full bg-gray-700 hover:bg-gray-600"
                    >
                        Pular e Continuar
                        <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            </div>
        );
    }

    if (!tmdb) {
        return null;
    }

    const posterUrl = tmdbService.getImageUrl(tmdb.poster_path, 'w500');
    const backdropUrl = tmdbService.getImageUrl(tmdb.backdrop_path, 'w780');
    const titulo = tmdb.title || tmdb.name || conteudo.titulo;
    const generos = tmdbService.getGenres(tmdb.genres);
    const nota = tmdbService.formatVoteAverage(tmdb.vote_average || 0);
    const dataLancamento = tmdbService.formatDate(tmdb.release_date || tmdb.first_air_date);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 border-l-4 border-[#76ff03] pl-4">
                <Search className="h-8 w-8 text-[#76ff03]" />
                <div>
                    <h2 className="text-2xl font-bold text-white">Resultado Encontrado</h2>
                    <p className="text-sm text-gray-400">O sistema irá buscar o melhor link automaticamente</p>
                </div>
            </div>

            {/* Card do Resultado */}
            <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800">
                {/* Backdrop */}
                <div
                    className="h-48 bg-cover bg-center relative"
                    style={{ backgroundImage: `url(${backdropUrl})` }}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e1e] to-transparent" />
                    <div className="absolute top-4 right-4 bg-[#76ff03] text-black px-3 py-1 rounded-full font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        Encontrado
                    </div>
                </div>

                {/* Conteúdo */}
                <div className="p-6 flex gap-6">
                    {/* Poster */}
                    <img
                        src={posterUrl}
                        alt={titulo}
                        className="w-32 h-48 object-cover rounded-lg shadow-lg"
                    />

                    {/* Informações */}
                    <div className="flex-1 space-y-3">
                        <h3 className="text-2xl font-bold text-white">{titulo}</h3>

                        <div className="flex items-center gap-4 text-sm">
                            <span className="px-2 py-1 bg-[#76ff03] text-black rounded font-semibold">
                                {conteudo.tipo}
                            </span>
                            <span className="text-gray-400">{dataLancamento}</span>
                            <span className="text-yellow-400 font-semibold">⭐ {nota}</span>
                        </div>

                        {generos && (
                            <p className="text-sm text-gray-400">
                                <span className="font-semibold text-white">Gêneros:</span> {generos}
                            </p>
                        )}

                        {conteudo.tipo === 'Serie' && tmdb.number_of_seasons && (
                            <p className="text-sm text-gray-400">
                                <span className="font-semibold text-white">Temporadas:</span> {tmdb.number_of_seasons}
                            </p>
                        )}

                        <p className="text-sm text-gray-300 line-clamp-3">
                            {tmdb.overview || 'Sem sinopse disponível'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Validação Automática */}
            <div className="bg-[#1e1e1e] rounded-lg p-6 border border-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-white">Validação Automática de Links</h3>
                        <p className="text-sm text-gray-400 mt-1">
                            O sistema tentará DUB primeiro, depois LEG automaticamente
                        </p>
                    </div>
                </div>
                <Button
                    onClick={onValidarAutomatico}
                    disabled={carregando}
                    className="w-full bg-[#76ff03] text-black hover:bg-[#69e600] font-semibold py-6 text-lg"
                >
                    {carregando ? (
                        <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Buscando links...
                        </>
                    ) : (
                        <>
                            🔍 Buscar Link Automaticamente
                        </>
                    )}
                </Button>
                <p className="text-xs text-gray-500 text-center mt-3">
                    ℹ️ Prioridade: Dublado (DUB) → Legendado (LEG)
                </p>
            </div>

            {/* Botão Pular */}
            <Button
                onClick={onPular}
                variant="outline"
                className="w-full border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white"
            >
                Pular Este Item
                <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
        </div>
    );
}
