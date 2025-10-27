const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixProjectStatus() {
  try {
    console.log('Corrigindo status do projeto...');
    
    const projectId = '7UHfdlYg57rySQ0m8emt';
    const orderId = 'or_Qv35YLS2OiPDjwVb';
    
    // Atualizar status do pagamento para falha
    console.log('Atualizando status do pagamento...');
    const paymentQuery = await db.collection('projectPayments')
      .where('orderId', '==', orderId)
      .limit(1)
      .get();
    
    if (!paymentQuery.empty) {
      const paymentDoc = paymentQuery.docs[0];
      await paymentDoc.ref.update({
        paymentStatus: 'failed',
        escrowStatus: 'none',
        failureReason: 'Pagamento negado pelo banco emissor',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('Status do pagamento atualizado para "failed"');
    } else {
      console.log('Pagamento não encontrado');
    }
    
    // Reverter status do projeto para 'aguardando_garantia'
    console.log('Revertendo status do projeto...');
    await db.collection('projects')
      .doc(projectId)
      .update({
        status: 'aguardando_garantia',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    
    console.log('Status do projeto revertido para "aguardando_garantia"');
    console.log('Correção concluída com sucesso!');
    
  } catch (error) {
    console.error('Erro ao corrigir status:', error);
  } finally {
    process.exit(0);
  }
}

fixProjectStatus();