import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { logger } from 'firebase-functions/v2';

// Inicializar Firebase Admin se ainda não foi inicializado
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

// Função para testar criação de notificação
export async function testCreateNotification() {
  try {
    logger.info('Testando criação de notificação...');
    
    const testNotification = {
      userId: 'test-user-id',
      type: 'test_notification',
      title: 'Teste de Notificação',
      message: 'Esta é uma notificação de teste',
      data: {
        testData: 'valor de teste'
      },
      read: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('notifications').add(testNotification);
    logger.info(`Notificação de teste criada com ID: ${docRef.id}`);
    
    return { success: true, id: docRef.id };
  } catch (error) {
    logger.error('Erro ao criar notificação de teste:', error);
    return { success: false, error };
  }
}

// Função para testar busca de notificações
export async function testGetNotifications(userId: string) {
  try {
    logger.info(`Testando busca de notificações para usuário: ${userId}`);
    
    const notificationsQuery = await db
      .collection('notifications')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const notifications = notificationsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    logger.info(`Encontradas ${notifications.length} notificações`);
    return { success: true, notifications };
  } catch (error) {
    logger.error('Erro ao buscar notificações:', error);
    return { success: false, error };
  }
}

// Função para testar limpeza de notificações antigas
export async function testCleanupNotifications() {
  try {
    logger.info('Testando limpeza de notificações antigas...');
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldNotificationsQuery = await db
      .collection('notifications')
      .where('read', '==', true)
      .where('updatedAt', '<=', thirtyDaysAgo)
      .limit(5) // Limitar para teste
      .get();

    logger.info(`Encontradas ${oldNotificationsQuery.docs.length} notificações antigas para limpeza`);
    
    if (oldNotificationsQuery.docs.length > 0) {
      const batch = db.batch();
      oldNotificationsQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      logger.info(`${oldNotificationsQuery.docs.length} notificações antigas removidas`);
    }

    return { success: true, deletedCount: oldNotificationsQuery.docs.length };
  } catch (error) {
    logger.error('Erro ao limpar notificações antigas:', error);
    return { success: false, error };
  }
}

// Função principal de teste
export async function runNotificationTests() {
  logger.info('Iniciando testes de notificações...');
  
  const results = {
    createTest: await testCreateNotification(),
    getTest: await testGetNotifications('test-user-id'),
    cleanupTest: await testCleanupNotifications()
  };

  logger.info('Resultados dos testes:', results);
  return results;
}