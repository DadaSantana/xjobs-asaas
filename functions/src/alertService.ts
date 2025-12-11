import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue, QueryDocumentSnapshot } from 'firebase-admin/firestore';

const db = getFirestore();

// Função agendada para verificar deadlines de projetos (executa diariamente às 9h)
export const checkProjectDeadlines = onSchedule({
  schedule: '0 9 * * *',
  timeZone: 'America/Sao_Paulo',
  timeoutSeconds: 540, // 9 minutos (máximo para 2ª gen)
  memory: '256MiB' // Limite de memória
}, async () => {
  try {
    logger.info('Iniciando verificação de deadlines de projetos');
    
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
    
    // Buscar projetos em andamento com deadline próximo (LIMITE ADICIONADO)
    const projectsQuery = await db
      .collection('projects')
      .where('status', '==', 'em_andamento')
      .where('deadline', '<=', threeDaysFromNow)
      .where('deadline', '>', now)
      .limit(100) // Limite para evitar processamento excessivo
      .get();
    
    for (const projectDoc of projectsQuery.docs) {
      const project = projectDoc.data();
      const projectId = projectDoc.id;
      const deadline = project.deadline.toDate();
      const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      let notificationTitle = '';
      let notificationMessage = '';
      
      if (daysUntilDeadline <= 1) {
        notificationTitle = 'Deadline urgente!';
        notificationMessage = `O projeto "${project.title}" tem deadline hoje ou amanhã!`;
      } else if (daysUntilDeadline <= 3) {
        notificationTitle = 'Deadline se aproximando';
        notificationMessage = `O projeto "${project.title}" tem deadline em ${daysUntilDeadline} dias.`;
      }
      
      if (notificationTitle) {
        // Verificar se já foi enviada notificação de deadline recentemente
        const recentNotifications = await db
          .collection('notifications')
          .where('userId', '==', project.selectedFreelancerId)
          .where('type', '==', 'deadline_reminder')
          .where('metadata.projectId', '==', projectId)
          .where('createdAt', '>', new Date(now.getTime() - (24 * 60 * 60 * 1000)))
          .get();
        
        if (recentNotifications.empty) {
          // Notificar freelancer
          await db.collection('notifications').add({
            userId: project.selectedFreelancerId,
            type: 'deadline_reminder',
            title: notificationTitle,
            message: notificationMessage,
            actionUrl: `/freelancer/projeto/${projectId}`,
            actionLabel: 'Ver projeto',
            metadata: {
              projectId,
              deadline: deadline.toISOString(),
              daysUntilDeadline
            },
            read: false,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          });
          
          // Notificar cliente também
          await db.collection('notifications').add({
            userId: project.clientId,
            type: 'deadline_reminder',
            title: 'Deadline do projeto se aproximando',
            message: `O deadline do projeto "${project.title}" está em ${daysUntilDeadline} dias.`,
            actionUrl: `/cliente/projeto/${projectId}`,
            actionLabel: 'Ver projeto',
            metadata: {
              projectId,
              deadline: deadline.toISOString(),
              daysUntilDeadline
            },
            read: false,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          });
          
          logger.info('Notificação de deadline enviada', { 
            projectId, 
            daysUntilDeadline,
            freelancerId: project.selectedFreelancerId,
            clientId: project.clientId
          });
        }
      }
    }
    
    logger.info('Verificação de deadlines concluída', { 
      projectsChecked: projectsQuery.size 
    });
    
  } catch (error) {
    logger.error('Erro ao verificar deadlines:', error);
  }
});

// Função agendada para verificar pagamentos pendentes (executa diariamente às 10h)
export const checkPendingPayments = onSchedule({
  schedule: '0 10 * * *',
  timeZone: 'America/Sao_Paulo',
  timeoutSeconds: 540, // 9 minutos (máximo para 2ª gen)
  memory: '256MiB' // Limite de memória
}, async () => {
  try {
    logger.info('Iniciando verificação de pagamentos pendentes');
    
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
    
    // Buscar pagamentos pendentes há mais de 3 dias (LIMITE ADICIONADO)
    const pendingPaymentsQuery = await db
      .collection('projectPayments')
      .where('paymentStatus', '==', 'pending')
      .where('createdAt', '<=', threeDaysAgo)
      .limit(100) // Limite para evitar processamento excessivo
      .get();
    
    for (const paymentDoc of pendingPaymentsQuery.docs) {
      const payment = paymentDoc.data();
      const paymentId = paymentDoc.id;
      const createdAt = payment.createdAt.toDate();
      const daysPending = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      
      // Buscar dados do projeto
      const projectDoc = await db.collection('projects').doc(payment.projectId).get();
      if (!projectDoc.exists) continue;
      
      const project = projectDoc.data();
      if (!project) continue;
      
      let notificationTitle = '';
      let notificationMessage = '';
      let urgency = 'medium';
      
      if (daysPending >= 7) {
        notificationTitle = 'Pagamento pendente há 1 semana';
        notificationMessage = `Seu pagamento de R$ ${payment.amount} para o projeto "${project.title}" está pendente há ${daysPending} dias.`;
        urgency = 'high';
      } else if (daysPending >= 3) {
        notificationTitle = 'Pagamento pendente';
        notificationMessage = `Seu pagamento de R$ ${payment.amount} para o projeto "${project.title}" está pendente há ${daysPending} dias.`;
        urgency = 'medium';
      }
      
      if (notificationTitle) {
        // Verificar se já foi enviada notificação de pagamento pendente recentemente
        const recentNotifications = await db
          .collection('notifications')
          .where('userId', '==', payment.clientId)
          .where('type', '==', 'payment_pending')
          .where('metadata.paymentId', '==', paymentId)
          .where('createdAt', '>', new Date(now.getTime() - (24 * 60 * 60 * 1000)))
          .get();
        
        if (recentNotifications.empty) {
          // Notificar cliente sobre pagamento pendente
          await db.collection('notifications').add({
            userId: payment.clientId,
            type: 'payment_pending',
            title: notificationTitle,
            message: notificationMessage,
            actionUrl: `/cliente/projeto/${payment.projectId}`,
            actionLabel: 'Efetuar pagamento',
            metadata: {
              projectId: payment.projectId,
              paymentId,
              amount: payment.amount,
              daysPending,
              urgency
            },
            read: false,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          });
          
          logger.info('Notificação de pagamento pendente enviada', { 
            paymentId, 
            daysPending,
            clientId: payment.clientId,
            amount: payment.amount
          });
        }
      }
    }
    
    logger.info('Verificação de pagamentos pendentes concluída', { 
      paymentsChecked: pendingPaymentsQuery.size 
    });
    
  } catch (error) {
    logger.error('Erro ao verificar pagamentos pendentes:', error);
  }
});

// Função agendada para verificar disputas abertas há muito tempo (executa diariamente às 11h)
export const checkOpenDisputes = onSchedule({
  schedule: '0 11 * * *',
  timeZone: 'America/Sao_Paulo',
  timeoutSeconds: 540, // 9 minutos (máximo para 2ª gen)
  memory: '256MiB' // Limite de memória
}, async () => {
  try {
    logger.info('Iniciando verificação de disputas abertas');
    
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
    
    // Buscar disputas abertas há mais de 3 dias (LIMITE ADICIONADO)
    const openDisputesQuery = await db
      .collection('disputes')
      .where('status', '==', 'open')
      .where('createdAt', '<=', threeDaysAgo)
      .limit(100) // Limite para evitar processamento excessivo
      .get();
    
    for (const disputeDoc of openDisputesQuery.docs) {
      const dispute = disputeDoc.data();
      const disputeId = disputeDoc.id;
      const createdAt = dispute.createdAt.toDate();
      const daysOpen = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      
      let notificationTitle = '';
      let notificationMessage = '';
      let urgency = 'medium';
      
      if (daysOpen >= 7) {
        notificationTitle = 'Disputa aberta há 1 semana';
        notificationMessage = `A disputa do projeto "${dispute.projectTitle}" está aberta há ${daysOpen} dias e precisa de atenção.`;
        urgency = 'high';
      } else if (daysOpen >= 3) {
        notificationTitle = 'Disputa aberta';
        notificationMessage = `A disputa do projeto "${dispute.projectTitle}" está aberta há ${daysOpen} dias.`;
        urgency = 'medium';
      }
      
      if (notificationTitle) {
        // Verificar se já foi enviada notificação de disputa aberta recentemente
        const recentNotifications = await db
          .collection('notifications')
          .where('type', '==', 'dispute_created')
          .where('metadata.disputeId', '==', disputeId)
          .where('createdAt', '>', new Date(now.getTime() - (24 * 60 * 60 * 1000)))
          .get();
        
        if (recentNotifications.empty) {
          // Notificar ambas as partes sobre disputa em aberto
          const usersToNotify = [dispute.clientId, dispute.freelancerId];
          
          for (const userId of usersToNotify) {
            const targetRole = userId === dispute.clientId ? 'cliente' : 'freelancer';
            await db.collection('notifications').add({
              userId: userId,
              type: 'dispute_created',
              title: notificationTitle,
              message: notificationMessage,
              actionUrl: `/chat/${dispute.chatId}`,
              actionLabel: 'Ver disputa',
              metadata: {
                disputeId,
                projectId: dispute.projectId,
                chatId: dispute.chatId,
                daysOpen,
                urgency,
                targetRole
              },
              read: false,
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp()
            });
          }
          
          logger.info('Notificação de disputa aberta enviada', { 
            disputeId, 
            daysOpen,
            clientId: dispute.clientId,
            freelancerId: dispute.freelancerId
          });
        }
      }
    }
    
    logger.info('Verificação de disputas abertas concluída', { 
      disputesChecked: openDisputesQuery.size 
    });
    
  } catch (error) {
    logger.error('Erro ao verificar disputas abertas:', error);
  }
});

// Função agendada para limpeza de notificações antigas (executa semanalmente aos domingos às 2h)
export const cleanupOldNotifications = onSchedule({
  schedule: '0 2 * * 0',
  timeZone: 'America/Sao_Paulo',
  timeoutSeconds: 540, // 9 minutos (máximo para 2ª gen)
  memory: '256MiB' // Limite de memória
}, async () => {
  try {
    logger.info('Iniciando limpeza de notificações antigas');
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    // Buscar notificações lidas há mais de 30 dias
    const oldNotificationsQuery = await db
      .collection('notifications')
      .where('read', '==', true)
      .where('updatedAt', '<=', thirtyDaysAgo)
      .limit(500) // Processar em lotes para evitar timeout
      .get();
    
    const batch = db.batch();
    let deletedCount = 0;
    
    oldNotificationsQuery.docs.forEach((doc: QueryDocumentSnapshot) => {
      batch.delete(doc.ref);
      deletedCount++;
    });
    
    if (deletedCount > 0) {
      await batch.commit();
    }
    
    logger.info('Limpeza de notificações antigas concluída', { 
      deletedCount 
    });
    
  } catch (error) {
    logger.error('Erro ao limpar notificações antigas:', error);
  }
});

// Função agendada para verificar projetos sem atividade (executa diariamente às 14h)
export const checkInactiveProjects = onSchedule({
  schedule: '0 14 * * *',
  timeZone: 'America/Sao_Paulo',
  timeoutSeconds: 540, // 9 minutos (máximo para 2ª gen)
  memory: '256MiB' // Limite de memória
}, async () => {
  try {
    logger.info('Iniciando verificação de projetos inativos');
    
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    
    // Buscar projetos em andamento sem atividade recente (LIMITE ADICIONADO)
    const inactiveProjectsQuery = await db
      .collection('projects')
      .where('status', '==', 'em_andamento')
      .where('updatedAt', '<=', sevenDaysAgo)
      .limit(100) // Limite para evitar processamento excessivo
      .get();
    
    for (const projectDoc of inactiveProjectsQuery.docs) {
      const project = projectDoc.data();
      const projectId = projectDoc.id;
      const lastActivity = project.updatedAt.toDate();
      const daysInactive = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
      
      // Verificar se há mensagens recentes no chat
      const chatQuery = await db
        .collection('chats')
        .where('projectId', '==', projectId)
        .limit(1)
        .get();
      
      if (!chatQuery.empty) {
        const chatId = chatQuery.docs[0].id;
        const recentMessagesQuery = await db
          .collection('chats')
          .doc(chatId)
          .collection('messages')
          .where('createdAt', '>', sevenDaysAgo)
          .limit(1)
          .get();
        
        // Se há mensagens recentes, pular este projeto
        if (!recentMessagesQuery.empty) continue;
      }
      
      let notificationTitle = '';
      let notificationMessage = '';
      
      if (daysInactive >= 14) {
        notificationTitle = 'Projeto inativo há 2 semanas';
        notificationMessage = `O projeto "${project.title}" não tem atividade há ${daysInactive} dias. Que tal dar uma olhada?`;
      } else if (daysInactive >= 7) {
        notificationTitle = 'Projeto sem atividade';
        notificationMessage = `O projeto "${project.title}" não tem atividade há ${daysInactive} dias.`;
      }
      
      if (notificationTitle) {
        // Verificar se já foi enviada notificação de inatividade recentemente
        const recentNotifications = await db
          .collection('notifications')
          .where('type', '==', 'system_announcement')
          .where('metadata.projectId', '==', projectId)
          .where('metadata.reason', '==', 'inactivity')
          .where('createdAt', '>', new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000)))
          .get();
        
        if (recentNotifications.empty) {
          // Notificar ambas as partes sobre inatividade
          const usersToNotify = [project.clientId, project.selectedFreelancerId].filter(Boolean);
          
          for (const userId of usersToNotify) {
            await db.collection('notifications').add({
              userId: userId as string,
              type: 'system_announcement',
              title: notificationTitle,
              message: notificationMessage,
              actionUrl: `/projeto/${projectId}`,
              actionLabel: 'Ver projeto',
              metadata: {
                projectId,
                daysInactive,
                reason: 'inactivity'
              },
              read: false,
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp()
            });
          }
          
          logger.info('Notificação de inatividade enviada', { 
            projectId, 
            daysInactive,
            clientId: project.clientId,
            freelancerId: project.selectedFreelancerId
          });
        }
      }
    }
    
    logger.info('Verificação de projetos inativos concluída', { 
      projectsChecked: inactiveProjectsQuery.size 
    });
    
  } catch (error) {
    logger.error('Erro ao verificar projetos inativos:', error);
  }
});