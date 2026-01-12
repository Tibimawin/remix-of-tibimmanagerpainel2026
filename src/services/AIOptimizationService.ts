
export class AIOptimizationService {
  private async callAI(prompt: string): Promise<string> {
    // Simulação de chamada de IA - Em produção, isso seria uma chamada real para OpenAI ou similar
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulação de diferentes tipos de resposta baseado no prompt
        if (prompt.includes('corrigir nome')) {
          resolve(this.generateCorrectedName(prompt));
        } else if (prompt.includes('gerar sinopse')) {
          resolve(this.generateSynopsis(prompt));
        } else if (prompt.includes('determinar tipo')) {
          resolve(this.determineType(prompt));
        } else if (prompt.includes('sugerir categorias')) {
          resolve(this.suggestCategories(prompt));
        } else {
          resolve('Resultado da IA');
        }
      }, 1000 + Math.random() * 2000); // Simula tempo de processamento
    });
  }

  private generateCorrectedName(prompt: string): string {
    // Extrai o nome do prompt e aplica correções comuns
    const nameMatch = prompt.match(/nome: "([^"]+)"/);
    if (!nameMatch) return 'Nome Corrigido';
    
    let name = nameMatch[1];
    
    // Correções comuns
    name = name.replace(/\s+/g, ' ').trim(); // Remove espaços extras
    name = name.replace(/^\w/, c => c.toUpperCase()); // Primeira letra maiúscula
    name = name.replace(/\b\w/g, c => c.toUpperCase()); // Primeira letra de cada palavra
    
    // Remove caracteres especiais desnecessários
    name = name.replace(/[^\w\s\-\:\.\,\!\?]/g, '');
    
    return name;
  }

  private generateSynopsis(prompt: string): string {
    const nameMatch = prompt.match(/nome: "([^"]+)"/);
    const name = nameMatch ? nameMatch[1] : 'este conteúdo';
    
    const synopses = [
      `${name} é uma produção que explora temas profundos e emocionantes, oferecendo uma experiência única aos espectadores. Com uma narrativa envolvente e personagens bem desenvolvidos, esta obra se destaca no cenário audiovisual.`,
      `Uma história cativante que acompanha os desafios e aventuras em ${name}. Com elementos de drama e suspense, esta produção promete prender a atenção do público do início ao fim.`,
      `${name} apresenta uma trama inovadora que mistura elementos tradicionais com uma abordagem contemporânea. Uma experiência cinematográfica que marca pela qualidade e originalidade.`,
      `Esta produção retrata de forma única os aspectos humanos e sociais em ${name}. Com direção competente e atuações marcantes, oferece entretenimento de qualidade para diversos públicos.`
    ];
    
    return synopses[Math.floor(Math.random() * synopses.length)];
  }

  private determineType(prompt: string): string {
    const nameMatch = prompt.match(/nome: "([^"]+)"/);
    if (!nameMatch) return 'Filme';
    
    const name = nameMatch[1].toLowerCase();
    
    // Lógica simples para determinar tipo baseado em palavras-chave
    if (name.includes('série') || name.includes('temporada') || name.includes('episódio')) {
      return 'Série';
    } else if (name.includes('tv') || name.includes('programa') || name.includes('show')) {
      return 'TV';
    } else {
      return 'Filme';
    }
  }

  private suggestCategories(prompt: string): string {
    const nameMatch = prompt.match(/nome: "([^"]+)"/);
    if (!nameMatch) return 'Drama';
    
    const name = nameMatch[1].toLowerCase();
    
    // Lógica simples para sugerir categorias baseado em palavras-chave
    const categories = [];
    
    if (name.includes('ação') || name.includes('guerra') || name.includes('luta')) {
      categories.push('Ação');
    }
    if (name.includes('amor') || name.includes('romance') || name.includes('coração')) {
      categories.push('Romance');
    }
    if (name.includes('comédia') || name.includes('engraçado') || name.includes('humor')) {
      categories.push('Comédia');
    }
    if (name.includes('terror') || name.includes('medo') || name.includes('assombr')) {
      categories.push('Terror');
    }
    if (name.includes('fantasia') || name.includes('mágico') || name.includes('dragão')) {
      categories.push('Fantasia');
    }
    if (name.includes('ficção') || name.includes('futuro') || name.includes('espaço')) {
      categories.push('Ficção Científica');
    }
    
    if (categories.length === 0) {
      categories.push('Drama');
    }
    
    return categories.join(', ');
  }

  async optimizeContent(contentData: any[], enabledOptions: any[]): Promise<any[]> {
    const results = [];
    
    for (const content of contentData) {
      console.log('Processando conteúdo:', content.Nome);
      
      const optimized: any = {};
      
      for (const option of enabledOptions) {
        let prompt = '';
        
        switch (option.id) {
          case 'nome':
            prompt = `Corrija e padronize este nome de filme/série: nome: "${content.Nome}"`;
            optimized.Nome = await this.callAI(prompt);
            break;
            
          case 'sinopse':
            prompt = `Gere uma sinopse profissional para: nome: "${content.Nome}"`;
            optimized.Sinopse = await this.callAI(prompt);
            break;
            
          case 'tipo':
            prompt = `Determine se é Filme, Série ou TV: nome: "${content.Nome}"`;
            optimized.Tipo = await this.callAI(prompt);
            break;
            
          case 'categorias':
            prompt = `Sugira categorias/gêneros para: nome: "${content.Nome}"`;
            optimized.Categoria = await this.callAI(prompt);
            break;
        }
      }
      
      results.push({
        id: content.id,
        original: {
          Nome: content.Nome,
          Sinopse: content.Sinopse || '',
          Tipo: content.Tipo || '',
          Categoria: content.Categoria || ''
        },
        optimized
      });
    }
    
    return results;
  }
}
