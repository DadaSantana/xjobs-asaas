import React, { useState, useEffect } from 'react';
import { useRecipient } from '@/hooks/useRecipient';
import RecipientSetupModal from './RecipientSetupModal';
import { useToast } from '@/hooks/use-toast';
import { useAppSelector } from '@/hooks/redux';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';

interface RecipientCheckWrapperProps {
  children: React.ReactNode;
  showRecipientModal?: boolean;
  onCloseRecipientModal?: () => void;
}

const RecipientCheckWrapper: React.FC<RecipientCheckWrapperProps> = ({ 
  children, 
  showRecipientModal = false, 
  onCloseRecipientModal 
}) => {
  const { hasRecipient, recipient, loading, error, createRecipient } = useRecipient();
  const { userProfile } = useAppSelector((state) => state.auth);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dbVerified, setDbVerified] = useState<boolean | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const uid = userProfile?.uid;
    if (!uid) {
      setDbVerified(null);
      return;
    }

    const ref = doc(db, 'users', uid);

    (async () => {
      try {
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data: any = snap.data();
          const verifiedFromDoc = data?.verified === true || data?.recipient?.verified === true;
          console.log('RecipientCheckWrapper -> getDoc /users verified:', data?.verified, 'recipient.verified:', data?.recipient?.verified, 'computed:', verifiedFromDoc);
          setDbVerified(verifiedFromDoc);
        } else {
          setDbVerified(false);
        }
      } catch (e) {
        console.error('RecipientCheckWrapper -> erro no getDoc /users:', e);
        setDbVerified(false);
      }
    })();

    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data: any = snap.data();
        const verifiedFromDoc = data?.verified === true || data?.recipient?.verified === true;
        console.log('RecipientCheckWrapper -> onSnapshot /users verified:', data?.verified, 'recipient.verified:', data?.recipient?.verified, 'computed:', verifiedFromDoc);
        setDbVerified(verifiedFromDoc);
      } else {
        setDbVerified(false);
      }
    }, (e) => {
      console.error('RecipientCheckWrapper -> erro ao assinar /users doc:', e);
      setDbVerified(false);
    });

    return () => unsubscribe();
  }, [userProfile?.uid]);

  // Controlar exibição do modal apenas via prop externa
  useEffect(() => {
    setShowModal(showRecipientModal);
  }, [showRecipientModal]);

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const success = await createRecipient(data);
      if (success) {
        console.log('RecipientCheckWrapper -> recipient criado com sucesso. Fechando modal.');
        setShowModal(false);
        toast({
          title: "Sucesso!",
          description: "Configuração de recebimento concluída com sucesso.",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao configurar recebimento. Tente novamente.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Erro",
        description: "Erro ao configurar recebimento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    if (onCloseRecipientModal) {
      onCloseRecipientModal();
    }
  };

  // Renderiza sempre o conteúdo; o modal abre/fecha conforme estado
  return (
    <>
      {children}
      <RecipientSetupModal
        isOpen={showModal}
        onClose={handleClose}
        onSubmit={handleSubmit}
        loading={isSubmitting}
      />
    </>
  );
};

export default RecipientCheckWrapper;