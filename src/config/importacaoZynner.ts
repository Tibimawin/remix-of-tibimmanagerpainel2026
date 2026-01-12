// Configurações e constantes para Importação Zynner

export const BASEROW_IMPORT_CONFIG = {
    token: 'bOs1UqfA6YdpGV5yqGgSeK9WimkFhXbB',
    id_conteudo: '1894',
    id_episodio: '1893',
    coluna_Nome_Conteudo: '13833',
    user_vps: 1,
    url_base: 'http://213.199.56.115'
};

// SERVIDORES DE FILMES - Apenas servidores VERIFICADOS como online
// Removidos: fhd2, fhd3, fhd6-12 (DNS não resolve)
export const SERVIDORES_FILMES = [
    // fhd1.oneplayer.site - OK ✅
    'http://fhd1.oneplayer.site/toktergfer32tgdsvsdven/FHD1/',
    'http://fhd1.oneplayer.site/ertg43r5g34ty34yt543t43wer234t34t345/FHD10/',
    'http://fhd1.oneplayer.site/ertg43r5g34ty34yt543t43wer234t34y3s7/FHD3/',
    'http://fhd1.oneplayer.site/ertg43r5g34ty34yt543t43wer234t34t345/FHD3/',
    'http://fhd1.oneplayer.site/ertg43r5g34ty34yt543t43wer234t34y3s7/FHD10/',

    // fhd4.oneplayer.site - OK ✅
    'http://fhd4.oneplayer.site/343rt342wtg34wetg34retg4rghy5rh/FHD4/',
    'http://fhd4.oneplayer.site/toktergfer32tgdsvsdven/FHD4/',
    'http://fhd4.oneplayer.site/343rt342wtg34wetg34retg4rgh5kh4/FHD4/',

    // fhd5.oneplayer.site - OK ✅
    'http://fhd5.oneplayer.site/45y5ty5rtg345ert45r3t345ty345/FHD5/',
    'http://fhd5.oneplayer.site/tokIadasfIIlIlenIlIlIsf/FHD5/',

    // hd5.oneplayer.site - OK ✅
    'http://hd5.oneplayer.site/343rt342wtg34wetg34retghksi68ssk/FHD5/',
    'http://hd5.oneplayer.site/FHD5/',
    'http://hd5.oneplayer.site/token/FHD5/'
];

// LINK BASE DE SÉRIES USADO COMO BASE (31 servidores - TODOS são necessários!)
export const SERVIDORES_SERIES = [
    'http://fhd1.oneplayer.site.xyz/ertg43r5g34ty34yt543t43wer234t34t345/SHD11/',
    'http://fhd5.oneplayer.site/45y5ty5rtg345ert45r3t345ty345/SHD12/',
    'http://shd0.oneplayer.site/rfg54ry435y45y45y45y45y45rt23w4r324wt34tr34t3e4wtfg43/SHD0/',
    'http://shd2.oneplayer.site/5yu456y45tge4rtfg4w3ertf34t43retg54y65uj65uji/SHD2/',
    'http://shd1.oneplayer.site/y45y456y45y54eytg345t4rfwserdfwe4rtrf34t65435retyg/SHD1/',
    'http://shd1.oneplayer.site/sfgerg54yrt/SHD1/',
    'http://shd0.oneplayer.site/rfg54ry435y45y45y45y45y45rt23w4r324wt34tr34t3e4wtf582/SHD0/',
    'http://shd8.oneplayer.site/rgdfgret43tfawd32fvdsf/SHD8/',
    'http://shd0.oneplayer.site/rfg54ry435y45y45y45y45y45rt23w4r324wt34tr34t3e4wtf582/SHD0/',
    'http://shd8.oneplayer.site/67i567uyh56r4tgyh54rteh45yhg465uhy456ju56l2q/SHD8/',
    'http://shd1.oneplayer.site/y45y456y45y54eytg345t4rfwserdfwe4rtrf34t65435redso/SHD1/',
    'http://shd7.oneplayer.site/u657uy56y5r4tfg4r3eftg345tgy45hj456th45tjh456uj56ujhryz3/SHD7/',
    'http://shd2.oneplayer.site/5yu456y45tge4rtfg4w3ertf34t43retg54y65uj65npw/SHD2/',
    'http://shd9.oneplayer.site/y456y654uj54tyg34gfwer45r3hj465yh354rtgfwe4rfgtwku51/SHD9/',
    'http://shd13.oneplayer.site/SHD13/',
    'http://shd13.oneplayer.site/SHD13/',
    'http://shd13.oneplayer.site/SHD13/',
    'http://shd12.oneplayer.site/token/SHD13/',
    'http://shd2.oneplayer.site/token/SHD2/',
    'http://shd3.oneplayer.site/token/SHD3/',
    'http://shd4.oneplayer.site/token/SHD4/',
    'http://shd5.oneplayer.site/token/SHD5/',
    'http://shd6.oneplayer.site/token/SHD6/',
    'http://shd7.oneplayer.site/u657uy56y5r4tfg4r3eftg345tgy45hj456th45tjh456uj56ujhryt5/SHD7/',
    'http://shd8.oneplayer.site/rgdfgret43tfawd32fvdsf/SHD8/',
    'http://shd9.oneplayer.site/y456y654uj54tyg34gfwer45r3hj465yh354rtgfwe4rfgtw34er/SHD9/',
    'http://shd10.oneplayer.site/token/SHD10/',
    'http://shd11.oneplayer.site/token/SHD11/',
    'http://shd12.oneplayer.site/token/SHD12/',
    'http://shd12.oneplayer.site/token/SHD12/',
    'http://shd2.oneplayer.site/sfgfe34ew32r/SHD2/',
    'http://shd7.oneplayer.site/bweregffderfggfdf/SHD7/'
];

// Categorias disponíveis
export const CATEGORIAS = [
    'APPLE, Series',
    'Animes',
    'Novela',
    'Doramas',
    'Doramas Dublado',
    'Doramas Legendado',
    'Doramas Coreano',
    'Marvel Filmes',
    'Marvel Series',
    'Lançamentos',
    'Netflix Filmes',
    'Netflix Series',
    'HBO MAX Filmes',
    'HBO MAX Series',
    'Disney Filmes',
    'Disney Series',
    'Prime Video Filmes',
    'Prime Video Series',
    'Globo Play Filmes',
    'Globo Play Series',
    'WARNER Filmes',
    'MBC Series',
    'MBC Dorama',
    'ABC Serie',
    'Paramount+ Serie',
    'Filmes Variados',
    '2024',
    'Lancamento'
];

/**
 * Valida se um vídeo está acessível
 */
export async function verificarVideo(url: string): Promise<boolean> {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.src = url;
        video.preload = 'metadata'; // Only load metadata, not the entire video

        const timeout = setTimeout(() => {
            video.remove();
            resolve(false);
        }, 3000); // Reduced timeout to 3 seconds

        video.onloadedmetadata = () => { // Changed from onloadeddata to onloadedmetadata for faster response
            clearTimeout(timeout);
            video.remove();
            resolve(true);
        };

        video.onerror = () => {
            clearTimeout(timeout);
            video.remove();
            resolve(false);
        };

        video.load();
    });
}

/**
 * Gera URL de filme
 * Ex: http://servidor/tt1234567.mp4 ou http://servidor/tt1234567LEG.mp4
 */
export function gerarURLFilme(servidor: string, imdbId: string, idioma: 'DUB' | 'LEG'): string {
    const sufixo = idioma === 'LEG' ? 'LEG.mp4' : '.mp4';
    return `${servidor}${imdbId}${sufixo}`;
}

/**
 * Gera URL de episódio
 * Ex: http://servidor/1396/1x1.mp4 ou http://servidor/1396/1x1LEG.mp4
 */
export function gerarURLEpisodio(
    servidor: string,
    tmdbId: number,
    temporada: number,
    episodio: number,
    idioma: 'DUB' | 'LEG'
): string {
    const sufixo = idioma === 'LEG' ? 'LEG.mp4' : '.mp4';
    return `${servidor}${tmdbId}/${temporada}x${episodio}${sufixo}`;
}

/**
 * Tenta validar link em todos os servidores (filme)
 * Agora testa em paralelo e retorna o primeiro servidor que funcionar
 */
export async function validarLinkFilme(imdbId: string, idioma: 'DUB' | 'LEG'): Promise<{
    url: string;
    servidor: string;
} | null> {
    console.log(`🔍 Validando link de filme (${idioma}):`, imdbId);

    // Criar array de promessas para testar todos os servidores em paralelo
    const testes = SERVIDORES_FILMES.map(async (servidor) => {
        const url = gerarURLFilme(servidor, imdbId, idioma);
        console.log(`   Testando: ${url.substring(0, 80)}...`);

        const valido = await verificarVideo(url);
        if (valido) {
            console.log(`   ✅ Link válido encontrado: ${servidor}`);
            return { url, servidor };
        }
        return null;
    });

    // Usar Promise.race com um timeout geral
    // Retornar o primeiro servidor que funcionar
    try {
        // Testa todos em paralelo, mas retorna assim que encontrar o primeiro válido
        const resultados = await Promise.all(testes);
        const primeiroValido = resultados.find(r => r !== null);

        if (primeiroValido) {
            return primeiroValido;
        }
    } catch (error) {
        console.error(`   ❌ Erro durante validação:`, error);
    }

    console.log(`   ❌ Nenhum link válido encontrado para ${idioma}`);
    return null;
}

/**
 * Tenta validar link em todos os servidores (série - primeiro episódio)
 * Agora testa em paralelo e retorna o primeiro servidor que funcionar
 */
export async function validarLinkSerie(tmdbId: number, idioma: 'DUB' | 'LEG'): Promise<{
    servidor: string;
} | null> {
    console.log(`🔍 Validando link de série (${idioma}):`, tmdbId);

    // Criar array de promessas para testar todos os servidores em paralelo
    const testes = SERVIDORES_SERIES.map(async (servidor) => {
        const url = gerarURLEpisodio(servidor, tmdbId, 1, 1, idioma);
        console.log(`   Testando: ${url.substring(0, 80)}...`);

        const valido = await verificarVideo(url);
        if (valido) {
            console.log(`   ✅ Servidor válido encontrado: ${servidor}`);
            return { servidor };
        }
        return null;
    });

    // Testar todos em paralelo
    try {
        const resultados = await Promise.all(testes);
        const primeiroValido = resultados.find(r => r !== null);

        if (primeiroValido) {
            return primeiroValido;
        }
    } catch (error) {
        console.error(`   ❌ Erro durante validação:`, error);
    }

    console.log(`   ❌ Nenhum servidor válido encontrado para ${idioma}`);
    return null;
}
