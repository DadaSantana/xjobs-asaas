import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { useAppDispatch } from './redux';
import { setUser, setUserProfile, setLoading } from '../store/authSlice';
import { usePresence } from './usePresence';
import { AuthService } from '../services/authService';
import { UserProfile, SerializedUserProfile } from '../types/user';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';

// Função helper para converter Timestamps para strings ISO - VERSÃO SIMPLIFICADA
const convertTimestampsToISO = (userProfile: UserProfile): SerializedUserProfile => {
  // Converter apenas os campos essenciais do recipient para evitar objetos profundos
  let serializedRecipient = undefined as SerializedUserProfile['recipient'] | undefined;
  const r: any = (userProfile as any).recipient;
  if (r) {
    serializedRecipient = {
      id: r.id,
      name: r.name,
      email: r.email,
      code: r.code,
      document: r.document,
      type: r.type,
      payment_mode: r.payment_mode,
      status: r.status,
      verified: r.verified,
      created_at: r.created_at?.toDate ? r.created_at.toDate().toISOString() : (typeof r.created_at === 'string' ? r.created_at : new Date().toISOString()),
      updated_at: r.updated_at?.toDate ? r.updated_at.toDate().toISOString() : (typeof r.updated_at === 'string' ? r.updated_at : new Date().toISOString()),
      transfer_settings: r.transfer_settings ?? null,
      default_bank_account: r.default_bank_account ?? null,
      gateway_recipients: Array.isArray(r.gateway_recipients) ? r.gateway_recipients : [],
      automatic_anticipation_settings: r.automatic_anticipation_settings ?? null,
      metadata: r.metadata ?? null,
      register_information: r.register_information ?? null,
    };
  }

  // Converter bankAccount se existir
  let serializedBankAccount = undefined as SerializedUserProfile['bankAccount'] | undefined;
  const ba: any = (userProfile as any).bankAccount;
  if (ba) {
    serializedBankAccount = {
      bank: ba.bank,
      bankName: ba.bankName,
      agency: ba.agency,
      account: ba.account,
      accountDigit: ba.accountDigit,
      accountType: ba.accountType,
      holderName: ba.holderName,
      holderDocument: ba.holderDocument,
      verified: ba.verified,
      createdAt: ba.createdAt?.toDate ? ba.createdAt.toDate().toISOString() : (typeof ba.createdAt === 'string' ? ba.createdAt : new Date().toISOString()),
      updatedAt: ba.updatedAt?.toDate ? ba.updatedAt.toDate().toISOString() : (typeof ba.updatedAt === 'string' ? ba.updatedAt : new Date().toISOString()),
    };
  }

  // Converter apenas os campos essenciais do userProfile
  const serialized = {
    uid: userProfile.uid,
    email: userProfile.email,
    name: userProfile.name,
    role: userProfile.role,
    skills: userProfile.skills,
    rating: userProfile.rating,
    ratingCount: userProfile.ratingCount,
    totalRating: userProfile.totalRating,
    isOnline: userProfile.isOnline,
    verified: (userProfile as any).verified,
    createdAt: userProfile.createdAt?.toDate ? userProfile.createdAt.toDate().toISOString() : (typeof userProfile.createdAt === 'string' ? userProfile.createdAt : new Date().toISOString()),
    lastLogin: userProfile.lastLogin?.toDate ? userProfile.lastLogin.toDate().toISOString() : (typeof userProfile.lastLogin === 'string' ? userProfile.lastLogin : new Date().toISOString()),
    lastSeen: userProfile.lastSeen?.toDate ? userProfile.lastSeen.toDate().toISOString() : (typeof userProfile.lastSeen === 'string' ? userProfile.lastSeen : new Date().toISOString()),
    updatedAt: userProfile.updatedAt?.toDate ? userProfile.updatedAt.toDate().toISOString() : (typeof userProfile.updatedAt === 'string' ? userProfile.updatedAt : new Date().toISOString()),
    planExpiresAt: (userProfile as any).planExpiresAt?.toDate ? (userProfile as any).planExpiresAt.toDate().toISOString() : ((userProfile as any).planExpiresAt || undefined),
    recipient: serializedRecipient,
    bankAccount: serializedBankAccount,
  } as SerializedUserProfile;

  return serialized;
};

export const useAuthListener = () => {
  const dispatch = useAppDispatch();

  console.log('useAuthListener -> hook iniciado');

  useEffect(() => {
    console.log('useAuthListener -> useEffect executado');
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user?.uid);
      dispatch(setUser(user));

      // Limpar listener anterior se existir
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }
      
      if (user) {
        try {
          console.log('useAuth -> iniciando onSnapshot para usuário:', user.uid);
          
          // TESTE DIRETO: tentar getDoc primeiro
          try {
            console.log('useAuth -> TESTE: tentando getDoc direto');
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            console.log('useAuth -> TESTE: getDoc resultado - exists:', userSnap.exists());
            if (userSnap.exists()) {
              const testProfile = { uid: userSnap.id, ...userSnap.data() } as UserProfile;
              console.log('useAuth -> TESTE: getDoc userProfile:', testProfile);
              const serializedTest = convertTimestampsToISO(testProfile);
              console.log('useAuth -> TESTE: getDoc serializado:', serializedTest);
              dispatch(setUserProfile(serializedTest));
            } else {
              console.log('useAuth -> TESTE: getDoc - documento não existe');
            }
          } catch (testError) {
            console.error('useAuth -> TESTE: erro no getDoc:', testError);
          }
          
          // Assinar doc do usuário em tempo real
          const userRef = doc(db, 'users', user.uid);
          unsubscribeProfile = onSnapshot(userRef, (snap) => {
            console.log('useAuth -> onSnapshot chamado, exists:', snap.exists());
            if (snap.exists()) {
              const liveProfile = { uid: snap.id, ...snap.data() } as UserProfile;
              console.log('useAuth -> onSnapshot userProfile bruto:', liveProfile);
              const serializedProfile = convertTimestampsToISO(liveProfile);
              console.log('useAuth -> onSnapshot userProfile serializado:', serializedProfile);
              dispatch(setUserProfile(serializedProfile));
            } else {
              console.log('useAuth -> onSnapshot: documento não existe');
              dispatch(setUserProfile(null));
            }
          }, (err) => {
            console.error('Erro no onSnapshot do perfil:', err);
          });

          // Fallback: carregar uma vez enquanto o snapshot não chega
          try {
            console.log('useAuth -> tentando fallback com getUserProfile');
            const once = await AuthService.getUserProfile(user.uid);
            if (once) {
              console.log('useAuth -> fallback getUserProfile sucesso:', once);
              const serializedOnce = convertTimestampsToISO(once);
              dispatch(setUserProfile(serializedOnce));
            } else {
              console.log('useAuth -> fallback getUserProfile retornou null');
            }
          } catch (fallbackError) {
            console.error('useAuth -> erro no fallback getUserProfile:', fallbackError);
          }

          // Sincronizar email se necessário (para capturar alterações verificadas)
          try {
            await AuthService.syncEmailWithFirestore();
          } catch (syncError) {
            console.error('Erro ao sincronizar email:', syncError);
          }

        } catch (error) {
          console.error('Erro ao carregar perfil do usuário:', error);
          dispatch(setUserProfile(null));
        }
      } else {
        dispatch(setUserProfile(null));
      }
      
      dispatch(setLoading(false));
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, [dispatch]);

  return null;
};

export const useAuth = () => {
  const dispatch = useAppDispatch();
  usePresence();
  
  useEffect(() => {
    dispatch(setLoading(true));
  }, [dispatch]);

  return null;
};