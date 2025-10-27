const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkPayments() {
  try {
    console.log('Verificando pagamentos no Firestore...');
    
    const paymentsSnapshot = await db.collection('projectPayments')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    
    if (paymentsSnapshot.empty) {
      console.log('Nenhum pagamento encontrado');
      return;
    }
    
    console.log('Pagamentos encontrados:');
    paymentsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`\nID: ${doc.id}`);
      console.log(`Order ID: ${data.orderId}`);
      console.log(`Status: ${data.paymentStatus}`);
      console.log(`Projeto: ${data.projectId}`);
      console.log(`Valor: ${data.projectValue}`);
      console.log(`Criado em: ${data.createdAt?.toDate()}`);
    });
    
    // Verificar também projetos com status 'executando'
    console.log('\n=== Projetos com status "executando" ===');
    const projectsSnapshot = await db.collection('projects')
      .where('status', '==', 'executando')
      .limit(5)
      .get();
    
    projectsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`\nProjeto ID: ${doc.id}`);
      console.log(`Título: ${data.title}`);
      console.log(`Status: ${data.status}`);
      console.log(`Atualizado em: ${data.updatedAt?.toDate()}`);
    });
    
  } catch (error) {
    console.error('Erro ao verificar pagamentos:', error);
  } finally {
    process.exit(0);
  }
}

checkPayments();