import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TMDBMetadata {
  title: string;
  poster?: string;
  backdrop?: string;
  overview?: string;
  releaseYear?: string;
  rating?: number;
  genres?: string[];
  cast?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, type } = await req.json();
    
    if (!title) {
      return new Response(
        JSON.stringify({ error: 'Title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');
    if (!TMDB_API_KEY) {
      console.error('TMDB_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'TMDB API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mediaType = type === 'Série' ? 'tv' : 'movie';
    
    console.log(`Searching TMDB for: ${title} (type: ${mediaType})`);
    
    // Buscar o conteúdo
    const searchUrl = `https://api.themoviedb.org/3/search/${mediaType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&language=pt-BR`;
    const searchResponse = await fetch(searchUrl);
    
    if (!searchResponse.ok) {
      console.error(`TMDB search failed: ${searchResponse.status}`);
      return new Response(
        JSON.stringify({ error: 'TMDB search failed' }),
        { status: searchResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.results || searchData.results.length === 0) {
      console.log(`No results found for: ${title}`);
      return new Response(
        JSON.stringify({ metadata: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firstResult = searchData.results[0];
    const itemId = firstResult.id;
    
    console.log(`Found: ${firstResult.title || firstResult.name} (ID: ${itemId})`);

    // Buscar detalhes completos incluindo credits
    const detailsUrl = `https://api.themoviedb.org/3/${mediaType}/${itemId}?api_key=${TMDB_API_KEY}&language=pt-BR&append_to_response=credits`;
    const detailsResponse = await fetch(detailsUrl);
    
    if (!detailsResponse.ok) {
      console.error(`TMDB details failed: ${detailsResponse.status}`);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch details' }),
        { status: detailsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const details = await detailsResponse.json();
    
    // Montar metadados
    const metadata: TMDBMetadata = {
      title: details.title || details.name || title,
      overview: details.overview || '',
      rating: details.vote_average || 0,
      genres: details.genres?.map((g: any) => g.name) || [],
      releaseYear: (details.release_date || details.first_air_date)?.split('-')[0] || '',
      poster: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : undefined,
      backdrop: details.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : undefined,
      cast: details.credits?.cast?.slice(0, 5).map((c: any) => c.name) || []
    };

    console.log(`Metadata retrieved for: ${metadata.title}`);

    return new Response(
      JSON.stringify({ metadata }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in tmdb-metadata function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
