import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { LogHelpers, createSystemLog } from './logService';

const db = getFirestore();

// Tipos de notificação
export type NotificationType = 
  | 'project_proposal'
  | 'proposal_accepted'
  | 'proposal_rejected'
  | 'project_started'
  | 'project_completed'
  | 'payment_received'
  | 'payment_released'
  | 'payment_failed'
  | 'message_received'
  | 'dispute_created'
  | 'dispute_resolved'
  | 'profile_approved'
  | 'profile_rejected'
  | 'system_announcement'
  | 'deadline_reminder'
  | 'rating_request'
  | 'plan_subscribed'
  | 'plan_renewed'
  | 'plan_cancelled'
  | 'plan_changed'
  | 'user_registered'
  | 'profile_updated'
  | 'account_updated'
  | 'project_created'
  | 'project_cancelled'
  | 'project_approved'
  | 'project_for_payment'
  | 'payment_pending'
  | 'payment_refused'
  | 'payment_proof_uploaded'
  | 'moderation_request'
  | 'moderation_assigned'
  | 'moderation_resolved'
  | 'moderation_rejected';

export interface CreateNotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
}

// Função para criar notificação
export const createNotification = onCall({
  maxInstances: 20,
  timeoutSeconds: 540,
  memory: '256MiB'
}, async (request) => {
  try {
    const { userId, type, title, message, actionUrl, actionLabel, metadata } = request.data as CreateNotificationData;

    if (!userId || !type || !title || !message) {
      throw new HttpsError('invalid-argument', 'Dados obrigatórios não fornecidos');
    }

    const notification = {
      userId,
      type,
      title,
      message,
      actionUrl: actionUrl || null,
      actionLabel: actionLabel || null,
      metadata: metadata || {},
      read: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('notifications').add(notification);
    
    logger.info('Notificação criada', { 
      notificationId: docRef.id, 
      userId, 
      type 
    });

    return { 
      success: true, 
      notificationId: docRef.id 
    };

  } catch (error) {
    logger.error('Erro ao criar notificação:', error);
    throw new HttpsError('internal', 'Erro interno do servidor');
  }
});



// Trigger: Criar notificação quando um usuário é registrado
export const onUserCreated = onDocumentCreated('users/{userId}', async (event) => {
  try {
    const userData = event.data?.data();
    if (!userData) return;

    const { email, name, userType } = userData;

    // Notificação de boas-vindas para o usuário
    await db.collection('notifications').add({
      userId: event.params.userId,
      type: 'user_registered',
      title: 'Bem-vindo ao Xjobs',
      message: `Conta criada com sucesso.`,
      actionUrl: '/minha-conta',
      actionLabel: 'Ver conta',
      data: { name, email },
      metadata: {},
      read: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    // Registrar log do sistema para novo cadastro
    await LogHelpers.userRegistered(
      name || 'Usuário',
      email,
      userType === 'freelancer' ? 'freelancer' : 'cliente',
      event.params.userId
    );

    // Notificar gestores sobre o novo cadastro
    await notifyAllAdmins(
      'user_registered',
      'Novo usuário cadastrado',
      `${name || email} foi cadastrado.`,
      `/admin/usuarios/${event.params.userId}`,
      'Ver usuário',
      { userId: event.params.userId, name, email }
    );

    // Registrar na coleção logs
    await db.collection('logs').add({
      userId: event.params.userId,
      name,
      email,
      type: 'user_registered',
      createdAt: FieldValue.serverTimestamp()
    });

    logger.info('Notificação user_registered enviada', { userId: event.params.userId });
  } catch (err) {
    logger.error('Erro trigger user_registered:', err);
  }
});

// Trigger: Notificar administradores sobre atualizações de perfil
export const onUserUpdated = onDocumentUpdated('users/{userId}', async (event) => {
  try {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    
    if (!beforeData || !afterData) return;

    const { email, name, userType } = afterData;
    const userId = event.params.userId;

    // PROTEÇÃO CONTRA LOOPS: Verificar se já foi processado recentemente
    const lastProcessed = afterData._lastTriggerProcessed as FirebaseFirestore.Timestamp | undefined;
    const now = admin.firestore.Timestamp.now();
    if (lastProcessed && (now.seconds - lastProcessed.seconds) < 5) {
      logger.info('Trigger onUserUpdated ignorado - processado recentemente', { userId });
      return;
    }

    // Verificar se houve mudanças significativas no perfil
    const profileFields = ['name', 'email', 'phone', 'bio', 'skills', 'portfolio', 'experience'];
    const changedFields = profileFields.filter(field => beforeData[field] !== afterData[field]);

    if (changedFields.length > 0) {
      // Registrar log do sistema para atualização de perfil
      await createSystemLog(
        'user',
        'info',
        'Perfil atualizado',
        `${userType === 'freelancer' ? 'Freelancer' : 'Cliente'} ${name || email} atualizou campos: ${changedFields.join(', ')}`,
        'userService.onUserUpdated',
        { userId, userType, email, name, changedFields },
        userId
      );
    }

    // Verificar se houve mudança de senha (campo passwordUpdatedAt)
    if (beforeData.passwordUpdatedAt !== afterData.passwordUpdatedAt) {
      await createSystemLog(
        'user',
        'info',
        'Senha alterada',
        `${userType === 'freelancer' ? 'Freelancer' : 'Cliente'} ${name || email} alterou a senha`,
        'userService.onUserUpdated',
        { userId, userType, email, name, action: 'password_changed' },
        userId
      );
    }

    // Marcar como processado para evitar loops
    await event.data?.after.ref.update({
      _lastTriggerProcessed: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info('Notificação de atualização de usuário processada', { userId, changedFields });
  } catch (err) {
    logger.error('Erro trigger user_updated:', err);
  }
});

// Trigger: Criar notificação quando uma assinatura é criada
export const onSubscriptionCreated = onDocumentCreated('subscriptions/{subscriptionId}', async (event) => {
  try {
    const subscriptionData = event.data?.data();
    if (!subscriptionData) return;

    const { userId, planId, status, amount } = subscriptionData;

    // Considerar apenas assinaturas ativas
    if (status !== 'active') return;

    // Buscar dados do usuário
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (!userData) return;

    // Buscar dados do plano
    let planName = 'Plano';
    try {
      const planDoc = await db.collection('plans').doc(planId).get();
      if (planDoc.exists) {
        planName = planDoc.data()?.name || planName;
      }
    } catch (error) {
      logger.warn('Erro ao buscar dados do plano:', error);
    }

    // Criar notificação push
    await db.collection('notifications').add({
      userId,
      type: 'plan_subscribed',
      title: 'Assinatura realizada',
      message: `Você assinou o plano ${planName} no valor de R$ ${amount || ''}`.trim(),
      actionUrl: `/minha-conta/planos`,
      actionLabel: 'Ver plano',
      metadata: { planId, amount },
      read: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    // Enfileirar e-mail para testes
    await db.collection('mail').add({
      to: 'contato@galvant.com.br',
      message: {
        subject: 'Novo teste de notificação de assinatura',
        html: `<p>Usuário ${userData.name || userData.email} assinou o plano ${planName}.</p>`
      },
      createdAt: FieldValue.serverTimestamp()
    });

    logger.info('Notificação de assinatura criada', { subscriptionId: event.params.subscriptionId, userId });
  } catch (error) {
    logger.error('Erro ao criar notificação de assinatura:', error);
  }
});

// Função auxiliar para notificar todos os administradores
export async function notifyAllAdmins(
  type: NotificationType,
  title: string,
  message: string,
  actionUrl?: string,
  actionLabel?: string,
  metadata?: Record<string, unknown>
) {
  try {
    // Buscar todos os usuários com role 'manager' ou 'moderator' (LIMITE ADICIONADO)
    const adminQuery = await db.collection('users')
      .where('role', 'in', ['manager', 'moderator'])
      .limit(50) // Limite para evitar processamento excessivo
      .get();

    const notifications: Promise<FirebaseFirestore.DocumentReference>[] = [];

    adminQuery.forEach((doc) => {
      const notification = {
        userId: doc.id,
        type,
        title,
        message,
        actionUrl: actionUrl || null,
        actionLabel: actionLabel || null,
        metadata: metadata || {},
        read: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };

      notifications.push(db.collection('notifications').add(notification));
    });

    await Promise.all(notifications);
    
    logger.info('Notificações enviadas para administradores', { 
      type, 
      adminCount: adminQuery.size 
    });

  } catch (error) {
    logger.error('Erro ao notificar administradores:', error);
  }
}

// Função para marcar notificação como visualizada (aberta)
export const markNotificationAsViewed = onCall({
  maxInstances: 20,
  timeoutSeconds: 540,
  memory: '256MiB'
}, async (request) => {
  try {
    const { notificationId, userId } = request.data;

    if (!notificationId || !userId) {
      throw new HttpsError('invalid-argument', 'ID da notificação e usuário são obrigatórios');
    }

    const notificationRef = db.collection('notifications').doc(notificationId);
    const notificationDoc = await notificationRef.get();

    if (!notificationDoc.exists) {
      throw new HttpsError('not-found', 'Notificação não encontrada');
    }

    const notificationData = notificationDoc.data();
    if (notificationData?.userId !== userId) {
      throw new HttpsError('permission-denied', 'Sem permissão para acessar esta notificação');
    }

    // Se já foi visualizada, não fazer nada
    if (notificationData?.viewedAt) {
      return { success: true, alreadyViewed: true };
    }

    await notificationRef.update({
      viewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    return { success: true };

  } catch (error) {
    logger.error('Erro ao marcar notificação como visualizada:', error);
    throw new HttpsError('internal', 'Erro interno do servidor');
  }
});

// Função para marcar notificação como lida
export const markNotificationAsRead = onCall({
  maxInstances: 20,
  timeoutSeconds: 540,
  memory: '256MiB'
}, async (request) => {
  try {
    const { notificationId, userId } = request.data;

    if (!notificationId || !userId) {
      throw new HttpsError('invalid-argument', 'ID da notificação e usuário são obrigatórios');
    }

    const notificationRef = db.collection('notifications').doc(notificationId);
    const notificationDoc = await notificationRef.get();

    if (!notificationDoc.exists) {
      throw new HttpsError('not-found', 'Notificação não encontrada');
    }

    const notificationData = notificationDoc.data();
    if (notificationData?.userId !== userId) {
      throw new HttpsError('permission-denied', 'Sem permissão para acessar esta notificação');
    }

    await notificationRef.update({
      read: true,
      readAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    return { success: true };

  } catch (error) {
    logger.error('Erro ao marcar notificação como lida:', error);
    throw new HttpsError('internal', 'Erro interno do servidor');
  }
});

// Função para marcar todas as notificações como lidas
export const markAllNotificationsAsRead = onCall({
  maxInstances: 10,
  timeoutSeconds: 540,
  memory: '256MiB'
}, async (request) => {
  try {
    const { userId } = request.data;

    if (!userId) {
      throw new HttpsError('invalid-argument', 'ID do usuário é obrigatório');
    }

    const unreadNotifications = await db
      .collection('notifications')
      .where('userId', '==', userId)
      .where('read', '==', false)
      .get();

    const batch = db.batch();
    const now = FieldValue.serverTimestamp();

    unreadNotifications.docs.forEach(doc => {
      batch.update(doc.ref, {
        read: true,
        readAt: now,
        updatedAt: now
      });
    });

    await batch.commit();

    logger.info('Todas as notificações marcadas como lidas', { 
      userId, 
      count: unreadNotifications.size 
    });

    return { 
      success: true, 
      updatedCount: unreadNotifications.size 
    };

  } catch (error) {
    logger.error('Erro ao marcar todas as notificações como lidas:', error);
    throw new HttpsError('internal', 'Erro interno do servidor');
  }
});

// Função para deletar notificação
export const deleteNotification = onCall({
  maxInstances: 20,
  timeoutSeconds: 540,
  memory: '256MiB'
}, async (request) => {
  try {
    const { notificationId, userId } = request.data;

    if (!notificationId || !userId) {
      throw new HttpsError('invalid-argument', 'ID da notificação e usuário são obrigatórios');
    }

    const notificationRef = db.collection('notifications').doc(notificationId);
    const notificationDoc = await notificationRef.get();

    if (!notificationDoc.exists) {
      throw new HttpsError('not-found', 'Notificação não encontrada');
    }

    const notificationData = notificationDoc.data();
    if (notificationData?.userId !== userId) {
      throw new HttpsError('permission-denied', 'Sem permissão para deletar esta notificação');
    }

    await notificationRef.delete();

    return { success: true };

  } catch (error) {
    logger.error('Erro ao deletar notificação:', error);
    throw new HttpsError('internal', 'Erro interno do servidor');
  }
});

// Função para deletar notificações lidas
export const deleteReadNotifications = onCall({
  maxInstances: 10,
  timeoutSeconds: 540,
  memory: '256MiB'
}, async (request) => {
  try {
    const { userId } = request.data;

    if (!userId) {
      throw new HttpsError('invalid-argument', 'ID do usuário é obrigatório');
    }

    const readNotifications = await db
      .collection('notifications')
      .where('userId', '==', userId)
      .where('read', '==', true)
      .get();

    const batch = db.batch();

    readNotifications.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    logger.info('Notificações lidas deletadas', { 
      userId, 
      count: readNotifications.size 
    });

    return { 
      success: true, 
      deletedCount: readNotifications.size 
    };

  } catch (error) {
    logger.error('Erro ao deletar notificações lidas:', error);
    throw new HttpsError('internal', 'Erro interno do servidor');
  }
});

// Função para deletar todas as notificações do usuário
export const deleteAllNotifications = onCall({
  maxInstances: 10,
  timeoutSeconds: 540,
  memory: '256MiB'
}, async (request) => {
  try {
    const { userId } = request.data;

    if (!userId) {
      throw new HttpsError('invalid-argument', 'ID do usuário é obrigatório');
    }

    const allNotifications = await db
      .collection('notifications')
      .where('userId', '==', userId)
      .get();

    const batch = db.batch();

    allNotifications.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    logger.info('Todas as notificações deletadas', { 
      userId, 
      count: allNotifications.size 
    });

    return { 
      success: true, 
      deletedCount: allNotifications.size 
    };

  } catch (error) {
    logger.error('Erro ao deletar todas as notificações:', error);
    throw new HttpsError('internal', 'Erro interno do servidor');
  }
});

// Função para limpar notificações expiradas (executada periodicamente)
export const cleanupExpiredNotifications = onCall({
  maxInstances: 5,
  timeoutSeconds: 540,
  memory: '256MiB'
}, async (request) => {
  try {
    const { daysOld = 30 } = request.data || {};
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const expiredNotifications = await db
      .collection('notifications')
      .where('createdAt', '<', cutoffDate)
      .get();

    const batch = db.batch();

    expiredNotifications.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    logger.info('Notificações expiradas limpas', { 
      count: expiredNotifications.size,
      daysOld 
    });

    return { 
      success: true, 
      deletedCount: expiredNotifications.size 
    };

  } catch (error) {
    logger.error('Erro ao limpar notificações expiradas:', error);
    throw new HttpsError('internal', 'Erro interno do servidor');
  }
});

// Trigger: Criar notificação quando um projeto recebe uma proposta
export const onProjectProposalCreated = onDocumentCreated('projectProposals/{proposalId}', async (event) => {
  try {
    const proposalData = event.data?.data();
    if (!proposalData) return;

    const { projectId, freelancerId, clientId } = proposalData;

    // Buscar dados do projeto
    const projectDoc = await db.collection('projects').doc(projectId).get();
    const projectData = projectDoc.data();

    if (!projectData) return;

    // Buscar dados do freelancer
    const freelancerDoc = await db.collection('users').doc(freelancerId).get();
    const freelancerData = freelancerDoc.data();

    if (!freelancerData) return;

    // Criar notificação para o cliente
    await db.collection('notifications').add({
      userId: clientId,
      type: 'project_proposal',
      title: 'Nova proposta recebida',
      message: `${freelancerData.name} enviou uma proposta para o projeto "${projectData.title}"`,
      actionUrl: `/cliente/projeto/${projectId}`,
      actionLabel: 'Ver proposta',
      metadata: {
        projectId,
        proposalId: event.params.proposalId,
        freelancerId
      },
      read: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    // Registrar log do sistema para nova proposta
    await createSystemLog(
      'project',
      'info',
      'Nova proposta enviada',
      `${freelancerData.name || freelancerData.email} enviou proposta para "${projectData.title}" - Valor: R$ ${proposalData.amount || 'Não informado'}`,
      'projectService.onProjectProposalCreated',
      { 
        projectId, 
        proposalId: event.params.proposalId, 
        freelancerId, 
        clientId,
        projectTitle: projectData.title,
        freelancerName: freelancerData.name,
        proposalAmount: proposalData.amount
      },
      freelancerId,
      projectId
    );

    logger.info('Notificação de proposta criada', { 
      projectId, 
      freelancerId, 
      clientId 
    });

  } catch (error) {
    logger.error('Erro ao criar notificação de proposta:', error);
  }
});

// Trigger: Criar notificação quando um novo projeto é criado
export const onProjectCreated = onDocumentCreated('projects/{projectId}', async (event) => {
  try {
    const data = event.data?.data();
    if (!data) return;

    const { clientId, title } = data;

    // Buscar dados do cliente
    const clientDoc = await db.collection('users').doc(clientId).get();
    const clientData = clientDoc.data();
    const clientName = clientData?.name || clientData?.email || 'Cliente';

    // Criar notificação para o cliente confirmando criação do projeto
    await db.collection('notifications').add({
      userId: clientId,
      type: 'project_created',
      title: 'Projeto criado com sucesso',
      message: `Seu projeto "${title}" foi criado com sucesso e já está visível para freelancers.`,
      actionUrl: `/cliente/projeto/${event.params.projectId}`,
      actionLabel: 'Ver projeto',
      read: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      metadata: { projectId: event.params.projectId }
    });

    // Registrar log do sistema para novo projeto
    await LogHelpers.projectCreated(
      title,
      clientName,
      event.params.projectId,
      clientId
    );

    logger.info('Notificação de criação de projeto enviada', { projectId: event.params.projectId, clientId });
  } catch (error) {
    logger.error('Erro ao criar notificação de projeto criado:', error);
  }
});

// Trigger: Criar notificação quando status do projeto muda
export const onProjectStatusChangedV2 = onDocumentUpdated('projects/{projectId}', async (event) => {
  try {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) return;

    const { status: oldStatus } = beforeData;
    const { status: newStatus, clientId, freelancerId, title } = afterData;

    // Se o status não mudou, não fazer nada
    if (oldStatus === newStatus) return;

    // PROTEÇÃO CONTRA LOOPS: Verificar se já foi processado recentemente
    const lastProcessed = afterData._lastStatusTriggerProcessed as FirebaseFirestore.Timestamp | undefined;
    const now = admin.firestore.Timestamp.now();
    if (lastProcessed && (now.seconds - lastProcessed.seconds) < 5) {
      logger.info('Trigger onProjectStatusChangedV2 ignorado - processado recentemente', { projectId: event.params.projectId });
      return;
    }

    let notificationType: NotificationType;
    let notificationTitle: string;
    let notificationMessage: string;
    let targetUserId: string;
    let actionUrl: string;

    switch (newStatus) {
      case 'executando':
        notificationType = 'project_started';
        notificationTitle = 'Projeto iniciado';
        notificationMessage = `O projeto "${title}" foi iniciado`;
        targetUserId = freelancerId;
        actionUrl = `/freelancer/meus-projetos`;
        break;

      case 'concluido':
        notificationType = 'project_completed';
        notificationTitle = 'Projeto concluído';
        notificationMessage = `O projeto "${title}" foi concluído`;
        targetUserId = clientId;
        actionUrl = `/cliente/projeto/${event.params.projectId}`;
        break;

      case 'cancelado':
        notificationType = 'project_cancelled';
        notificationTitle = 'Projeto cancelado';
        notificationMessage = `O projeto "${title}" foi cancelado`;
        targetUserId = freelancerId;
        actionUrl = `/freelancer/meus-projetos`;
        break;

      case 'aprovado':
        notificationType = 'project_approved';
        notificationTitle = 'Projeto aprovado';
        notificationMessage = `O projeto "${title}" foi aprovado pelo cliente`;
        targetUserId = freelancerId;
        actionUrl = `/freelancer/meus-projetos`;
        break;

      case 'para_pagamento':
        notificationType = 'project_for_payment';
        notificationTitle = 'Projeto aguardando pagamento';
        notificationMessage = `O projeto "${title}" está aguardando pagamento`;
        targetUserId = clientId;
        actionUrl = `/cliente/projeto/${event.params.projectId}`;
        break;

      default:
        return; // Não criar notificação para outros status
    }

    // Criar notificação
    await db.collection('notifications').add({
      userId: targetUserId,
      type: notificationType,
      title: notificationTitle,
      message: notificationMessage,
      actionUrl,
      actionLabel: 'Ver projeto',
      metadata: {
        projectId: event.params.projectId,
        oldStatus,
        newStatus
      },
      read: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    // Buscar dados dos usuários para notificação aos administradores
    const clientDoc = await db.collection('users').doc(clientId).get();
    const freelancerDoc = await db.collection('users').doc(freelancerId).get();
    const clientData = clientDoc.data();
    const freelancerData = freelancerDoc.data();
    
    const clientName = clientData?.name || clientData?.email || 'Cliente';
    const freelancerName = freelancerData?.name || freelancerData?.email || 'Freelancer';

    // Notificar administradores sobre mudança de status
    let adminMessage = '';
    switch (newStatus) {
      case 'executando':
        adminMessage = `Projeto "${title}" foi iniciado por ${freelancerName}`;
        break;
      case 'concluido':
        adminMessage = `Projeto "${title}" foi concluído por ${freelancerName}`;
        break;
      case 'cancelado':
        adminMessage = `Projeto "${title}" foi cancelado`;
        break;
      case 'aprovado':
        adminMessage = `Projeto "${title}" foi aprovado por ${clientName}`;
        break;
      case 'para_pagamento':
        adminMessage = `Projeto "${title}" foi encaminhado para pagamento`;
        break;
    }

    // Registrar log do sistema para mudança de status do projeto
    if (adminMessage) {
      const logLevel = newStatus === 'cancelado' ? 'warning' : 'info';
      await createSystemLog(
        'project',
        logLevel,
        `Projeto ${newStatus}`,
        adminMessage,
        'projectService.onProjectStatusChanged',
        {
          oldStatus,
          newStatus,
          clientId,
          freelancerId,
          title,
          clientName,
          freelancerName
        },
        undefined,
        event.params.projectId
      );
    }

    // Marcar como processado para evitar loops
    await event.data?.after.ref.update({
      _lastStatusTriggerProcessed: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info('Notificação de mudança de status criada', { 
      projectId: event.params.projectId, 
      oldStatus, 
      newStatus,
      userId: targetUserId
    });

  } catch (error) {
    logger.error('Erro ao criar notificação de mudança de status:', error);
  }
});

// Trigger: Criar notificação quando status de assinatura muda (renovação, cancelamento, alteração)
export const onSubscriptionStatusChanged = onDocumentUpdated('subscriptions/{subscriptionId}', async (event) => {
  try {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) return;

    const { status: oldStatus, planId: oldPlan } = beforeData;
    const { status: newStatus, planId: newPlan, userId } = afterData;

    if (oldStatus === newStatus && oldPlan === newPlan) return;

    let notificationType: NotificationType;
    let title: string;
    let message: string;

    switch (newStatus) {
      case 'active':
        if (oldStatus === 'active' && oldPlan !== newPlan) {
          notificationType = 'plan_changed';
          title = 'Plano alterado';
          message = 'Sua assinatura foi migrada para um novo plano.';
        } else if (oldStatus !== 'active') {
          notificationType = 'plan_renewed';
          title = 'Plano renovado';
          message = 'Sua assinatura foi renovada com sucesso.';
        } else {
          return;
        }
        break;
      case 'canceled':
        notificationType = 'plan_cancelled';
        title = 'Plano cancelado';
        message = 'Sua assinatura foi cancelada. Você pode reativá-la a qualquer momento.';
        break;
      default:
        return;
    }

    await db.collection('notifications').add({
      userId,
      type: notificationType,
      title,
      message,
      actionUrl: '/minha-conta/planos',
      actionLabel: 'Gerenciar plano',
      read: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      metadata: { oldStatus, newStatus, oldPlan, newPlan }
    });

    // Buscar dados do usuário para notificação aos administradores
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const userName = userData?.name || userData?.email || 'Usuário';
    const userType = userData?.userType || 'indefinido';

    // Buscar dados do plano se disponível
    let planName = newPlan || 'Plano desconhecido';
    if (newPlan) {
      try {
        const planDoc = await db.collection('plans').doc(newPlan).get();
        const planData = planDoc.data();
        planName = planData?.name || planName;
      } catch (planError) {
        logger.warn('Erro ao buscar dados do plano:', planError);
      }
    }

    // Notificar administradores sobre mudanças de assinatura
    let adminMessage = '';
    switch (newStatus) {
      case 'active':
        if (oldStatus === 'active' && oldPlan !== newPlan) {
          adminMessage = `${userName} (${userType}) alterou para o plano "${planName}"`;
        } else if (oldStatus !== 'active') {
          adminMessage = `${userName} (${userType}) renovou a assinatura do plano "${planName}"`;
        }
        break;
      case 'canceled':
        adminMessage = `${userName} (${userType}) cancelou a assinatura do plano "${planName}"`;
        break;
    }

    // Registrar log do sistema para mudança de status de assinatura
    if (adminMessage) {
      const logLevel = newStatus === 'canceled' ? 'warning' : 'info';
      await createSystemLog(
        'plan',
        logLevel,
        `Assinatura ${newStatus === 'active' ? (oldStatus === 'active' ? 'alterada' : 'renovada') : 'cancelada'}`,
        adminMessage,
        'subscriptionService.onSubscriptionStatusChanged',
        {
          subscriptionId: event.params.subscriptionId,
          oldStatus,
          newStatus,
          oldPlan,
          newPlan,
          userName,
          userType,
          planName
        },
        userId
      );
    }

    logger.info('Notificação de alteração de assinatura', { subscriptionId: event.params.subscriptionId, userId, newStatus });
  } catch (error) {
    logger.error('Erro ao criar notificação de assinatura:', error);
  }
});

// Trigger: Criar notificação quando um pagamento é processado
export const onPaymentStatusChanged = onDocumentUpdated('projectPayments/{paymentId}', async (event) => {
  try {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) return;

    // Suportar campos 'paymentStatus' e 'status'
    const oldStatus = (beforeData.paymentStatus || beforeData.status) as string | undefined;
    const newStatus = (afterData.paymentStatus || afterData.status) as string | undefined;
    const projectId = afterData.projectId as string;
    const amount = (afterData.amount || afterData.projectValue || afterData.totalPaid || 0) as number;

    // Se o status não mudou ou está indefinido, não fazer nada
    if (!newStatus || oldStatus === newStatus) return;

    // PROTEÇÃO CONTRA LOOPS: Verificar se já foi processado recentemente
    const lastProcessed = afterData._lastPaymentTriggerProcessed as FirebaseFirestore.Timestamp | undefined;
    const now = admin.firestore.Timestamp.now();
    if (lastProcessed && (now.seconds - lastProcessed.seconds) < 5) {
      logger.info('Trigger onPaymentStatusChanged ignorado - processado recentemente', { paymentId: event.params.paymentId });
      return;
    }

    // Buscar dados do projeto
    const projectDoc = await db.collection('projects').doc(projectId).get();
    const projectData = projectDoc.data();

    if (!projectData) return;

    const { clientId, freelancerId, title } = projectData;

    let notificationType: NotificationType;
    let notificationTitle: string;
    let notificationMessage: string;
    let targetUserId: string;
    let actionUrl: string;

    switch (newStatus) {
      case 'paid':
        notificationType = 'payment_received';
        notificationTitle = 'Pagamento confirmado';
        notificationMessage = `Pagamento de R$ ${amount} confirmado para o projeto "${title}"`;
        targetUserId = freelancerId;
        actionUrl = `/freelancer/minhas-financas`;
        break;

      case 'released':
        notificationType = 'payment_released';
        notificationTitle = 'Pagamento liberado';
        notificationMessage = `Pagamento de R$ ${amount} foi liberado para o projeto "${title}"`;
        targetUserId = freelancerId;
        actionUrl = `/freelancer/minhas-financas`;
        break;

      case 'failed':
        notificationType = 'payment_failed';
        notificationTitle = 'Falha no pagamento';
        notificationMessage = `Pagamento de R$ ${amount} falhou para o projeto "${title}"`;
        targetUserId = clientId;
        actionUrl = `/cliente/projeto/${projectId}`;
        break;

      case 'pending':
        notificationType = 'payment_pending';
        notificationTitle = 'Pagamento pendente';
        notificationMessage = `Seu pagamento de R$ ${amount} para o projeto "${title}" está pendente.`;
        targetUserId = clientId;
        actionUrl = `/cliente/projeto/${projectId}`;
        break;

      case 'refused':
        notificationType = 'payment_refused';
        notificationTitle = 'Pagamento recusado';
        notificationMessage = `Seu pagamento de R$ ${amount} para o projeto "${title}" foi recusado.`;
        targetUserId = clientId;
        actionUrl = `/cliente/projeto/${projectId}`;
        break;

      case 'proof_uploaded':
        notificationType = 'payment_proof_uploaded';
        notificationTitle = 'Comprovante de pagamento enviado';
        notificationMessage = `Comprovante de pagamento enviado para o projeto "${title}".`;
        targetUserId = freelancerId;
        actionUrl = `/freelancer/meus-projetos`;
        break;

      default:
        return; // Não criar notificação para outros status
    }

    // Criar notificação
    await db.collection('notifications').add({
      userId: targetUserId,
      type: notificationType,
      title: notificationTitle,
      message: notificationMessage,
      actionUrl,
      actionLabel: 'Ver detalhes',
      metadata: {
        projectId,
        paymentId: event.params.paymentId,
        amount,
        oldStatus,
        newStatus
      },
      read: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    // Enviar e-mails para pagamentos confirmados
    if (newStatus === 'paid') {
      try {
        const clientDoc = await db.collection('users').doc(clientId).get();
        const freelancerDoc = await db.collection('users').doc(freelancerId).get();
        const clientEmail = clientDoc.data()?.email as string | undefined;
        const freelancerEmail = freelancerDoc.data()?.email as string | undefined;

        if (clientEmail) {
          await db.collection('mail').add({
            to: clientEmail,
            message: {
              subject: 'Pagamento confirmado - Xjobs',
              html: `<p>Olá,</p><p>Seu pagamento para o projeto "${title}" foi confirmado.</p><p><a href="https://www.xjobsfreelancer.com/cliente/projeto/${projectId}">Ver projeto</a></p>`
            },
            createdAt: FieldValue.serverTimestamp()
          });
        }
        if (freelancerEmail) {
          await db.collection('mail').add({
            to: freelancerEmail,
            message: {
              subject: 'Pagamento confirmado - Inicie o projeto',
              html: `<p>Olá,</p><p>O pagamento do projeto "${title}" foi confirmado. Você pode iniciar o trabalho.</p><p><a href="https://www.xjobsfreelancer.com/freelancer/meus-projetos">Acessar projetos</a></p>`
            },
            createdAt: FieldValue.serverTimestamp()
          });
        }
      } catch (emailErr) {
        logger.error('Falha ao enfileirar e-mails de pagamento confirmado:', emailErr);
      }
    }

    // Registrar logs do sistema para mudanças de pagamento
    const clientDoc = await db.collection('users').doc(clientId).get();
    const freelancerDoc = await db.collection('users').doc(freelancerId).get();
    const clientData = clientDoc.data();
    const freelancerData = freelancerDoc.data();
    
    const clientName = clientData?.name || clientData?.email || 'Cliente';
    const freelancerName = freelancerData?.name || freelancerData?.email || 'Freelancer';

    // Criar logs específicos para cada status de pagamento
    switch (newStatus) {
      case 'paid':
        await LogHelpers.paymentReceived(amount, title, clientName, freelancerName, projectId);
        break;
      case 'released':
        await LogHelpers.paymentReleased(amount, title, freelancerName, projectId);
        break;
      case 'failed':
        await LogHelpers.paymentFailed(amount, title, clientName, projectId, 'Falha no processamento');
        break;
      case 'refused':
        await LogHelpers.paymentFailed(amount, title, clientName, projectId, 'Pagamento recusado');
        break;
    }

    // Marcar como processado para evitar loops
    await event.data?.after.ref.update({
      _lastPaymentTriggerProcessed: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info('Notificação de pagamento criada', { 
      paymentId: event.params.paymentId, 
      oldStatus, 
      newStatus,
      targetUserId
    });

  } catch (error) {
    logger.error('Erro ao criar notificação de pagamento:', error);
  }
});

// Trigger: Notificações de moderação
export const onModerationRequestCreated = onDocumentCreated('moderationRequests/{requestId}', async (event) => {
  try {
    const data = event.data?.data();
    if (!data) return;

    const { status, moderatorId, projectTitle, chatId, projectId, requesterId, reason } = data as {
      status?: string;
      moderatorId?: string;
      projectTitle?: string;
      chatId?: string;
      projectId?: string;
      requesterId?: string;
      reason?: string;
    };
    
    // Notificar administradores sobre nova solicitação de moderação
    if (status === 'pending' || !status) {
      // Buscar dados do solicitante
      let requesterName = 'Usuário';
      if (requesterId) {
        try {
          const requesterDoc = await db.collection('users').doc(requesterId).get();
          const requesterData = requesterDoc.data();
          requesterName = requesterData?.name || requesterData?.email || 'Usuário';
        } catch (error) {
          logger.warn('Erro ao buscar dados do solicitante:', error);
        }
      }

      // Registrar log do sistema para solicitação de moderação
      await createSystemLog(
        'dispute',
        'warning',
        'Nova solicitação de moderação',
        `${requesterName} solicitou moderação para o projeto "${projectTitle}"${reason ? ` - Motivo: ${reason}` : ''}`,
        'moderationService.onModerationRequestCreated',
        {
          requestId: event.params.requestId,
          chatId,
          projectTitle,
          reason,
          requesterName
        },
        requesterId,
        projectId
      );
    }
    
    if (status === 'assigned' && moderatorId) {
      await db.collection('notifications').add({
        userId: moderatorId,
        type: 'moderation_assigned',
        title: 'Nova moderação atribuída',
        message: `Você foi atribuído para moderar o projeto "${projectTitle}"`,
        actionUrl: `/manager/chats?id=${chatId}`,
        actionLabel: 'Abrir chat',
        metadata: { requestId: event.params.requestId, projectId, chatId },
        read: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
      logger.info('Notificação de moderação atribuída', { requestId: event.params.requestId, moderatorId });
    }
  } catch (error) {
    logger.error('Erro ao criar notificação de moderação (create):', error);
  }
});

export const onModerationRequestUpdated = onDocumentUpdated('moderationRequests/{requestId}', async (event) => {
  try {
    const beforeData = event.data?.before.data() as { status?: string };
    const afterData = event.data?.after.data() as {
      status?: string;
      moderatorId?: string;
      requestedBy?: string;
      projectTitle?: string;
      chatId?: string;
      projectId?: string;
    };
    if (!beforeData || !afterData) return;

    const oldStatus = beforeData.status;
    const newStatus = afterData.status;
    if (oldStatus === newStatus) return;

    const { moderatorId, requestedBy, projectTitle, chatId, projectId } = afterData;

    if (newStatus === 'assigned' && moderatorId) {
      await db.collection('notifications').add({
        userId: moderatorId,
        type: 'moderation_assigned',
        title: 'Nova moderação atribuída',
        message: `Você foi atribuído para moderar o projeto "${projectTitle}"`,
        actionUrl: `/manager/chats?id=${chatId}`,
        actionLabel: 'Abrir chat',
        metadata: { requestId: event.params.requestId, projectId, chatId },
        read: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
    } else if (newStatus === 'resolved' || newStatus === 'rejected') {
      const type = newStatus === 'resolved' ? 'moderation_resolved' : 'moderation_rejected';
      const title = newStatus === 'resolved' ? 'Solicitação resolvida' : 'Solicitação rejeitada';
      const message = newStatus === 'resolved'
        ? `Sua solicitação de moderação para o projeto "${projectTitle}" foi resolvida.`
        : `Sua solicitação de moderação para o projeto "${projectTitle}" foi rejeitada.`;

      await db.collection('notifications').add({
        userId: requestedBy,
        type,
        title,
        message,
        actionUrl: `/chat/${chatId}`,
        actionLabel: 'Abrir chat',
        metadata: { 
          requestId: event.params.requestId, 
          projectId, 
          chatId,
          targetRole: 'cliente' // Assumindo que é para o cliente por padrão
        },
        read: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      // Buscar dados do solicitante e moderador para notificação aos administradores
      let requesterName = 'Usuário';
      let moderatorName = 'Moderador';
      
      if (requestedBy) {
        try {
          const requesterDoc = await db.collection('users').doc(requestedBy).get();
          const requesterData = requesterDoc.data();
          requesterName = requesterData?.name || requesterData?.email || 'Usuário';
        } catch (error) {
          logger.warn('Erro ao buscar dados do solicitante:', error);
        }
      }
      
      if (moderatorId) {
        try {
          const moderatorDoc = await db.collection('users').doc(moderatorId).get();
          const moderatorData = moderatorDoc.data();
          moderatorName = moderatorData?.name || moderatorData?.email || 'Moderador';
        } catch (error) {
          logger.warn('Erro ao buscar dados do moderador:', error);
        }
      }

      // Notificar administradores sobre resolução/rejeição da disputa
      const adminMessage = newStatus === 'resolved'
        ? `Disputa do projeto "${projectTitle}" foi resolvida por ${moderatorName} (solicitante: ${requesterName})`
        : `Disputa do projeto "${projectTitle}" foi rejeitada por ${moderatorName} (solicitante: ${requesterName})`;

      // Registrar log do sistema para resolução/rejeição de disputa
       if (newStatus === 'resolved') {
         await LogHelpers.disputeResolved(
            projectTitle || 'Projeto não identificado',
            `Resolvida por ${moderatorName} (solicitante: ${requesterName})`,
            projectId || ''
          );
      } else {
        await createSystemLog(
          'dispute',
          'warning',
          'Disputa rejeitada',
          adminMessage,
          'moderationService.onModerationRequestUpdated',
          {
            requestId: event.params.requestId,
            chatId,
            requestedBy,
            moderatorId,
            projectTitle,
            requesterName,
            moderatorName,
            oldStatus,
            newStatus
          },
           moderatorId,
           projectId || undefined
        );
      }
    }

    logger.info('Notificação de atualização de moderação', { requestId: event.params.requestId, oldStatus, newStatus });
  } catch (error) {
    logger.error('Erro ao criar notificação de moderação (update):', error);
  }
});