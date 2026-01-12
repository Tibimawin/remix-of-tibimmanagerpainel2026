
import { useState, useEffect } from 'react';

interface MensagemSuportePrioritario {
  id: string;
  nome: string;
  email: string;
  assunto: string;
  mensagem: string;
  dataEnvio: string;
  status: 'pendente' | 'respondido' | 'urgente';
  prioridade: 'alta' | 'media' | 'baixa';
  historico: Array<{
    texto: string;
    data: string;
    autor: 'admin' | 'usuario';
  }>;
}

interface ConfiguracoesSuportePrioritario {
  emailSupporte: string;
  telefone: string;
  whatsapp: string;
  horarioAtendimento: string;
}

export const useSuportePrioritario = () => {
  const [mensagens, setMensagens] = useState<MensagemSuportePrioritario[]>([]);
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesSuportePrioritario>({
    emailSupporte: 'suporte-premium@empresa.com',
    telefone: '(11) 9999-9999',
    whatsapp: '(11) 99999-9999',
    horarioAtendimento: '24/7 - Suporte contínuo'
  });
  const [loading, setLoading] = useState(false);

  const buscarMensagens = async () => {
    setLoading(true);
    try {
      // Buscar mensagens do localStorage
      const mensagensSalvas = localStorage.getItem('suporte-prioritario-mensagens');
      if (mensagensSalvas) {
        setMensagens(JSON.parse(mensagensSalvas));
      } else {
        // Se não houver mensagens, inicializar com array vazio
        setMensagens([]);
        localStorage.setItem('suporte-prioritario-mensagens', JSON.stringify([]));
      }
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      setMensagens([]);
    } finally {
      setLoading(false);
    }
  };

  const enviarMensagem = async (dadosMensagem: {
    nome: string;
    email: string;
    assunto: string;
    mensagem: string;
  }) => {
    try {
      const novaMensagem: MensagemSuportePrioritario = {
        id: Date.now().toString(),
        nome: dadosMensagem.nome,
        email: dadosMensagem.email,
        assunto: dadosMensagem.assunto,
        mensagem: dadosMensagem.mensagem,
        dataEnvio: new Date().toISOString(),
        status: 'pendente',
        prioridade: 'media',
        historico: []
      };

      // Buscar mensagens existentes
      const mensagensExistentes = JSON.parse(localStorage.getItem('suporte-prioritario-mensagens') || '[]');
      
      // Adicionar nova mensagem
      const mensagensAtualizadas = [...mensagensExistentes, novaMensagem];
      
      // Salvar no localStorage
      localStorage.setItem('suporte-prioritario-mensagens', JSON.stringify(mensagensAtualizadas));
      
      // Atualizar estado local
      setMensagens(mensagensAtualizadas);
      
      return novaMensagem;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  };

  const responderMensagem = async (mensagemId: string, resposta: string) => {
    try {
      const mensagensAtualizadas = mensagens.map(mensagem => {
        if (mensagem.id === mensagemId) {
          const novaResposta = {
            texto: resposta,
            data: new Date().toISOString(),
            autor: 'admin' as const
          };
          
          return {
            ...mensagem,
            status: 'respondido' as const,
            historico: [...mensagem.historico, novaResposta]
          };
        }
        return mensagem;
      });
      
      setMensagens(mensagensAtualizadas);
      localStorage.setItem('suporte-prioritario-mensagens', JSON.stringify(mensagensAtualizadas));
    } catch (error) {
      console.error('Erro ao responder mensagem:', error);
      throw error;
    }
  };

  const atualizarStatus = async (mensagemId: string, novoStatus: string) => {
    try {
      const mensagensAtualizadas = mensagens.map(mensagem => {
        if (mensagem.id === mensagemId) {
          return { ...mensagem, status: novoStatus as any };
        }
        return mensagem;
      });
      
      setMensagens(mensagensAtualizadas);
      localStorage.setItem('suporte-prioritario-mensagens', JSON.stringify(mensagensAtualizadas));
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      throw error;
    }
  };

  const atualizarPrioridade = async (mensagemId: string, novaPrioridade: string) => {
    try {
      const mensagensAtualizadas = mensagens.map(mensagem => {
        if (mensagem.id === mensagemId) {
          return { ...mensagem, prioridade: novaPrioridade as any };
        }
        return mensagem;
      });
      
      setMensagens(mensagensAtualizadas);
      localStorage.setItem('suporte-prioritario-mensagens', JSON.stringify(mensagensAtualizadas));
    } catch (error) {
      console.error('Erro ao atualizar prioridade:', error);
      throw error;
    }
  };

  const atualizarConfiguracoes = async (novasConfigs: ConfiguracoesSuportePrioritario) => {
    try {
      setConfiguracoes(novasConfigs);
      localStorage.setItem('suporte-prioritario-config', JSON.stringify(novasConfigs));
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      throw error;
    }
  };

  // Carregar configurações salvas
  useEffect(() => {
    const configSalvas = localStorage.getItem('suporte-prioritario-config');
    if (configSalvas) {
      setConfiguracoes(JSON.parse(configSalvas));
    }
  }, []);

  // Simular notificações de novas mensagens
  useEffect(() => {
    const interval = setInterval(() => {
      const mensagensPendentes = mensagens.filter(m => m.status === 'pendente' || m.status === 'urgente');
      if (mensagensPendentes.length > 0) {
        console.log(`${mensagensPendentes.length} mensagens pendentes no suporte prioritário`);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [mensagens]);

  return {
    mensagens,
    configuracoes,
    loading,
    buscarMensagens,
    enviarMensagem,
    responderMensagem,
    atualizarStatus,
    atualizarPrioridade,
    atualizarConfiguracoes
  };
};
