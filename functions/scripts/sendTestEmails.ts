import admin from 'firebase-admin';
import path from 'path';

/*
 * Este script cria um documento na collection "mail" para cada template de e-mail registrado
 * no repositório, enviando tudo para contato@galvant.com.br.
 *
 * Uso:
 *   1. Exporte a variável de ambiente GOOGLE_APPLICATION_CREDENTIALS apontando para
 *      um serviceAccountKey.json com permissão de gravação no Firestore.
 *   2. Execute: npx ts-node functions/scripts/sendTestEmails.ts
 */

// --- Ajuste aqui se necessário --- //
const TARGET_EMAIL = 'contato@galvant.com.br';
const FIREBASE_PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
//-----------------------------------//

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();

// Lista manual dos templates suportados (assunto e nome do template)
// Ajuste conforme adicionar novos templates.
const templates: { template: string; subject: string; }[] = [
  { template: 'user_registered', subject: 'Bem-vindo ao XJobs!' },
  { template: 'profile_updated', subject: 'Perfil atualizado com sucesso' },
  { template: 'project_created', subject: 'Projeto criado com sucesso' },
  { template: 'project_for_payment', subject: 'Seu projeto aguarda pagamento' },
  { template: 'payment_pending', subject: 'Pagamento pendente' },
  { template: 'payment_refused', subject: 'Pagamento recusado' },
  { template: 'payment_proof_uploaded', subject: 'Comprovante enviado' },
  { template: 'plan_subscribed', subject: 'Assinatura realizada' },
  { template: 'plan_renewed', subject: 'Plano renovado' },
  { template: 'plan_cancelled', subject: 'Plano cancelado' },
  { template: 'plan_changed', subject: 'Plano alterado' },
  // adicione novos templates aqui
];

async function main() {
  const batch = db.batch();

  templates.forEach(({ template, subject }) => {
    const ref = db.collection('mail').doc();
    batch.set(ref, {
      to: TARGET_EMAIL,
      template: { name: template, data: {} }, // data pode ser ajustada conforme cada template exija
      message: { subject },
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  console.log(`🔥 Emails de teste adicionados à coleção 'mail' para ${TARGET_EMAIL}`);
}

main().catch((err) => {
  console.error('Erro ao enviar e-mails de teste:', err);
  process.exit(1);
});