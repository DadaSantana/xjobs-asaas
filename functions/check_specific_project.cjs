const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkSpecificProject() {
  try {
    const projectId = '7UHfdlYg57rySQ0m8emt';
    
    const projectDoc = await db.collection('projects').doc(projectId).get();
    
    if (projectDoc.exists) {
      const projectData = projectDoc.data();
      console.log('Status do projeto:', projectData.status);
      console.log('Título:', projectData.title);
      console.log('Atualizado em:', projectData.updatedAt?.toDate());
    } else {
      console.log('Projeto não encontrado');
    }
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    process.exit(0);
  }
}

checkSpecificProject();