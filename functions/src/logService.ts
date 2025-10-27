import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

const db = getFirestore();

export interface SystemLog {
  id?: string;
  type: 'payment' | 'project' | 'user' | 'dispute' | 'plan' | 'system' | 'error';
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  projectId?: string;
  timestamp: Timestamp;
  source: string; // Nome da função/serviço que gerou o log
  read?: boolean;
}

/**
 * Cria um log do sistema na coleção 'logs'
 */
export async function createSystemLog(
  type: SystemLog['type'],
  level: SystemLog['level'],
  title: string,
  message: string,
  source: string,
  metadata?: Record<string, unknown>,
  userId?: string,
  projectId?: string
): Promise<void> {
  try {
    const logData: SystemLog = {
      type,
      level,
      title,
      message,
      metadata: metadata || {},
      userId,
      projectId,
      timestamp: Timestamp.now(),
      source,
      read: false
    };

    await db.collection('logs').add(logData);
    
    // Log também no console do Firebase para debug
    logger.info(`[${level.toUpperCase()}] ${title}: ${message}`, {
      type,
      source,
      metadata
    });
  } catch (error) {
    logger.error('Erro ao criar log do sistema:', error);
  }
}

/**
 * Busca logs do sistema com paginação e filtros
 */
export async function getSystemLogs(
  limit: number = 50,
  startAfter?: unknown,
  filters?: {
    type?: SystemLog['type'];
    level?: SystemLog['level'];
    source?: string;
    startDate?: Date;
    endDate?: Date;
  }
) {
  try {
    let query = db.collection('logs')
      .orderBy('timestamp', 'desc')
      .limit(limit);

    // Aplicar filtros
    if (filters?.type) {
      query = query.where('type', '==', filters.type);
    }
    if (filters?.level) {
      query = query.where('level', '==', filters.level);
    }
    if (filters?.source) {
      query = query.where('source', '==', filters.source);
    }
    if (filters?.startDate) {
      query = query.where('timestamp', '>=', Timestamp.fromDate(filters.startDate));
    }
    if (filters?.endDate) {
      query = query.where('timestamp', '<=', Timestamp.fromDate(filters.endDate));
    }

    // Paginação
    if (startAfter) {
      query = query.startAfter(startAfter);
    }

    const snapshot = await query.get();
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SystemLog[];

    return {
      logs,
      lastDoc: snapshot.docs[snapshot.docs.length - 1],
      hasMore: snapshot.docs.length === limit
    };
  } catch (error) {
    logger.error('Erro ao buscar logs do sistema:', error);
    throw error;
  }
}

/**
 * Limpa logs antigos (mais de 90 dias)
 */
export async function cleanupOldLogs(): Promise<void> {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const oldLogsQuery = db.collection('logs')
      .where('timestamp', '<', Timestamp.fromDate(ninetyDaysAgo))
      .limit(500); // Processar em lotes

    const snapshot = await oldLogsQuery.get();
    
    if (snapshot.empty) {
      logger.info('Nenhum log antigo encontrado para limpeza');
      return;
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    
    await createSystemLog(
      'system',
      'info',
      'Limpeza de logs',
      `${snapshot.docs.length} logs antigos foram removidos`,
      'logService.cleanupOldLogs'
    );

    logger.info(`${snapshot.docs.length} logs antigos foram removidos`);
  } catch (error) {
    logger.error('Erro ao limpar logs antigos:', error);
    await createSystemLog(
      'system',
      'error',
      'Erro na limpeza de logs',
      `Falha ao limpar logs antigos: ${error instanceof Error ? error.message : String(error)}`,
      'logService.cleanupOldLogs',
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Logs específicos para diferentes tipos de eventos
 */
export const LogHelpers = {
  // Logs de pagamento
  paymentReceived: (amount: number, projectTitle: string, clientName: string, freelancerName: string, projectId: string) => 
    createSystemLog(
      'payment',
      'info',
      'Pagamento recebido',
      `Pagamento de R$ ${amount} confirmado para o projeto "${projectTitle}" (${clientName} → ${freelancerName})`,
      'paymentService',
      { amount, projectTitle, clientName, freelancerName },
      undefined,
      projectId
    ),

  paymentReleased: (amount: number, projectTitle: string, freelancerName: string, projectId: string) => 
    createSystemLog(
      'payment',
      'info',
      'Pagamento liberado',
      `Pagamento de R$ ${amount} liberado para o freelancer ${freelancerName} no projeto "${projectTitle}"`,
      'paymentService',
      { amount, projectTitle, freelancerName },
      undefined,
      projectId
    ),

  paymentFailed: (amount: number, projectTitle: string, clientName: string, projectId: string, reason?: string) => 
    createSystemLog(
      'payment',
      'error',
      'Falha no pagamento',
      `Falha no pagamento de R$ ${amount} para o projeto "${projectTitle}" (${clientName})${reason ? `: ${reason}` : ''}`,
      'paymentService',
      { amount, projectTitle, clientName, reason },
      undefined,
      projectId
    ),

  // Logs de projeto
  projectCreated: (projectTitle: string, clientName: string, projectId: string, userId: string) => 
    createSystemLog(
      'project',
      'info',
      'Projeto criado',
      `Novo projeto "${projectTitle}" criado por ${clientName}`,
      'projectService',
      { projectTitle, clientName },
      userId,
      projectId
    ),

  projectCancelled: (projectTitle: string, reason: string, projectId: string, userId: string) => 
    createSystemLog(
      'project',
      'warning',
      'Projeto cancelado',
      `Projeto "${projectTitle}" foi cancelado. Motivo: ${reason}`,
      'projectService',
      { projectTitle, reason },
      userId,
      projectId
    ),

  // Logs de disputa
  disputeOpened: (projectTitle: string, reason: string, projectId: string, userId: string) => 
    createSystemLog(
      'dispute',
      'warning',
      'Disputa aberta',
      `Disputa aberta para o projeto "${projectTitle}". Motivo: ${reason}`,
      'disputeService',
      { projectTitle, reason },
      userId,
      projectId
    ),

  disputeResolved: (projectTitle: string, resolution: string, projectId: string) => 
    createSystemLog(
      'dispute',
      'info',
      'Disputa resolvida',
      `Disputa do projeto "${projectTitle}" foi resolvida: ${resolution}`,
      'disputeService',
      { projectTitle, resolution },
      undefined,
      projectId
    ),

  // Logs de usuário
  userRegistered: (userName: string, userEmail: string, userType: string, userId: string) => 
    createSystemLog(
      'user',
      'info',
      'Usuário registrado',
      `Novo usuário ${userType} registrado: ${userName} (${userEmail})`,
      'authService',
      { userName, userEmail, userType },
      userId
    ),

  // Logs de sistema
  systemError: (error: string, source: string, metadata?: Record<string, unknown>) => 
    createSystemLog(
      'system',
      'error',
      'Erro do sistema',
      error,
      source,
      metadata
    )
};