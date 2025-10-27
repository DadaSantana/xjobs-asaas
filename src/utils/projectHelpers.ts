import { ProjectStatus, ProposalStatus } from '@/types/project';

// Função para obter a cor do badge do status do projeto
export const getProjectStatusColor = (status: ProjectStatus): string => {
  switch (status) {
    case 'recebendo_propostas':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'aguardando_garantia':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'executando':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'aguardando_aceite_cliente':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'concluido':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'cancelado':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Função para obter o label do status do projeto
export const getProjectStatusLabel = (status: ProjectStatus): string => {
  switch (status) {
    case 'recebendo_propostas':
      return 'Recebendo Propostas';
    case 'aguardando_garantia':
      return 'Aguardando Garantia';
    case 'executando':
      return 'Executando';
    case 'aguardando_aceite_cliente':
      return 'Aguardando Aceite';
    case 'concluido':
      return 'Concluído';
    case 'cancelado':
      return 'Cancelado';
    default:
      return status;
  }
};

// Função para obter a cor do badge do status da proposta
export const getProposalStatusColor = (status: ProposalStatus): string => {
  switch (status) {
    case 'pendente':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'aceita':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'rejeitada':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'cancelada':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Função para obter o label do status da proposta
export const getProposalStatusLabel = (status: ProposalStatus): string => {
  switch (status) {
    case 'pendente':
      return 'Pendente';
    case 'aceita':
      return 'Aceita';
    case 'rejeitada':
      return 'Rejeitada';
    case 'cancelada':
      return 'Cancelada';
    default:
      return status;
  }
};

// Função para obter o ícone do status do projeto
export const getProjectStatusIcon = (status: ProjectStatus): string => {
  switch (status) {
    case 'recebendo_propostas':
      return '📋';
    case 'aguardando_garantia':
      return '💰';
    case 'executando':
      return '⚡';
    case 'aguardando_aceite_cliente':
      return '⏳';
    case 'concluido':
      return '✅';
    case 'cancelado':
      return '❌';
    default:
      return '📋';
  }
};

// Função para verificar se o projeto pode avançar para o próximo status
export const canAdvanceProjectStatus = (currentStatus: ProjectStatus): ProjectStatus | null => {
  switch (currentStatus) {
    case 'recebendo_propostas':
      return 'aguardando_garantia'; // Só pode avançar quando uma proposta for aceita
    case 'aguardando_garantia':
      return 'executando';
    case 'executando':
      return 'aguardando_aceite_cliente'; // Freelancer finaliza
    case 'aguardando_aceite_cliente':
      return 'concluido'; // Cliente aceita
    default:
      return null;
  }
};

// Função para obter a próxima ação possível
export const getNextActionLabel = (status: ProjectStatus): string => {
  switch (status) {
    case 'recebendo_propostas':
      return 'Aceitar Proposta';
    case 'aguardando_garantia':
      return 'Confirmar Pagamento';
    case 'executando':
      return 'Finalizar Projeto';
    case 'aguardando_aceite_cliente':
      return 'Aceitar Conclusão';
    case 'concluido':
      return 'Avaliar Freelancer';
    default:
      return '';
  }
}; 