/**
 * Serviço para saques via Asaas
 */

import { auth } from '@/lib/firebase';

/**
 * Processar saque via Asaas
 */
export async function processWithdrawalAsaas(amount: number): Promise<{
  success: boolean;
  withdrawalId: string;
  transferId: string;
  message: string;
}> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  try {
    const token = await user.getIdToken();
    const response = await fetch(
      'https://us-central1-xjobs-a43d2.cloudfunctions.net/processWithdrawalAsaas',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao processar saque');
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Erro ao processar saque:', error);
    throw error;
  }
}
