import React from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
import { useOnboarding } from '@/hooks/useOnboarding';

const steps: Step[] = [
  {
    target: 'body',
    content: (
      <div className="text-center space-y-4 p-2">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-3 bg-primary/10 rounded-full">
          <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          Bem-vindo ao Painel Administrativo
        </h2>
        <p className="text-muted-foreground leading-relaxed max-w-md mx-auto">
          Este guia interativo apresentará as principais funcionalidades do sistema 
          em algumas etapas simples e objetivas.
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 bg-primary rounded-full"></div>
          <span>5 minutos de tutorial</span>
        </div>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="sidebar"]',
    content: (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-accent-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>
          <h3 className="font-semibold text-foreground">Navegação Principal</h3>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          O menu lateral contém todas as funcionalidades do sistema organizadas por categoria. 
          Utilize-o para navegar entre Dashboard, gestão de Conteúdos, Estatísticas e outras seções.
        </p>
        <div className="bg-muted/50 rounded-lg p-3 mt-3">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Dica:</strong> Use Ctrl+K para busca rápida no sistema
          </p>
        </div>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="header"]',
    content: (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-accent-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="font-semibold text-foreground">Barra de Controle</h3>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          A barra superior oferece acesso rápido às configurações do usuário, 
          alternância de tema, notificações do sistema e opções de perfil.
        </p>
        <div className="bg-muted/50 rounded-lg p-3 mt-3">
          <p className="text-xs text-muted-foreground">
            🔧 <strong>Personalização:</strong> Configure o tema e preferências aqui
          </p>
        </div>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="add-content"]',
    content: (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-accent-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h3 className="font-semibold text-foreground">Gestão de Conteúdo</h3>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Centro de criação e gestão de todo o conteúdo da plataforma. 
          Adicione filmes, séries, episódios e organize por categorias.
        </p>
        <div className="bg-muted/50 rounded-lg p-3 mt-3">
          <p className="text-xs text-muted-foreground">
            📚 <strong>Organização:</strong> Use categorias para facilitar a navegação
          </p>
        </div>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="settings"]',
    content: (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-accent-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-foreground">Configurações Avançadas</h3>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Personalize comportamentos do sistema, configure integrações externas 
          e ajuste parâmetros operacionais conforme suas necessidades.
        </p>
        <div className="bg-muted/50 rounded-lg p-3 mt-3">
          <p className="text-xs text-muted-foreground">
            ⚙️ <strong>Importante:</strong> Configurações são salvas automaticamente
          </p>
        </div>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: 'body',
    content: (
      <div className="text-center space-y-4 p-2">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-3 bg-green-500/10 rounded-full">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          Tutorial Finalizado com Sucesso
        </h2>
        <p className="text-muted-foreground leading-relaxed max-w-md mx-auto">
          Você agora está familiarizado com as principais funcionalidades do painel administrativo. 
          Explore o sistema e aproveite todas as ferramentas disponíveis.
        </p>
        <div className="bg-muted/50 rounded-lg p-4 mt-4">
          <p className="text-xs text-muted-foreground">
            🔄 Este tutorial pode ser reativado a qualquer momento através das configurações do sistema
          </p>
        </div>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
];

export const OnboardingTour: React.FC = () => {
  const { 
    shouldShowOnboarding, 
    completeOnboarding, 
    skipOnboarding
  } = useOnboarding();

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, type } = data;
    
    console.log('Joyride callback:', { status, action, type });
    
    // Handle completion
    if (status === STATUS.FINISHED) {
      console.log('Tutorial finished successfully');
      completeOnboarding();
      return;
    }
    
    // Handle skip
    if (status === STATUS.SKIPPED || action === 'skip') {
      console.log('Tutorial skipped by user');
      skipOnboarding();
      return;
    }

    // Handle close button or escape
    if (action === 'close') {
      console.log('Tutorial closed');
      skipOnboarding();
      return;
    }
  };

  if (!shouldShowOnboarding) {
    return null;
  }

  return (
    <Joyride
      steps={steps}
      run={shouldShowOnboarding}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      stepIndex={undefined}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          backgroundColor: 'hsl(var(--card))',
          textColor: 'hsl(var(--foreground))',
          arrowColor: 'hsl(var(--card))',
          zIndex: 10000,
        },
        tooltip: {
          backgroundColor: 'hsl(var(--card))',
          borderRadius: '16px',
          border: '1px solid hsl(var(--border))',
          boxShadow: '0 20px 40px -12px hsl(var(--foreground) / 0.15), 0 8px 16px -8px hsl(var(--foreground) / 0.1)',
          padding: '24px',
          fontSize: '14px',
          maxWidth: '420px',
          minWidth: '320px',
        },
        tooltipTitle: {
          color: 'hsl(var(--foreground))',
          fontSize: '18px',
          fontWeight: '600',
          marginBottom: '12px',
          lineHeight: '1.4',
        },
        tooltipContent: {
          color: 'hsl(var(--muted-foreground))',
          lineHeight: '1.6',
          fontSize: '14px',
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          borderRadius: '10px',
          border: 'none',
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        },
        buttonBack: {
          backgroundColor: 'hsl(var(--secondary))',
          color: 'hsl(var(--secondary-foreground))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '10px',
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: '500',
          marginRight: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        },
        buttonSkip: {
          backgroundColor: 'transparent',
          color: 'hsl(var(--muted-foreground))',
          border: 'none',
          fontSize: '13px',
          cursor: 'pointer',
          textDecoration: 'underline',
        },
        spotlight: {
          borderRadius: '12px',
          border: '2px solid hsl(var(--primary))',
        },
        overlay: {
          backgroundColor: 'hsl(var(--background) / 0.8)',
          backdropFilter: 'blur(2px)',
        },
      }}
      locale={{
        back: 'Voltar',
        close: 'Fechar',
        last: 'Finalizar',
        next: 'Próximo',
        skip: 'Pular Tutorial',
      }}
      disableCloseOnEsc={false}
      disableOverlayClose={false}
      hideCloseButton={false}
      scrollToFirstStep
      disableOverlay={false}
      disableScrolling={false}
      spotlightClicks={false}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  );
};