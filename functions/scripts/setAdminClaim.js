const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'xjobs-a43d2'
});

const uid = 'At6zn0BZhLXAdR6DmBs9AGsIeoK2'; // admin@xjobsfreelancer.com

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log(`Custom claim 'admin: true' set for user ${uid}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error setting custom claim:', error);
    process.exit(1);
  }); 