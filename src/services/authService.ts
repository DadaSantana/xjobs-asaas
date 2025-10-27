import { 
  getAuth, 
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  verifyBeforeUpdateEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, googleProvider, functions } from '@/lib/firebase';
import { UserProfile, RegisterFormData, UserRole } from '@/types/user';
import { NotificationService } from './notificationService';

export class AuthService {
  private static auth = getAuth();

  static async registerUser(formData: RegisterFormData): Promise<UserProfile> {
    try {
      console.log('Iniciando registro:', formData.email);
      
      // Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        this.auth, 
        formData.email, 
        formData.password
      );
      
      console.log('Usuário criado no Auth:', userCredential.user.uid);
      
      // Determinar role baseado nos dados do formulário
      let role: UserRole;
      if ('role' in formData && (formData.role === 'manager' || formData.role === 'moderator')) {
        // Usuário administrativo
        role = formData.role;
      } else {
        // Usuário normal (cliente ou freelancer)
        role = formData.skills ? 'freelancer' : 'client';
      }
      
      // Criar perfil do usuário no Firestore
      const now = Timestamp.now();
      const userProfile: UserProfile = {
        uid: userCredential.user.uid,
        email: formData.email,
        name: formData.name,
        role,
        createdAt: now,
        lastLogin: now,
        rating: 0,
        ratingCount: 0,
        totalRating: 0,
        isOnline: true,
        lastSeen: now,
        updatedAt: now,
      };

      // Só adicionar skills se for freelancer e existir
      if (role === 'freelancer' && formData.skills && formData.skills.length > 0) {
        userProfile.skills = formData.skills;
      }

      // Salvar no Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), userProfile);
      console.log('Perfil salvo no Firestore');

      // Registrar log de cadastro na coleção logs
      try {
        await setDoc(doc(db, 'logs', userCredential.user.uid + '_' + now.seconds), {
          userId: userCredential.user.uid,
          name: formData.name,
          email: formData.email,
          type: 'user_registered',
          title: 'Usuário registrado',
          message: `Novo usuário registrado: ${formData.name} (${formData.email})`,
          timestamp: now,
          createdAt: now
        });
        console.log('Log de cadastro salvo na coleção logs');
      } catch (logError) {
        console.error('Erro ao registrar log de cadastro:', logError);
      }

      // Criar notificação de boas-vindas
      try {
        await NotificationService.createNotification({
          userId: userCredential.user.uid,
          type: 'user_registered',
          title: 'Bem-vindo ao Xjobs!',
          message: `Olá ${formData.name}, sua conta foi criada com sucesso. Explore nossa plataforma e encontre as melhores oportunidades.`,
          actionUrl: role === 'freelancer' ? '/freelancer/dashboard' : '/cliente/dashboard',
          actionLabel: 'Acessar Dashboard'
        });
        console.log('Notificação de boas-vindas criada');
      } catch (notificationError) {
        console.error('Erro ao criar notificação de boas-vindas:', notificationError);
        // Não falhar o registro se a notificação falhar
      }

      // Enviar e-mail de boas-vindas
      try {
        await EmailService.sendWelcomeEmail(formData.email, formData.name);
        console.log('E-mail de boas-vindas enviado');
      } catch (emailError) {
        console.error('Erro ao enviar e-mail de boas-vindas:', emailError);
        // Não falhar o registro se o e-mail falhar
      }

      return userProfile;
    } catch (error) {
      console.error('Erro no registro:', error);
      throw error;
    }
  }

  static async loginUser(email: string, password: string): Promise<UserProfile> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      
      // Buscar perfil do usuário
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (!userDoc.exists()) {
        throw new Error('Perfil do usuário não encontrado');
      }

      const userProfile = userDoc.data() as UserProfile;
      
      // Atualizar último login
      const updatedProfile = {
        ...userProfile,
        lastLogin: Timestamp.now(),
        isOnline: true,
        lastSeen: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), updatedProfile);

      return updatedProfile;
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  }

  static async loginWithGoogle(): Promise<UserProfile> {
    try {
      const result = await signInWithPopup(this.auth, googleProvider);
      const user = result.user;
      
      // Verificar se o usuário já existe no Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        // Usuário já existe, atualizar último login
        const userProfile = userDoc.data() as UserProfile;
        const updatedProfile = {
          ...userProfile,
          lastLogin: Timestamp.now(),
          isOnline: true,
          lastSeen: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        
        await setDoc(doc(db, 'users', user.uid), updatedProfile);
        return updatedProfile;
      } else {
        // Novo usuário, criar perfil temporário sem role definido
        const now = Timestamp.now();
        const userProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          name: user.displayName || 'Usuário Google',
          role: 'client', // Temporário - será atualizado na seleção
          createdAt: now,
          lastLogin: now,
          rating: 0,
          ratingCount: 0,
          totalRating: 0,
          isOnline: true,
          lastSeen: now,
          updatedAt: now,
          needsRoleSelection: true, // Flag para indicar que precisa selecionar role
        };
        
        await setDoc(doc(db, 'users', user.uid), userProfile);
        
        // Enviar e-mail de boas-vindas
        try {
          await EmailService.sendWelcomeEmail(userProfile.email, userProfile.name);
        } catch (emailError) {
          console.error('Erro ao enviar e-mail de boas-vindas:', emailError);
        }
        
        return userProfile;
      }
    } catch (error) {
      console.error('Erro no login com Google:', error);
      throw error;
    }
  }

  // Método específico para login de usuários administrativos
  static async loginManager(email: string, password: string): Promise<UserProfile> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      
      // Buscar perfil do usuário
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (!userDoc.exists()) {
        throw new Error('Perfil do usuário não encontrado');
      }

      const userProfile = userDoc.data() as UserProfile;
      
      // Verificar se é um usuário administrativo
      if (userProfile.role !== 'manager' && userProfile.role !== 'moderator') {
        await signOut(this.auth); // Fazer logout imediatamente
        throw new Error('Acesso negado. Você não tem permissão para acessar esta área.');
      }
      
      // Atualizar último login
      const updatedProfile = {
        ...userProfile,
        lastLogin: Timestamp.now(),
        isOnline: true,
        lastSeen: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), updatedProfile);

      return updatedProfile;
    } catch (error) {
      console.error('Erro no login administrativo:', error);
      throw error;
    }
  }

  static async logoutUser(): Promise<void> {
    try {
      const user = this.auth.currentUser;
      if (user) {
        // Marcar como offline antes de deslogar
        await setDoc(doc(db, 'users', user.uid), {
          isOnline: false,
          lastSeen: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
      
      await signOut(this.auth);
    } catch (error) {
      console.error('Erro no logout:', error);
      throw error;
    }
  }

  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      return userDoc.exists() ? userDoc.data() as UserProfile : null;
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      return null;
    }
  }

  // Método para atualizar o role do usuário após seleção no Google login
  static async updateUserRole(uid: string, role: UserRole): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        role,
        needsRoleSelection: false,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Erro ao atualizar role do usuário:', error);
      throw new Error('Falha ao atualizar role do usuário');
    }
  }

  // Recuperação de senha
  static async resetPassword(email: string): Promise<void> {
    try {
      // Configurar o link de redirecionamento após reset de senha
      const actionCodeSettings = {
        url: window.location.origin + '/reset-password',
        handleCodeInApp: true
      };

      // Enviar e-mail de recuperação via Firebase Auth (método nativo)
      await sendPasswordResetEmail(this.auth, email, actionCodeSettings);
    } catch (error) {
      console.error('Erro ao enviar e-mail de recuperação:', error);
      throw error;
    }
  }

  // Notificar sobre alteração de senha (chamado após reset bem-sucedido)
  static async notifyPasswordChanged(userId: string): Promise<void> {
    try {
      await NotificationService.createNotification({
        userId,
        type: 'account_updated',
        title: 'Senha alterada',
        message: 'Sua senha foi alterada com sucesso. Se você não fez esta alteração, entre em contato conosco imediatamente.',
        actionUrl: '/minha-conta/seguranca',
        actionLabel: 'Ver configurações'
      });
      // Criar log para o gestor
      try {
        await setDoc(doc(db, 'logs', userId + '_password_' + Timestamp.now().seconds), {
          userId,
          type: 'password_changed',
          createdAt: Timestamp.now()
        });
      } catch (logError) {
        console.error('Erro ao registrar log de alteração de senha:', logError);
      }
    } catch (error) {
      console.error('Erro ao criar notificação de alteração de senha:', error);
      // Não falhar se a notificação falhar
    }
  }

  // Verificar se usuário existe
  static async userExists(email: string): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(db, 'users', email));
      return userDoc.exists();
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
      throw error;
    }
  }

  // Método específico para criar membros da equipe administrativa
  static async createTeamMember(memberData: {
    name: string;
    email: string;
    password: string;
    role: 'manager' | 'moderator';
  }): Promise<UserProfile> {
    try {
      console.log('Criando membro da equipe:', memberData.email);
      
      // Usar o método registerUser com os dados do membro
      const formData = {
        ...memberData,
        confirmPassword: memberData.password,
        role: memberData.role
      };
      
      return await this.registerUser(formData as any);
    } catch (error) {
      console.error('Erro ao criar membro da equipe:', error);
      throw error;
    }
  }

  // Atualizar email do usuário com verificação
  static async updateUserEmail(newEmail: string, currentPassword?: string): Promise<void> {
    try {
      console.log('AuthService.updateUserEmail iniciado', { newEmail, hasPassword: !!currentPassword });
      
      const user = this.auth.currentUser;
      if (!user || !user.email) {
        console.error('Usuário não autenticado');
        throw new Error('Usuário não autenticado');
      }

      console.log('Usuário atual:', { uid: user.uid, email: user.email });

      // Reautenticação obrigatória
      if (user.providerData.some((p) => p.providerId === 'password')) {
        if (!currentPassword) {
          console.error('Senha necessária para reautenticação');
          const err: any = new Error('Senha necessária para reautenticação');
          err.code = 'auth/requires-recent-login';
          throw err;
        }
        console.log('Reautenticando com senha...');
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        console.log('Reautenticação com senha bem-sucedida');
      } else {
        console.error('Provedor não suportado para reautenticação automática');
        const err: any = new Error('Reautenticação necessária');
        err.code = 'auth/requires-recent-login';
        throw err;
      }

      // Atualizar diretamente via Cloud Function (Admin SDK) sem exigir verificação
      console.log('Chamando Cloud Function forceUpdateUserEmail...');
      const forceUpdate = httpsCallable(functions, 'forceUpdateUserEmail');
      await forceUpdate({ newEmail });
      console.log('Cloud Function forceUpdateUserEmail concluída');

    } catch (error) {
      console.error('Erro ao atualizar email:', error);
      throw error;
    }
  }

  // Método para verificar se email foi alterado e atualizar Firestore
  static async syncEmailWithFirestore(): Promise<void> {
    try {
      const user = this.auth.currentUser;
      if (!user) return;

      // Verificar se o email no Auth é diferente do Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        if (userData.email !== user.email) {
          console.log('Sincronizando email do Auth com Firestore...');
          await updateDoc(doc(db, 'users', user.uid), {
            email: user.email,
            updatedAt: Timestamp.now()
          });
          console.log('Email sincronizado com sucesso');
        }
      }
    } catch (error) {
      console.error('Erro ao sincronizar email:', error);
    }
  }
}
