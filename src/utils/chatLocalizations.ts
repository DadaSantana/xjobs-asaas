export const CHAT_LOCALIZATIONS = {
  // Títulos e cabeçalhos
  CHAT_TITLE: "Chat",
  CONVERSATIONS: "Conversas",
  CHAT_ACTIONS: "Ações do Chat",
  
  // Placeholders
  TYPE_MESSAGE: "Digite sua mensagem...",
  DISPUTE_REASON_PLACEHOLDER: "Descreva o motivo da disputa...",
  SEARCH_CONVERSATIONS: "Buscar conversas...",
  
  // Estados de carregamento
  LOADING: "Carregando...",
  LOADING_CONVERSATIONS: "Carregando conversas...",
  SENDING: "Enviando...",
  
  // Estados vazios
  NO_CONVERSATIONS: "Nenhuma conversa",
  NO_CONVERSATIONS_DESCRIPTION: "Inicie uma conversa com um freelancer ou cliente",
  NO_MESSAGES: "Nenhuma mensagem",
  CONVERSATION_STARTED: "Conversa iniciada",
  
  // Ações do menu
  BLOCK_USER: "Bloquear Usuário",
  UNBLOCK_USER: "Desbloquear Usuário",
  REQUEST_MODERATOR: "Solicitar Moderador",
  RELEASE_FUNDS: "Liberar Fundos",
  START_DISPUTE: "Iniciar Disputa",
  
  // Tipos de usuário
  FREELANCER: "Freelancer",
  CLIENT: "Cliente",
  
  // Botões e ações
  SEND: "Enviar",
  CANCEL: "Cancelar",
  CONFIRM: "Confirmar",
  BACK: "Voltar",
  DOWNLOAD: "Baixar",
  
  // Sistema de bloqueio
  USER_BLOCKED_WARNING: "Este usuário foi bloqueado",
  USER_BLOCKED_DESCRIPTION: "As mensagens não podem ser enviadas enquanto o usuário estiver bloqueado.",
  YOU_ARE_BLOCKED: "Você foi bloqueado",
  YOU_ARE_BLOCKED_DESCRIPTION: "Você não pode enviar mensagens nesta conversa.",
  CHAT_BLOCKED_MESSAGE: "Esta conversa está bloqueada",
  CANNOT_SEND_BLOCKED: "Não é possível enviar mensagens para usuários bloqueados",
  
  // Arquivo
  FILE_TOO_LARGE: "Arquivo muito grande. Máximo 30MB.",
  FILE_UPLOAD_SUCCESS: "Arquivo enviado com sucesso!",
  FILE_UPLOAD_ERROR: "Falha ao enviar arquivo",
  FILE_DOWNLOAD_ERROR: "Falha ao baixar arquivo",
  
  // Diálogos de confirmação
  CONFIRM_DISPUTE: {
    title: "Iniciar Disputa",
    description: "Por favor, descreva o motivo da disputa. Isso ajudará nossos moderadores a entender melhor a situação.",
    confirmButton: "Iniciar Disputa",
    cancelButton: "Cancelar"
  },
  
  CONFIRM_MODERATOR: {
    title: "Solicitar Moderador",
    description: "Um moderador será designado para este chat para ajudar a resolver possíveis conflitos. Deseja continuar?",
    confirmButton: "Solicitar Moderador",
    cancelButton: "Cancelar"
  },

  CONFIRM_BLOCK: {
    title: "Bloquear Usuário",
    description: "Tem certeza que deseja bloquear este usuário? Ele não poderá mais enviar mensagens nesta conversa.",
    confirmButton: "Bloquear",
    cancelButton: "Cancelar"
  },

  CONFIRM_UNBLOCK: {
    title: "Desbloquear Usuário",
    description: "Tem certeza que deseja desbloquear este usuário? Ele poderá voltar a enviar mensagens nesta conversa.",
    confirmButton: "Desbloquear",
    cancelButton: "Cancelar"
  },
  
  // Mensagens de toast
  TOASTS: {
    ERROR: "Erro",
    SUCCESS: "Sucesso",
    
    // Erros específicos
    CHAT_INIT_ERROR: "Erro ao inicializar chat",
    SEND_MESSAGE_ERROR: "Falha ao enviar mensagem",
    BLOCK_USER_ERROR: "Erro ao bloquear usuário",
    UNBLOCK_USER_ERROR: "Erro ao desbloquear usuário",
    DISPUTE_ERROR: "Erro ao iniciar disputa",
    MODERATOR_ERROR: "Erro ao solicitar moderador",
    RELEASE_FUNDS_ERROR: "Erro ao liberar fundos",
    USER_PROFILE_ERROR: "Não foi possível carregar as informações do usuário",
    USER_BLOCKED_ERROR: "Você foi bloqueado nesta conversa e não pode enviar mensagens.",
    CHAT_INACTIVE_ERROR: "Esta conversa não está mais ativa.",
    
    // Sucessos
    USER_BLOCKED: "Usuário bloqueado",
    USER_BLOCKED_SUCCESS: "O usuário foi bloqueado com sucesso.",
    
    USER_UNBLOCKED: "Usuário desbloqueado",
    USER_UNBLOCKED_SUCCESS: "O usuário foi desbloqueado com sucesso.",
    
    DISPUTE_STARTED: "Disputa iniciada",
    DISPUTE_STARTED_SUCCESS: "A disputa foi iniciada com sucesso.",
    
    MODERATOR_REQUESTED: "Moderador solicitado",
    MODERATOR_REQUESTED_SUCCESS: "Um moderador será designado para este chat em breve.",
    
    FUNDS_RELEASED: "Fundos liberados",
    FUNDS_RELEASED_SUCCESS: "Os fundos foram liberados com sucesso.",
    
    NEW_CONVERSATION: "Nova conversa",
    NEW_CONVERSATION_DESCRIPTION: (userName: string) => `Iniciando conversa com ${userName}`,
  },
  
  // Mensagens de estado
  SELECT_CONVERSATION: "Selecione uma conversa para começar",
  SELECT_CONVERSATION_DESCRIPTION: "Escolha uma conversa à esquerda ou inicie uma nova",
  
  // Formatação de arquivos
  FILE_SIZES: ['Bytes', 'KB', 'MB', 'GB'],

  // Sistema de Moderação
  MODERATION: {
    // Títulos e cabeçalhos
    DASHBOARD: 'Painel de Moderação',
    REQUESTS: 'Solicitações de Moderação',
    PENDING_REQUESTS: 'Solicitações Pendentes',
    ASSIGNED_REQUESTS: 'Solicitações Atribuídas',
    MY_REQUESTS: 'Minhas Solicitações',
    RECENT_ACTIONS: 'Ações Recentes',
    MODERATOR_STATS: 'Estatísticas dos Moderadores',
    
    // Status
    STATUS: {
      PENDING: 'Pendente',
      ASSIGNED: 'Atribuída',
      RESOLVED: 'Resolvida',
      REJECTED: 'Rejeitada'
    },
    
    // Prioridades
    PRIORITY: {
      LOW: 'Baixa',
      MEDIUM: 'Média',
      HIGH: 'Alta',
      URGENT: 'Urgente'
    },
    
    // Ações
    ACTIONS: {
      ASSIGN: 'Atribuir',
      SELF_ASSIGN: 'Assumir',
      RESOLVE: 'Resolver',
      REJECT: 'Rejeitar',
      VIEW_CHAT: 'Ver Conversa',
      VIEW_PROJECT: 'Ver Projeto',
      ADD_NOTE: 'Adicionar Nota',
      ESCALATE: 'Escalar'
    },
    
    // Placeholders
    PLACEHOLDERS: {
      REASON: 'Descreva o motivo da solicitação de moderação...',
      RESOLUTION: 'Descreva como a situação foi resolvida...',
      REJECTION: 'Explique o motivo da rejeição...',
      NOTE: 'Adicione uma nota sobre esta solicitação...',
      SEARCH: 'Buscar solicitações...'
    },
    
    // Mensagens
    MESSAGES: {
      REQUEST_CREATED: 'Solicitação de moderação criada com sucesso',
      REQUEST_ASSIGNED: 'Moderador atribuído com sucesso',
      REQUEST_RESOLVED: 'Solicitação resolvida com sucesso',
      REQUEST_REJECTED: 'Solicitação rejeitada com sucesso',
      NOTE_ADDED: 'Nota adicionada com sucesso',
      NO_REQUESTS: 'Nenhuma solicitação encontrada',
      NO_PENDING_REQUESTS: 'Nenhuma solicitação pendente',
      NO_ASSIGNED_REQUESTS: 'Nenhuma solicitação atribuída',
      AUTO_ASSIGNED: 'Moderador atribuído automaticamente',
      MANUAL_ASSIGNMENT_REQUIRED: 'Atribuição manual necessária - nenhum moderador disponível'
    },
    
    // Erros
    ERRORS: {
      CREATE_REQUEST: 'Erro ao criar solicitação de moderação',
      ASSIGN_MODERATOR: 'Erro ao atribuir moderador',
      RESOLVE_REQUEST: 'Erro ao resolver solicitação',
      REJECT_REQUEST: 'Erro ao rejeitar solicitação',
      LOAD_REQUESTS: 'Erro ao carregar solicitações',
      DUPLICATE_REQUEST: 'Já existe uma solicitação pendente para esta conversa',
      CHAT_NOT_FOUND: 'Conversa não encontrada',
      UNAUTHORIZED: 'Você não tem permissão para esta ação'
    },
    
    // Diálogos de confirmação
    CONFIRM_ASSIGN: {
      title: 'Assumir esta solicitação?',
      description: 'Você será responsável por resolver esta disputa.',
      confirmButton: 'Assumir',
      cancelButton: 'Cancelar'
    },
    CONFIRM_RESOLVE: {
      title: 'Marcar como resolvida?',
      description: 'Esta ação encerrará a solicitação de moderação.',
      confirmButton: 'Resolver',
      cancelButton: 'Cancelar'
    },
    CONFIRM_REJECT: {
      title: 'Rejeitar solicitação?',
      description: 'A solicitação será marcada como rejeitada.',
      confirmButton: 'Rejeitar',
      cancelButton: 'Cancelar'
    },
    
    // Estatísticas
    STATS: {
      TOTAL_PENDING: 'Total Pendentes',
      TOTAL_ASSIGNED: 'Total Atribuídas',
      TOTAL_RESOLVED: 'Total Resolvidas',
      TOTAL_URGENT: 'Total Urgentes',
      AVERAGE_RESOLUTION_TIME: 'Tempo Médio de Resolução',
      CURRENT_ACTIVE: 'Ativas Atualmente',
      RATING: 'Avaliação',
      HOURS: 'horas',
      NO_DATA: 'Sem dados'
    },
    
    // Filtros
    FILTERS: {
      ALL: 'Todas',
      PENDING: 'Pendentes',
      ASSIGNED: 'Atribuídas',
      RESOLVED: 'Resolvidas',
      REJECTED: 'Rejeitadas',
      URGENT: 'Urgentes',
      MY_REQUESTS: 'Minhas Solicitações'
    },
    
    // Informações da solicitação
    REQUEST_INFO: {
      REQUESTED_BY: 'Solicitado por',
      PROJECT: 'Projeto',
      PARTICIPANTS: 'Participantes',
      CLIENT: 'Cliente',
      FREELANCER: 'Freelancer',
      MODERATOR: 'Moderador',
      CREATED_AT: 'Criado em',
      ASSIGNED_AT: 'Atribuído em',
      RESOLVED_AT: 'Resolvido em',
      PRIORITY: 'Prioridade',
      STATUS: 'Status',
      REASON: 'Motivo',
      RESOLUTION: 'Resolução',
      NOTES: 'Notas'
    }
  },

  // Sistema de Disputas
  DISPUTES: {
    // Títulos e cabeçalhos
    DASHBOARD: 'Painel de Disputas',
    DISPUTE_DETAILS: 'Detalhes da Disputa',
    CREATE_DISPUTE: 'Criar Disputa',
    EVIDENCE: 'Evidências',
    DISPUTE_MESSAGES: 'Mensagens da Disputa',
    
    // Status
    STATUS: {
      OPEN: 'Aberta',
      UNDER_REVIEW: 'Em Análise',
      RESOLVED: 'Resolvida',
      CANCELLED: 'Cancelada'
    },
    
    // Tipos de resolução
    RESOLUTION_TYPE: {
      CLIENT_FAVOR: 'A favor do Cliente',
      FREELANCER_FAVOR: 'A favor do Freelancer',
      PARTIAL_REFUND: 'Reembolso Parcial',
      MEDIATED_AGREEMENT: 'Acordo Mediado'
    },
    
    // Ações
    ACTIONS: {
      CREATE_DISPUTE: 'Criar Disputa',
      RESOLVE_DISPUTE: 'Resolver Disputa',
      ADD_EVIDENCE: 'Adicionar Evidência',
      SEND_MESSAGE: 'Enviar Mensagem',
      VIEW_DETAILS: 'Ver Detalhes'
    },
    
    // Mensagens
    MESSAGES: {
      DISPUTE_CREATED: 'Disputa criada com sucesso',
      DISPUTE_RESOLVED: 'Disputa resolvida com sucesso',
      EVIDENCE_ADDED: 'Evidência adicionada com sucesso',
      MESSAGE_SENT: 'Mensagem enviada com sucesso',
      NO_DISPUTES: 'Nenhuma disputa encontrada',
      DUPLICATE_DISPUTE: 'Já existe uma disputa ativa para esta conversa'
    },
    
    // Placeholders
    PLACEHOLDERS: {
      DISPUTE_REASON: 'Descreva o motivo da disputa...',
      RESOLUTION_DETAILS: 'Descreva como a disputa foi resolvida...',
      EVIDENCE_DESCRIPTION: 'Descreva esta evidência...',
      MESSAGE_CONTENT: 'Digite sua mensagem...'
    }
  },

  // Sistema de Fundos
  FUNDS: {
    // Títulos e cabeçalhos
    RELEASE_FUNDS: 'Liberar Fundos',
    FUND_RELEASES: 'Liberações de Fundos',
    RELEASE_HISTORY: 'Histórico de Liberações',
    FUND_STATUS: 'Status dos Fundos',
    
    // Tipos de liberação
    RELEASE_TYPE: {
      PARTIAL: 'Liberação Parcial',
      FULL: 'Liberação Total',
      MILESTONE: 'Marco do Projeto',
      DISPUTE_RESOLUTION: 'Resolução de Disputa'
    },
    
    // Status
    STATUS: {
      PENDING: 'Pendente',
      APPROVED: 'Aprovado',
      RELEASED: 'Liberado',
      CANCELLED: 'Cancelado',
      DISPUTED: 'Em Disputa'
    },
    
    // Ações
    ACTIONS: {
      RELEASE_10: 'Liberar 10%',
      RELEASE_20: 'Liberar 20%',
      RELEASE_30: 'Liberar 30%',
      RELEASE_40: 'Liberar 40%',
      RELEASE_50: 'Liberar 50%',
      RELEASE_60: 'Liberar 60%',
      RELEASE_70: 'Liberar 70%',
      RELEASE_80: 'Liberar 80%',
      RELEASE_90: 'Liberar 90%',
      RELEASE_100: 'Liberar 100%',
      RELEASE_CUSTOM: 'Valor Personalizado',
      RELEASE_ALL: 'Liberar Tudo'
    },
    
    // Informações
    INFO: {
      PROJECT_VALUE: 'Valor do Projeto',
      TOTAL_RELEASED: 'Total Liberado',
      REMAINING_AMOUNT: 'Valor Restante',
      RELEASE_PERCENTAGE: 'Porcentagem de Liberação',
      CUMULATIVE_AMOUNT: 'Valor Acumulado',
      RELEASE_AMOUNT: 'Valor da Liberação',
      APPROVED_BY: 'Aprovado por',
      RELEASED_AT: 'Liberado em'
    },
    
    // Mensagens
    MESSAGES: {
      FUNDS_RELEASED: 'Fundos liberados com sucesso',
      INSUFFICIENT_FUNDS: 'Fundos insuficientes para esta liberação',
      INVALID_PERCENTAGE: 'Porcentagem inválida (deve ser entre 1% e 100%)',
      INVALID_AMOUNT: 'Valor inválido',
      NO_FUNDS_AVAILABLE: 'Não há fundos disponíveis para liberação',
      ALL_FUNDS_RELEASED: 'Todos os fundos já foram liberados',
      RELEASE_CREATED: 'Solicitação de liberação criada com sucesso'
    },
    
    // Placeholders
    PLACEHOLDERS: {
      RELEASE_REASON: 'Motivo da liberação (opcional)...',
      MILESTONE_DESCRIPTION: 'Descreva o marco atingido...',
      CUSTOM_PERCENTAGE: 'Digite a porcentagem (1-100)...',
      CUSTOM_AMOUNT: 'Digite o valor em R$...'
    },
    
    // Diálogos de confirmação
    CONFIRM_RELEASE: {
      title: 'Confirmar Liberação de Fundos',
      description: 'Você está prestes a liberar',
      amountLabel: 'Valor:',
      percentageLabel: 'Porcentagem:',
      remainingLabel: 'Restante após liberação:',
      confirmButton: 'Liberar Fundos',
      cancelButton: 'Cancelar'
    }
  }
}; 