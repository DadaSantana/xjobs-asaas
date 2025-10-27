import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { RecipientData } from '@/components/RecipientSetupModal';

const CREATE_RECIPIENT_URL = 'https://us-central1-xjobs-a43d2.cloudfunctions.net/createRecipient';
const CHECK_RECIPIENT_URL = 'https://us-central1-xjobs-a43d2.cloudfunctions.net/checkRecipient';

interface Recipient {
  id: string;
  name: string;
  email: string;
  code: string;
  document: string;
  type: string;
  payment_mode: string;
  status: string;
  verified?: boolean;
  created_at: string;
  updated_at: string;
  transfer_settings: any;
  default_bank_account: any;
  gateway_recipients: any[];
  automatic_anticipation_settings: any;
  metadata: any;
  register_information: any;
}

interface UseRecipientReturn {
  hasRecipient: boolean;
  recipient: Recipient | null;
  loading: boolean;
  error: string | null;
  checkRecipient: () => Promise<void>;
  createRecipient: (data: RecipientData) => Promise<boolean>;
}

export const useRecipient = (): UseRecipientReturn => {
  const [hasRecipient, setHasRecipient] = useState(false);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);

  const getAuthToken = async (): Promise<string | null> => {
    const user = auth.currentUser;
    if (!user) return null;
    const token = await user.getIdToken();
    return token;
  };

  const checkRecipient = async (): Promise<void> => {
    try {
      setError(null);

      const token = await getAuthToken();
      console.log('useRecipient.checkRecipient -> token presente?', !!token);
      if (!token) {
        return;
      }

      setLoading(true);

      const response = await fetch(CHECK_RECIPIENT_URL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const text = await response.text();
      console.log('useRecipient.checkRecipient -> status:', response.status, 'body:', text);

      if (!response.ok) {
        let errorData: any = {};
        try { errorData = JSON.parse(text); } catch {}
        throw new Error(errorData.error || 'Erro ao verificar recipient');
      }

      const data = text ? JSON.parse(text) : { hasRecipient: false, recipient: null };
      setHasRecipient(!!data.hasRecipient);
      setRecipient(data.recipient || null);
    } catch (err) {
      const user = auth.currentUser;
      if (user) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        console.error('Erro ao verificar recipient:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const createRecipient = async (data: RecipientData): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const token = await getAuthToken();
      console.log('useRecipient.createRecipient -> token presente?', !!token);
      if (!token) {
        setError('Usuário não autenticado');
        return false;
      }

      const response = await fetch(CREATE_RECIPIENT_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const text = await response.text();
      console.log('useRecipient.createRecipient -> status:', response.status, 'body:', text);

      if (!response.ok) {
        let errorData: any = {};
        try { errorData = JSON.parse(text); } catch {}
        throw new Error(errorData.error || 'Erro ao criar recipient');
      }

      const result = text ? JSON.parse(text) : { recipient: null };
      setHasRecipient(true);
      setRecipient(result.recipient);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao criar recipient:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthReady(true);
      console.log('useRecipient -> onAuthStateChanged user?', !!user);
      if (user) {
        checkRecipient();
      } else {
        setLoading(false);
        setHasRecipient(false);
        setRecipient(null);
      }
    });
    return () => unsubscribe();
  }, []);

  return {
    hasRecipient,
    recipient,
    loading: loading || !isAuthReady,
    error,
    checkRecipient,
    createRecipient,
  };
}; 