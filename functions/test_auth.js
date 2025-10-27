const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'xjobs-a43d2'
  });
}

async function createTestToken() {
  try {
    // Criar um token customizado para teste
    const uid = 'test-user-123';
    const customToken = await admin.auth().createCustomToken(uid);
    console.log('Custom Token:', customToken);
    
    // Ou usar um UID de usuário existente se preferir
    // const existingUid = 'algum-uid-real';
    // const existingUserToken = await admin.auth().createCustomToken(existingUid);
    // console.log('Existing User Token:', existingUserToken);
    
  } catch (error) {
    console.error('Erro ao criar token:', error);
  }
}

createTestToken();