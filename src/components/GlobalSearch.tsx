
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Search, X, FileText, Users, Settings, BarChart3, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  category: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const searchResults: SearchResult[] = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'Visão geral do sistema',
      path: '/dashboard',
      icon: <BarChart3 className="h-4 w-4" />,
      category: 'Navegação'
    },
    {
      id: 'status',
      title: 'Status do Plano',
      description: 'Dias restantes e funcionalidades ativas',
      path: '/status',
      icon: <BarChart3 className="h-4 w-4" />,
      category: 'Navegação'
    },
    {
      id: 'conteudos',
      title: 'Conteúdos',
      description: 'Gerenciar filmes e séries',
      path: '/conteudos',
      icon: <FileText className="h-4 w-4" />,
      category: 'Conteúdo'
    },
    {
      id: 'usuarios',
      title: 'Usuários',
      description: 'Gerenciar usuários do sistema',
      path: '/usuarios',
      icon: <Users className="h-4 w-4" />,
      category: 'Usuários'
    },
    {
      id: 'configuracoes',
      title: 'Configurações',
      description: 'Configurações do sistema',
      path: '/configuracoes',
      icon: <Settings className="h-4 w-4" />,
      category: 'Sistema'
    },
    {
      id: 'episodios',
      title: 'Episódios',
      description: 'Gerenciar episódios das séries',
      path: '/episodios',
      icon: <FileText className="h-4 w-4" />,
      category: 'Conteúdo'
    },
    {
      id: 'maxplus',
      title: 'MaxPlus',
      description: 'Puxador automático de conteúdos e importador para Baserow',
      path: '/maxplus',
      icon: <Sparkles className="h-4 w-4" />,
      category: 'Conteúdo'
    },
    {
      id: 'banners',
      title: 'Banners',
      description: 'Gerenciar banners do sistema',
      path: '/banners',
      icon: <FileText className="h-4 w-4" />,
      category: 'Conteúdo'
    },
    {
      id: 'categorias',
      title: 'Categorias',
      description: 'Gerenciar categorias de conteúdo',
      path: '/categorias',
      icon: <FileText className="h-4 w-4" />,
      category: 'Conteúdo'
    }
  ];

  const filteredResults = searchResults.filter(result =>
    result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    result.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
    setSearchQuery('');
  };

  const groupedResults = filteredResults.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <CommandDialog open={isOpen} onOpenChange={onClose}>
      <CommandInput
        placeholder="Pesquisar páginas, conteúdo, usuários..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>
          Nenhum resultado encontrado para "{searchQuery}".
        </CommandEmpty>
        {Object.entries(groupedResults).map(([category, results]) => (
          <CommandGroup key={category} heading={category}>
            {results.map((result) => (
              <CommandItem
                key={result.id}
                value={result.title}
                onSelect={() => handleSelect(result.path)}
                className="flex items-center space-x-3 cursor-pointer"
              >
                {result.icon}
                <div className="flex-1">
                  <div className="font-medium">{result.title}</div>
                  <div className="text-sm text-muted-foreground">{result.description}</div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
};

export default GlobalSearch;
