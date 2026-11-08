import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Upload, Film, Tv } from 'lucide-react';

interface FormularioInicialProps {
    categorias: string[];
    onSubmit: (texto: string, tipo: 'Filme' | 'Serie', categoria: string) => void;
}

export function FormularioInicial({ categorias, onSubmit }: FormularioInicialProps) {
    const [texto, setTexto] = useState('');
    const [tipo, setTipo] = useState<'Filme' | 'Serie'>('Filme');
    const [categoria, setCategoria] = useState(categorias[0]);

    const handleSubmit = () => {
        if (!texto.trim()) {
            return;
        }
        onSubmit(texto, tipo, categoria);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 border-l-4 border-[#76ff03] pl-4">
                <Upload className="h-8 w-8 text-[#76ff03]" />
                <div>
                    <h2 className="text-2xl font-bold text-white">Importação Zynner</h2>
                    <p className="text-sm text-gray-400">Importar filmes e séries automaticamente</p>
                </div>
            </div>

            {/* Formulário */}
            <div className="bg-[#1e1e1e] rounded-lg p-6 space-y-6 border border-gray-800">

                {/* Tipo de Conteúdo */}
                <div className="space-y-2">
                    <Label className="text-white font-medium">Tipo de Conteúdo</Label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setTipo('Filme')}
                            className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${tipo === 'Filme'
                                    ? 'border-[#76ff03] bg-[#76ff03]/10 text-[#76ff03]'
                                    : 'border-gray-700 bg-[#121212] text-gray-400 hover:border-gray-600'
                                }`}
                        >
                            <Film className="h-5 w-5" />
                            <span className="font-medium">Filmes</span>
                        </button>
                        <button
                            onClick={() => setTipo('Serie')}
                            className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${tipo === 'Serie'
                                    ? 'border-[#76ff03] bg-[#76ff03]/10 text-[#76ff03]'
                                    : 'border-gray-700 bg-[#121212] text-gray-400 hover:border-gray-600'
                                }`}
                        >
                            <Tv className="h-5 w-5" />
                            <span className="font-medium">Séries</span>
                        </button>
                    </div>
                </div>

                {/* Categoria */}
                <div className="space-y-2">
                    <Label className="text-white font-medium">Categoria Principal</Label>
                    <Select value={categoria} onValueChange={setCategoria}>
                        <SelectTrigger className="bg-[#121212] border-gray-700 text-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1e1e1e] border-gray-700">
                            {categorias.map(cat => (
                                <SelectItem
                                    key={cat}
                                    value={cat}
                                    className="text-white hover:bg-[#76ff03]/10 hover:text-[#76ff03]"
                                >
                                    {cat}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Lista de Nomes */}
                <div className="space-y-2">
                    <Label className="text-white font-medium">Lista de Nomes</Label>
                    <Textarea
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                        placeholder="Digite os nomes separados por vírgula. Ex: Venom, Kung Fu Panda 4, Breaking Bad"
                        className="bg-[#121212] border-gray-700 text-white min-h-[150px] placeholder:text-gray-600"
                        rows={6}
                    />
                    <p className="text-xs text-gray-500">
                        Separe cada título com vírgula (,)
                    </p>
                </div>

                {/* Botão */}
                <Button
                    onClick={handleSubmit}
                    disabled={!texto.trim()}
                    className="w-full bg-[#76ff03] text-black hover:bg-[#69e600] font-semibold py-6 text-lg transition-all"
                >
                    <Upload className="h-5 w-5 mr-2" />
                    Ler Lista e Processar
                </Button>
            </div>

            {/* Dicas */}
            <div className="bg-[#1e1e1e]/50 rounded-lg p-4 border border-gray-800">
                <h3 className="text-sm font-semibold text-white mb-2">💡 Dicas:</h3>
                <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Cole uma lista de títulos separados por vírgula</li>
                    <li>• O sistema buscará automaticamente no TMDB</li>
                    <li>• Links serão validados em múltiplos servidores</li>
                    <li>• Duplicatas serão detectadas automaticamente</li>
                </ul>
            </div>
        </div>
    );
}
