
import { tmdbService } from './TmdbService';

export interface ScrapedEpisode {
  nome: string;
  temporada: number;
  episodio: number;
  link: string;
}

export interface ScrapedContent {
  nome: string;
  linkCapa?: string;
  streamLink?: string;
  categoria?: string;
  sinopse?: string;
  tipo: 'Filme' | 'Série';
  views?: string;
  idioma?: string;
  temporadas?: number;
  episodios?: ScrapedEpisode[];
}

// Arrays de links base para verificação
const linkBaseFilmes = [
    'http://fhd1.oneplayer.site/toktergfer32tgdsvsdven/FHD1/',
    'http://fhd1.oneplayer.site/ertg43r5g34ty34yt543t43wer234t34t345/FHD10/',
    'http://fhd2.oneplayer.site/toktergfer32tgdsvsdven/FHD2/',
    'http://fhd3.oneplayer.site/toktergfer32tgdsvsdven/FHD3/',
    'http://fhd4.oneplayer.site/343rt342wtg34wetg34retg4rghy5rh/FHD4/',
];

const linkBaseSeries = [
    'http://fhd1.oneplayer.site.xyz/ertg43r5g34ty34yt543t43wer234t34t345/SHD11/',
    'http://fhd5.oneplayer.site/45y5ty5rtg345ert45r3t345ty345/SHD12/',
    'http://shd0.oneplayer.site/rfg54ry435y45y45y45y45y45rt23w4r324wt34tr34t3e4wtfg43/SHD0/',
    'http://shd2.oneplayer.site/5yu456y45tge4rtfg4w3ertf34t43retg54y65uj65uji/SHD2/',
    'http://shd1.oneplayer.site/y45y456y45y54eytg345t4rfwserdfwe4rtrf34t65435retyg/SHD1/',
];

/**
 * Verifica se uma URL de vídeo está acessível usando fetch.
 * Método mais confiável para dispositivos móveis.
 */
async function verificarVideo(url: string): Promise<boolean> {
  try {
    console.log('Verificando video:', url);
    
    // Usar fetch com HEAD request para verificar se o arquivo existe
    // sem baixar o conteúdo completo
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'Range': 'bytes=0-1023' // Solicitar apenas os primeiros 1KB
      }
    });
    
    const isValid = response.ok && (
      response.headers.get('content-type')?.includes('video') ||
      response.headers.get('content-type')?.includes('application/octet-stream') ||
      response.status === 200 || 
      response.status === 206 // Partial content para range requests
    );
    
    console.log(`Video ${isValid ? 'válido' : 'inválido'}:`, url, 'Status:', response.status);
    return isValid;
    
  } catch (error) {
    console.log('Erro ao verificar video:', url, error);
    return false;
  }
}

class MaxPlusService {
  async searchContent(name: string): Promise<ScrapedContent | null> {
    console.log('MaxPlusService.searchContent called with:', name);
    
    const isSerie = name.toLowerCase().includes('série');
    const tmdbType = isSerie ? 'tv' : 'movie';
    const queryName = name.replace(/série/ig, '').trim();

    console.log('Is serie:', isSerie, 'TMDB type:', tmdbType, 'Query name:', queryName);

    const tmdbData = await tmdbService.search(queryName, tmdbType);
    if (!tmdbData) {
      console.log(`Nenhum dado encontrado no TMDB para "${queryName}"`);
      return null;
    }
    
    console.log('TMDB data found:', tmdbData);
    
    if (isSerie) {
      if (!tmdbData.seasons) {
        console.log('No seasons found for series');
        return null;
      }

      let baseUrlFound = '';
      let idioma = '';

      console.log(`Verificando links para a série: ${tmdbData.nome}`);
      
      // Detectar se é dispositivo móvel para otimizar verificação
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      console.log('Dispositivo móvel detectado:', isMobile);
      
      for (const baseUrl of linkBaseSeries) {
        const urlDub = `${baseUrl}${tmdbData.id}/1x1.mp4`;
        console.log('Tentando URL DUB:', urlDub);
        if (await verificarVideo(urlDub)) {
          baseUrlFound = baseUrl;
          idioma = 'DUB';
          break;
        }
        
        // Em dispositivos móveis, adicionar pausa entre verificações
        if (isMobile) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        const urlLeg = `${baseUrl}${tmdbData.id}/1x1LEG.mp4`;
        console.log('Tentando URL LEG:', urlLeg);
        if (await verificarVideo(urlLeg)) {
          baseUrlFound = baseUrl;
          idioma = 'LEG';
          break;
        }
        
        // Pausa adicional entre bases em dispositivos móveis
        if (isMobile) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Para teste, vamos continuar mesmo sem link válido
      if (!baseUrlFound) {
        console.warn(`Nenhum link de série válido encontrado para ${tmdbData.nome}, usando dados do TMDB apenas`);
        baseUrlFound = linkBaseSeries[0]; // Use o primeiro como exemplo
        idioma = 'DUB';
      }
      
      console.log(`Link base encontrado: ${baseUrlFound}, Idioma: ${idioma}`);

      const episodios: ScrapedEpisode[] = [];
      tmdbData.seasons.forEach(season => {
        for (let i = 1; i <= Math.min(season.episode_count, 3); i++) { // Limitando a 3 episódios para teste
          episodios.push({
            nome: `T${season.season_number} E${i}`,
            temporada: season.season_number,
            episodio: i,
            link: `${baseUrlFound}${tmdbData.id}/${season.season_number}x${i}${idioma === 'LEG' ? 'LEG' : ''}.mp4`,
          });
        }
      });
      
      const result = {
        nome: tmdbData.nome,
        linkCapa: tmdbData.linkCapa,
        sinopse: tmdbData.sinopse,
        tipo: 'Série' as const,
        categoria: tmdbData.categoria,
        idioma,
        temporadas: tmdbData.seasons.length,
        episodios,
      };
      
      console.log('Returning series result:', result);
      return result;

    } else { // Filme
      let streamLink = '';
      let idioma = '';

      console.log(`Verificando links para o filme: ${tmdbData.nome}`);
      
      // Detectar se é dispositivo móvel para otimizar verificação
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Para filmes, vamos usar o ID do TMDB se não tiver imdb_id
      const movieId = tmdbData.imdb_id || tmdbData.id.toString();
      
      for (const baseUrl of linkBaseFilmes) {
        const urlDub = `${baseUrl}${movieId}.mp4`;
        console.log('Tentando URL DUB:', urlDub);
        if (await verificarVideo(urlDub)) {
          streamLink = urlDub;
          idioma = 'DUB';
          break;
        }
        
        // Em dispositivos móveis, adicionar pausa entre verificações
        if (isMobile) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        const urlLeg = `${baseUrl}${movieId}LEG.mp4`;
        console.log('Tentando URL LEG:', urlLeg);
        if (await verificarVideo(urlLeg)) {
          streamLink = urlLeg;
          idioma = 'LEG';
          break;
        }
        
        // Pausa adicional entre bases em dispositivos móveis
        if (isMobile) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      // Para teste, vamos continuar mesmo sem link válido
      if (!streamLink) {
        console.warn(`Nenhum link de filme válido encontrado para ${tmdbData.nome}, usando dados do TMDB apenas`);
        streamLink = `${linkBaseFilmes[0]}${movieId}.mp4`; // Use como exemplo
        idioma = 'DUB';
      }
      
      console.log(`Link encontrado: ${streamLink}, Idioma: ${idioma}`);

      const result = {
        nome: tmdbData.nome,
        linkCapa: tmdbData.linkCapa,
        streamLink,
        sinopse: tmdbData.sinopse,
        tipo: 'Filme' as const,
        categoria: tmdbData.categoria,
        idioma,
      };
      
      console.log('Returning movie result:', result);
      return result;
    }
  }
}

export const maxPlusService = new MaxPlusService();
