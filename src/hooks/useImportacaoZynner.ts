import { useState, useCallback } from 'react';
import {
    ConteudoParaImportar,
    TelaImportacao,
    EstadoImportacao,
    Conteudo,
    Episodio
} from '@/types/importacao';
// import { tmdbService } from '@/services/TMDBService'; // Temporariamente desabilitado - serviço não existe

// Mock temporário do tmdbService
const tmdbService = {
    searchMulti: async (query: string) => [],
    getDetails: async (id: number, type: string) => ({} as any),
    getGenres: (genres: any[]) => '',
    getImageUrl: (path: string, size: string) => '',
    formatVoteAverage: (vote: number) => '0.0',
    formatDate: (date: string) => '',
    formatRuntime: (runtime: any) => ''
};

import {
    validarLinkFilme,
    validarLinkSerie,
    gerarURLEpisodio,
    CATEGORIAS,
    BASEROW_IMPORT_CONFIG
} from '@/config/importacaoZynner';
import { BaserowService } from '@/services/BaserowService';
import { toast } from 'sonner';

export function useImportacaoZynner() {
    // 🔧 Usar configuração dedicada do Zynner
    const baserow = new BaserowService(
        BASEROW_IMPORT_CONFIG.token,
        BASEROW_IMPORT_CONFIG.url_base
    );

    const [estado, setEstado] = useState<EstadoImportacao>({
        telaAtual: 'formulario',
        listaOriginal: [],
        conteudosParaImportar: [],
        indiceAtual: 0,
        carregando: false,
        progresso: {
            total: 0,
            processados: 0,
            sucesso: 0,
            erros: 0
        }
    });

    /**
     * Processa a lista inicial de nomes
     */
    const processarLista = useCallback(async (
        texto: string,
        tipo: 'Filme' | 'Serie',
        categoriaPrincipal: string
    ) => {
        // Dividir por vírgula e limpar espaços
        const nomes = texto
            .split(',')
            .map(n => n.trim())
            .filter(n => n.length > 0);

        if (nomes.length === 0) {
            toast.error('Nenhum nome válido encontrado');
            return;
        }

        const conteudos: ConteudoParaImportar[] = nomes.map(nome => ({
            titulo: nome,
            tipo,
            categoriaPrincipal,
            status: 'pendente',
            idioma: 'DUB' // Padrão
        }));

        setEstado(prev => ({
            ...prev,
            listaOriginal: nomes,
            conteudosParaImportar: conteudos,
            progresso: {
                total: conteudos.length,
                processados: 0,
                sucesso: 0,
                erros: 0
            },
            telaAtual: 'busca'
        }));

        // Iniciar processamento do primeiro item
        await buscarProximoConteudo(0, conteudos);
    }, []);

    /**
     * Busca o próximo conteúdo da lista no TMDB
     */
    const buscarProximoConteudo = useCallback(async (
        indice: number,
        conteudosAtuais?: ConteudoParaImportar[]
    ) => {
        const conteudos = conteudosAtuais || estado.conteudosParaImportar;

        if (indice >= conteudos.length) {
            // Terminou todos
            setEstado(prev => ({ ...prev, telaAtual: 'completo', carregando: false }));
            toast.success('Processamento concluído!');
            return;
        }

        const conteudo = conteudos[indice];

        // Verificar se já existe no Baserow
        const jaExiste = await verificarDuplicata(conteudo.titulo);
        if (jaExiste) {
            toast.warning(`"${conteudo.titulo}" já existe no Baserow`);
            // Marcar como erro e pular
            conteudos[indice] = {
                ...conteudo,
                status: 'erro',
                erro: 'Duplicata encontrada'
            };
            setEstado(prev => ({
                ...prev,
                conteudosParaImportar: [...conteudos],
                indiceAtual: indice
            }));
            return;
        }

        setEstado(prev => ({ ...prev, carregando: true, indiceAtual: indice }));

        try {
            console.log(`🔍 Buscando "${conteudo.titulo}" no TMDB...`);

            const resultados = await tmdbService.searchMulti(conteudo.titulo);

            if (resultados.length === 0) {
                toast.error(`Não encontrado: "${conteudo.titulo}"`);
                conteudos[indice] = {
                    ...conteudo,
                    status: 'erro',
                    erro: 'Não encontrado no TMDB'
                };
            } else {
                // Pegar o primeiro resultado e buscar detalhes
                const primeiro = resultados[0];
                const mediaType = primeiro.media_type || (conteudo.tipo === 'Filme' ? 'movie' : 'tv');

                const detalhes = await tmdbService.getDetails(primeiro.id, mediaType);

                // 🔧 Detectar tipo real baseado no TMDB
                const tipoReal: 'Filme' | 'Serie' = mediaType === 'movie' ? 'Filme' : 'Serie';

                // Avisar se o tipo é diferente do selecionado
                if (tipoReal !== conteudo.tipo) {
                    toast.warning(`"${detalhes.title || detalhes.name}" foi encontrado como ${tipoReal}, não ${conteudo.tipo}`);
                }

                conteudos[indice] = {
                    ...conteudo,
                    tipo: tipoReal, // 🔧 Atualizar tipo baseado no TMDB
                    tmdbData: detalhes,
                    status: 'encontrado'
                };

                toast.success(`Encontrado: "${detalhes.title || detalhes.name}"`);
            }

            setEstado(prev => ({
                ...prev,
                conteudosParaImportar: [...conteudos],
                carregando: false,
                indiceAtual: indice
            }));

        } catch (error) {
            console.error('❌ Erro ao buscar TMDB:', error);
            toast.error(`Erro ao buscar "${conteudo.titulo}"`);

            conteudos[indice] = {
                ...conteudo,
                status: 'erro',
                erro: String(error)
            };

            setEstado(prev => ({
                ...prev,
                conteudosParaImportar: [...conteudos],
                carregando: false
            }));
        }
    }, [estado.conteudosParaImportar]);

    /**
     * Verifica se o conteúdo já existe no Baserow
     */
    const verificarDuplicata = async (nome: string): Promise<boolean> => {
        try {
            const resultado = await baserow.getAllTableData(BASEROW_IMPORT_CONFIG.id_conteudo, nome, 1);
            return resultado.results.length > 0;
        } catch (error) {
            console.error('Erro ao verificar duplicata:', error);
            return false;
        }
    };

    /**
     * Valida os links de streaming automaticamente
     * Tenta DUB primeiro, depois LEG se não encontrar
     */
    const validarLinksAutomatico = useCallback(async (indice: number) => {
        const conteudo = estado.conteudosParaImportar[indice];

        if (!conteudo.tmdbData) {
            toast.error('Dados do TMDB não encontrados');
            return;
        }

        setEstado(prev => ({ ...prev, carregando: true }));
        toast.info('🔍 Buscando link automaticamente...');

        try {
            if (conteudo.tipo === 'Filme') {
                const imdbId = conteudo.tmdbData.external_ids?.imdb_id;

                if (!imdbId) {
                    throw new Error('IMDb ID não encontrado');
                }

                // Tentar DUB primeiro
                console.log('🎬 Tentando DUB primeiro...');
                let resultado = await validarLinkFilme(imdbId, 'DUB');
                let idiomaEncontrado: 'DUB' | 'LEG' = 'DUB';

                // Se não encontrar DUB, tentar LEG
                if (!resultado) {
                    console.log('🎬 DUB não encontrado, tentando LEG...');
                    resultado = await validarLinkFilme(imdbId, 'LEG');
                    idiomaEncontrado = 'LEG';
                }

                if (resultado) {
                    const conteudos = [...estado.conteudosParaImportar];
                    conteudos[indice] = {
                        ...conteudo,
                        linkValidado: resultado.url,
                        servidor: resultado.servidor,
                        idioma: idiomaEncontrado,
                        status: 'validado'
                    };

                    setEstado(prev => ({
                        ...prev,
                        conteudosParaImportar: conteudos,
                        carregando: false,
                        telaAtual: 'edicao'
                    }));

                    toast.success(`✅ Link encontrado em ${idiomaEncontrado}!`);
                } else {
                    toast.error('❌ Nenhum link encontrado (tentado DUB e LEG)');
                    setEstado(prev => ({ ...prev, carregando: false }));
                }

            } else { // Série
                // Tentar DUB primeiro
                console.log('📺 Tentando DUB primeiro...');
                let resultado = await validarLinkSerie(conteudo.tmdbData.id, 'DUB');
                let idiomaEncontrado: 'DUB' | 'LEG' = 'DUB';

                // Se não encontrar DUB, tentar LEG
                if (!resultado) {
                    console.log('📺 DUB não encontrado, tentando LEG...');
                    resultado = await validarLinkSerie(conteudo.tmdbData.id, 'LEG');
                    idiomaEncontrado = 'LEG';
                }

                if (resultado) {
                    const conteudos = [...estado.conteudosParaImportar];
                    conteudos[indice] = {
                        ...conteudo,
                        servidor: resultado.servidor,
                        idioma: idiomaEncontrado,
                        status: 'validado'
                    };

                    setEstado(prev => ({
                        ...prev,
                        conteudosParaImportar: conteudos,
                        carregando: false,
                        telaAtual: 'edicao'
                    }));

                    toast.success(`✅ Servidor encontrado em ${idiomaEncontrado}!`);
                } else {
                    toast.error('❌ Nenhum servidor encontrado (tentado DUB e LEG)');
                    setEstado(prev => ({ ...prev, carregando: false }));
                }
            }

        } catch (error) {
            console.error('❌ Erro ao validar links:', error);
            toast.error('Erro ao validar links');
            setEstado(prev => ({ ...prev, carregando: false }));
        }
    }, [estado.conteudosParaImportar]);

    /**
     * DEPRECATED: Mantido para compatibilidade, mas use validarLinksAutomatico
     */
    const validarLinks = useCallback(async (indice: number, idioma: 'DUB' | 'LEG') => {
        // Apenas chama a versão automática agora
        await validarLinksAutomatico(indice);
    }, [validarLinksAutomatico]);

    /**
     * Gera episódios para uma série
     */
    const gerarEpisodios = useCallback((indice: number): Episodio[] => {
        const conteudo = estado.conteudosParaImportar[indice];

        if (!conteudo.tmdbData || !conteudo.servidor) {
            return [];
        }

        const episodios: Episodio[] = [];
        const nome = conteudo.tmdbData.name || conteudo.tmdbData.title || '';
        const tmdbId = conteudo.tmdbData.id;
        const seasons = conteudo.tmdbData.seasons || [];

        for (const season of seasons) {
            const temporada = season.season_number;
            const totalEpisodios = season.episode_count;

            for (let ep = 1; ep <= totalEpisodios; ep++) {
                const link = gerarURLEpisodio(
                    conteudo.servidor,
                    tmdbId,
                    temporada,
                    ep,
                    conteudo.idioma
                );

                episodios.push({
                    Nome: nome,
                    Link: link,
                    Temporada: temporada,
                    Episódio: ep
                });
            }
        }

        return episodios;
    }, [estado.conteudosParaImportar]);

    /**
     * Prepara conteúdo para cadastro
     */
    const prepararParaCadastro = useCallback((indice: number) => {
        const conteudo = estado.conteudosParaImportar[indice];

        if (!conteudo.tmdbData) {
            toast.error('Dados do TMDB não encontrados');
            return;
        }

        const tmdb = conteudo.tmdbData;
        const generos = tmdbService.getGenres(tmdb.genres);
        const categoria = `${generos}${generos ? ', ' : ''}${conteudo.categoriaPrincipal}`;

        // Se for série, gerar episódios
        let episodios: Episodio[] = [];
        if (conteudo.tipo === 'Serie') {
            episodios = gerarEpisodios(indice);
        }

        const conteudos = [...estado.conteudosParaImportar];
        conteudos[indice] = {
            ...conteudo,
            episodios,
            status: 'pronto'
        };

        setEstado(prev => ({
            ...prev,
            conteudosParaImportar: conteudos,
            telaAtual: 'cadastro'
        }));
    }, [estado.conteudosParaImportar, gerarEpisodios]);

    /**
     * Cadastra conteúdo e episódios no Baserow
     */
    const cadastrarNoBaserow = useCallback(async () => {
        const conteudosProntos = estado.conteudosParaImportar.filter(c => c.status === 'pronto');

        if (conteudosProntos.length === 0) {
            toast.error('Nenhum conteúdo pronto para cadastro');
            return;
        }

        setEstado(prev => ({ ...prev, carregando: true }));
        toast.info('Cadastrando no Baserow...');

        try {
            for (const conteudo of conteudosProntos) {
                if (!conteudo.tmdbData) continue;

                const tmdb = conteudo.tmdbData;
                const generos = tmdbService.getGenres(tmdb.genres);
                const categoria = `${generos}${generos ? ', ' : ''}${conteudo.categoriaPrincipal}`;

                const dataConteudo: Conteudo = {
                    Nome: tmdb.title || tmdb.name || conteudo.titulo,
                    Capa: tmdbService.getImageUrl(tmdb.poster_path, 'w780'),
                    "Capa de fundo": tmdbService.getImageUrl(tmdb.backdrop_path, 'original'),
                    Categoria: categoria,
                    Sinopse: tmdb.overview || '',
                    Link: conteudo.tipo === 'Filme' ? (conteudo.linkValidado || '') : 'vazio',
                    Tipo: conteudo.tipo,
                    Idioma: conteudo.idioma,
                    Views: 0,
                    Temporadas: tmdb.number_of_seasons || 0,
                    Imdb: tmdbService.formatVoteAverage(tmdb.vote_average || 0),
                    "Data de Lançamento": tmdbService.formatDate(tmdb.release_date || tmdb.first_air_date),
                    "Duração": tmdbService.formatRuntime(tmdb.runtime || tmdb.episode_run_time)
                };

                // Cadastrar conteúdo
                await baserow.createRow(BASEROW_IMPORT_CONFIG.id_conteudo, dataConteudo);
                console.log(`✅ Conteúdo cadastrado: ${dataConteudo.Nome}`);

                // Cadastrar episódios se for série
                if (conteudo.episodios && conteudo.episodios.length > 0) {
                    // Cadastrar em lotes de 99
                    for (let i = 0; i < conteudo.episodios.length; i += 99) {
                        const lote = conteudo.episodios.slice(i, i + 99);

                        for (const episodio of lote) {
                            await baserow.createRow(BASEROW_IMPORT_CONFIG.id_episodio, episodio);
                        }

                        console.log(`✅ Lote de ${lote.length} episódios cadastrado`);
                    }
                }
            }

            setEstado(prev => ({
                ...prev,
                carregando: false,
                progresso: {
                    ...prev.progresso,
                    sucesso: prev.progresso.sucesso + conteudosProntos.length
                }
            }));

            toast.success('Cadastro concluído!');

            // Aguardar um pouco e recarregar a página
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error('❌ Erro ao cadastrar:', error);
            toast.error('Erro ao cadastrar no Baserow');
            setEstado(prev => ({ ...prev, carregando: false }));
        }
    }, [estado.conteudosParaImportar, baserow]);

    /**
     * Pula o conteúdo atual
     */
    const pularConteudo = useCallback(() => {
        const proximoIndice = estado.indiceAtual + 1;
        buscarProximoConteudo(proximoIndice);
    }, [estado.indiceAtual, buscarProximoConteudo]);

    /**
     * Reinicia o processo
     */
    const reiniciar = useCallback(() => {
        setEstado({
            telaAtual: 'formulario',
            listaOriginal: [],
            conteudosParaImportar: [],
            indiceAtual: 0,
            carregando: false,
            progresso: {
                total: 0,
                processados: 0,
                sucesso: 0,
                erros: 0
            }
        });
    }, []);

    return {
        estado,
        processarLista,
        buscarProximoConteudo,
        validarLinks, // Deprecated, mas mantido para compatibilidade
        validarLinksAutomatico, // Nova função automática
        prepararParaCadastro,
        cadastrarNoBaserow,
        pularConteudo,
        reiniciar,
        categorias: CATEGORIAS
    };
}
