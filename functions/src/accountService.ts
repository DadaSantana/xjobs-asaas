import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { initializeApp, getApps } from 'firebase-admin/app';
import { logger } from 'firebase-functions';

// Ensure Admin SDK is initialized exactly once
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

export const forceUpdateUserEmail = onCall({
  maxInstances: 10,
  timeoutSeconds: 540,
  memory: '256MiB'
}, async (request) => {
  try {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Usuário não autenticado');
    }

    const { newEmail } = request.data as { newEmail?: string };
    if (!newEmail || typeof newEmail !== 'string') {
      throw new HttpsError('invalid-argument', 'Novo email é obrigatório');
    }

    // Atualizar email no Firebase Auth via Admin SDK (sem verificação por link)
    await getAdminAuth().updateUser(uid, { email: newEmail });

    // Sincronizar no Firestore
    await db.collection('users').doc(uid).update({
      email: newEmail,
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info('forceUpdateUserEmail: email atualizado', { uid, newEmail });

    return { success: true };
  } catch (error: unknown) {
    logger.error('Erro em forceUpdateUserEmail', error as object);
    if (error instanceof HttpsError) throw error;
    const message = error instanceof Error ? error.message : 'Erro interno';
    throw new HttpsError('internal', message);
  }
});


