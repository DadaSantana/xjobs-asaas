/**
 * Utilitário para traduzir erros do Firebase Auth para português
 */

export const translateFirebaseError = (error: any): string => {
  const errorCode = error.code || error.message;
  
  switch (errorCode) {
    // Erros de credenciais
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email ou senha incorretos. Verifique suas credenciais e tente novamente.';
    
    // Erros de email
    case 'auth/invalid-email':
      return 'Email inválido. Verifique o formato do seu email.';
    case 'auth/email-already-in-use':
      return 'Este email já está sendo usado por outra conta.';
    
    // Erros de senha
    case 'auth/weak-password':
      return 'A senha é muito fraca. Use pelo menos 6 caracteres.';
    
    // Erros de conta
    case 'auth/user-disabled':
      return 'Esta conta foi desabilitada. Entre em contato com o suporte.';
    case 'auth/account-exists-with-different-credential':
      return 'Já existe uma conta com este email usando outro método de login.';
    
    // Erros de rede e limite
    case 'auth/too-many-requests':
      return 'Muitas tentativas de login. Tente novamente em alguns minutos.';
    case 'auth/network-request-failed':
      return 'Erro de conexão. Verifique sua internet e tente novamente.';
    
    // Erros de operação
    case 'auth/operation-not-allowed':
      return 'Operação não permitida. Entre em contato com o suporte.';
    case 'auth/operation-not-supported-in-this-environment':
      return 'Esta operação não é suportada neste ambiente.';
    
    // Erros de token
    case 'auth/invalid-verification-code':
      return 'Código de verificação inválido.';
    case 'auth/invalid-verification-id':
      return 'ID de verificação inválido.';
    case 'auth/code-expired':
      return 'Código de verificação expirado. Solicite um novo código.';
    
    // Erros de popup
    case 'auth/popup-closed-by-user':
      return 'Login cancelado. Tente novamente.';
    case 'auth/popup-blocked':
      return 'Popup bloqueado pelo navegador. Permita popups para este site.';
    
    // Erros de domínio
    case 'auth/unauthorized-domain':
      return 'Domínio não autorizado para esta operação.';
    
    // Erro padrão
    default:
      return 'Erro inesperado. Tente novamente ou entre em contato com o suporte.';
  }
};

/**
 * Traduz erros específicos de registro
 */
export const translateFirebaseRegisterError = (error: any): string => {
  const errorCode = error.code || error.message;
  
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'Este email já está sendo usado. Tente fazer login ou use outro email.';
    case 'auth/weak-password':
      return 'A senha deve ter pelo menos 6 caracteres.';
    case 'auth/invalid-email':
      return 'Email inválido. Verifique o formato do seu email.';
    default:
      return translateFirebaseError(error);
  }
};

/**
 * Traduz erros específicos de reset de senha
 */
export const translateFirebasePasswordResetError = (error: any): string => {
  const errorCode = error.code || error.message;
  
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'Nenhuma conta encontrada com este email.';
    case 'auth/invalid-email':
      return 'Email inválido. Verifique o formato do seu email.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas de reset de senha. Tente novamente em alguns minutos.';
    default:
      return translateFirebaseError(error);
  }
};
