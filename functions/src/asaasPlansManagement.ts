/**
 * Firebase Functions para gerenciamento de planos Asaas
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';
import { getCycleFromCategory } from './asaasService';

// Inicializa o admin caso não esteja inicializado
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const corsHandler = cors({
  origin: function (origin, callback) {
    // Permitir localhost para desenvolvimento
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(null, true); // Permite todas as origens por enquanto
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  credentials: true
});

/**
 * Verificar se o usuário é admin
 */
async function isAdmin(req: functions.https.Request): Promise<boolean> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }
    const token = authHeader.split('Bearer ')[1];
    const decoded = await admin.auth().verifyIdToken(token);
    
    // Por enquanto, permitir qualquer usuário autenticado para testes
    // TODO: Implementar verificação de admin real
    return !!decoded.uid;
    
    // return decoded.admin === true; // Descomentrar quando admin estiver configurado
  } catch {
    return false;
  }
}

/**
 * Firebase Function: Criar plano Asaas
 * POST /createAsaasPlan
 */
export const createAsaasPlan = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Método não permitido' });
      return;
    }

    try {
      // Verificar se é admin
      if (!(await isAdmin(req))) {
        res.status(403).json({ error: 'Acesso negado' });
        return;
      }

      const {
        name,
        description,
        price,
        category,
        messageLimit,
        likeLimit,
        features,
        cardStyle
      } = req.body;

      // Validações
      if (!name || !price || !category) {
        res.status(400).json({
          error: 'Dados obrigatórios ausentes',
          required: ['name', 'price', 'category']
        });
        return;
      }

      // Criar documento no Firestore
      const planData = {
        name,
        description: description || '',
        price: Number(price),
        category: Number(category),
        cycle: getCycleFromCategory(category),
        messageLimit: messageLimit !== undefined ? messageLimit : null,
        likeLimit: likeLimit !== undefined ? likeLimit : null,
        features: features || [],
        cardStyle: cardStyle || {},
        status: 'active',
        gateway: 'asaas',
        subscribers: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const planRef = await db.collection('plans').add(planData);
      
      console.log('[Asaas Plan] Plano criado:', planRef.id);

      res.status(200).json({
        success: true,
        planId: planRef.id,
        message: 'Plano criado com sucesso'
      });

    } catch (error) {
      console.error('[Asaas Plan] Erro ao criar plano:', error);
      res.status(500).json({
        error: 'Erro ao criar plano',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
});

/**
 * Firebase Function: Atualizar plano Asaas
 * PUT /updateAsaasPlan
 */
export const updateAsaasPlan = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'PUT, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'PUT') {
      res.status(405).json({ error: 'Método não permitido' });
      return;
    }

    try {
      // Verificar se é admin
      if (!(await isAdmin(req))) {
        res.status(403).json({ error: 'Acesso negado' });
        return;
      }

      const {
        id,
        name,
        description,
        price,
        category,
        messageLimit,
        likeLimit,
        features,
        cardStyle,
        status
      } = req.body;

      if (!id) {
        res.status(400).json({ error: 'ID do plano é obrigatório' });
        return;
      }

      // Verificar se o plano existe
      const planRef = db.collection('plans').doc(id);
      const planSnap = await planRef.get();

      if (!planSnap.exists) {
        res.status(404).json({ error: 'Plano não encontrado' });
        return;
      }

      // Preparar dados de atualização
      const updateData: Record<string, unknown> = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (price !== undefined) updateData.price = Number(price);
      if (category !== undefined) {
        updateData.category = Number(category);
        updateData.cycle = getCycleFromCategory(category);
      }
      if (messageLimit !== undefined) updateData.messageLimit = messageLimit;
      if (likeLimit !== undefined) updateData.likeLimit = likeLimit;
      if (features !== undefined) updateData.features = features;
      if (cardStyle !== undefined) updateData.cardStyle = cardStyle;
      if (status !== undefined) updateData.status = status;

      await planRef.update(updateData);

      console.log('[Asaas Plan] Plano atualizado:', id);

      res.status(200).json({
        success: true,
        message: 'Plano atualizado com sucesso'
      });

    } catch (error) {
      console.error('[Asaas Plan] Erro ao atualizar plano:', error);
      res.status(500).json({
        error: 'Erro ao atualizar plano',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
});

/**
 * Firebase Function: Deletar plano Asaas
 * DELETE /deleteAsaasPlan
 */
export const deleteAsaasPlan = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'DELETE') {
      res.status(405).json({ error: 'Método não permitido' });
      return;
    }

    try {
      // Verificar se é admin
      if (!(await isAdmin(req))) {
        res.status(403).json({ error: 'Acesso negado' });
        return;
      }

      const { planId } = req.body;

      if (!planId) {
        res.status(400).json({ error: 'ID do plano é obrigatório' });
        return;
      }

      // Verificar se existem assinaturas ativas para este plano
      const subscriptionsSnap = await db.collection('activeSubscriptions')
        .where('planId', '==', planId)
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (!subscriptionsSnap.empty) {
        res.status(400).json({
          error: 'Não é possível excluir plano com assinaturas ativas',
          message: 'Desative as assinaturas antes de excluir o plano'
        });
        return;
      }

      // Deletar o plano
      await db.collection('plans').doc(planId).delete();

      console.log('[Asaas Plan] Plano deletado:', planId);

      res.status(200).json({
        success: true,
        message: 'Plano deletado com sucesso'
      });

    } catch (error) {
      console.error('[Asaas Plan] Erro ao deletar plano:', error);
      res.status(500).json({
        error: 'Erro ao deletar plano',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
});

/**
 * Firebase Function: Listar planos Asaas
 * GET /listAsaasPlans
 */
export const listAsaasPlans = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Método não permitido' });
      return;
    }

    try {
      const activeOnly = req.query.activeOnly === 'true';
      const isAdminUser = await isAdmin(req);

      // Query base
      let query = db.collection('plans')
        .where('gateway', '==', 'asaas');

      // Se não for admin, mostrar apenas ativos
      if (!isAdminUser || activeOnly) {
        query = query.where('status', '==', 'active');
      }

      const plansSnap = await query.get();
      const plans = plansSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      res.status(200).json({
        success: true,
        plans
      });

    } catch (error) {
      console.error('[Asaas Plan] Erro ao listar planos:', error);
      res.status(500).json({
        error: 'Erro ao listar planos',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
});

