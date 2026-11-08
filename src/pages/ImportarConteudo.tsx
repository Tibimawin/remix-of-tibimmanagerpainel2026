import { useImportacaoZynner } from '@/hooks/useImportacaoZynner';
import { FormularioInicial } from '@/components/importacao/FormularioInicial';
import { ResultadosBusca } from '@/components/importacao/ResultadosBusca';
import { FormularioEdicao } from '@/components/importacao/FormularioEdicao';
import { CadastroFinal } from '@/components/importacao/CadastroFinal';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, RotateCcw } from 'lucide-react';

export default function ImportarConteudo() {
    const {
        estado,
        processarLista,
        validarLinksAutomatico,
        prepararParaCadastro,
        cadastrarNoBaserow,
        pularConteudo,
        reiniciar,
        categorias
    } = useImportacaoZynner();

    const conteudoAtual = estado.conteudosParaImportar[estado.indiceAtual];
    const progressoPercentual = estado.progresso.total > 0
        ? (estado.indiceAtual / estado.progresso.total) * 100
        : 0;

    return (
        <div className="min-h-screen bg-[#121212] p-6">
            <div className="max-w-4xl mx-auto">
                {/* Cabeçalho */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">
                            Importação Zynner
                        </h1>
                        <p className="text-gray-400">
                            Sistema automático de importação de filmes e séries
                        </p>
                    </div>

                    {estado.telaAtual !== 'formulario' && (
                        <Button
                            onClick={reiniciar}
                            variant="outline"
                            className="border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white"
                        >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reiniciar
                        </Button>
                    )}
                </div>

                {/* Barra de Progresso */}
                {estado.progresso.total > 0 && (
                    <div className="bg-[#1e1e1e] rounded-lg p-4 mb-6 border border-gray-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-400">
                                Progresso: {estado.indiceAtual + 1} de {estado.progresso.total}
                            </span>
                            <span className="text-sm font-semibold text-[#76ff03]">
                                {Math.round(progressoPercentual)}%
                            </span>
                        </div>
                        <Progress value={progressoPercentual} className="h-2" />
                    </div>
                )}

                {/* Conteúdo Principal */}
                <div className="animate-in fade-in duration-500">
                    {estado.telaAtual === 'formulario' && (
                        <FormularioInicial
                            categorias={categorias}
                            onSubmit={processarLista}
                        />
                    )}

                    {estado.telaAtual === 'busca' && conteudoAtual && (
                        <ResultadosBusca
                            conteudo={conteudoAtual}
                            carregando={estado.carregando}
                            onValidarAutomatico={() => validarLinksAutomatico(estado.indiceAtual)}
                            onPular={pularConteudo}
                        />
                    )}

                    {estado.telaAtual === 'edicao' && conteudoAtual && (
                        <FormularioEdicao
                            conteudo={conteudoAtual}
                            carregando={estado.carregando}
                            onConfirmar={() => prepararParaCadastro(estado.indiceAtual)}
                        />
                    )}

                    {estado.telaAtual === 'cadastro' && (
                        <CadastroFinal
                            estado={estado}
                            carregando={estado.carregando}
                            onCadastrar={cadastrarNoBaserow}
                        />
                    )}

                    {estado.telaAtual === 'completo' && (
                        <div className="space-y-6">
                            <div className="bg-[#1e1e1e] rounded-lg p-8 border border-[#76ff03] text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#76ff03] rounded-full mb-4">
                                    <svg
                                        className="w-8 h-8 text-black"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">
                                    Processamento Concluído!
                                </h2>
                                <p className="text-gray-400 mb-6">
                                    Todos os itens foram processados
                                </p>

                                <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
                                    <div className="bg-[#121212] p-3 rounded-lg">
                                        <p className="text-2xl font-bold text-[#76ff03]">
                                            {estado.progresso.sucesso}
                                        </p>
                                        <p className="text-xs text-gray-400">Sucesso</p>
                                    </div>
                                    <div className="bg-[#121212] p-3 rounded-lg">
                                        <p className="text-2xl font-bold text-red-500">
                                            {estado.progresso.erros}
                                        </p>
                                        <p className="text-xs text-gray-400">Erros</p>
                                    </div>
                                    <div className="bg-[#121212] p-3 rounded-lg">
                                        <p className="text-2xl font-bold text-white">
                                            {estado.progresso.total}
                                        </p>
                                        <p className="text-xs text-gray-400">Total</p>
                                    </div>
                                </div>

                                <Button
                                    onClick={reiniciar}
                                    className="bg-[#76ff03] text-black hover:bg-[#69e600] font-semibold"
                                >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Nova Importação
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Rodapé com informações */}
                <div className="mt-8 pt-6 border-t border-gray-800">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-xs text-gray-500">
                        <div>
                            <p className="font-semibold text-white mb-1">24</p>
                            <p>Servidores de Filmes</p>
                        </div>
                        <div>
                            <p className="font-semibold text-white mb-1">29</p>
                            <p>Servidores de Séries</p>
                        </div>
                        <div>
                            <p className="font-semibold text-white mb-1">Auto</p>
                            <p>Validação de Links</p>
                        </div>
                        <div>
                            <p className="font-semibold text-white mb-1">TMDB</p>
                            <p>Dados Oficiais</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
