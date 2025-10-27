import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { emailTemplates } from '@/templates/emailTemplate';

export class EmailService {
  // Enviar e-mail de recuperação de senha
  static async sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
    try {
      await addDoc(collection(db, 'mail'), {
        to: email,
        message: {
          subject: 'Recuperação de Senha - Xjobs',
          html: emailTemplates.passwordReset(resetLink)
        },
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao enviar e-mail de recuperação:', error);
      throw error;
    }
  }

  // Enviar e-mail de boas-vindas
  static async sendWelcomeEmail(email: string, userName: string): Promise<void> {
    try {
      await addDoc(collection(db, 'mail'), {
        to: email,
        message: {
          subject: 'Bem-vindo à Xjobs!',
          html: emailTemplates.welcome(userName)
        },
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao enviar e-mail de boas-vindas:', error);
      throw error;
    }
  }

  // Enviar e-mail de proposta recebida
  static async sendProposalReceivedEmail(
    clientEmail: string, 
    clientName: string, 
    projectName: string, 
    freelancerName: string, 
    proposedBudget: number
  ): Promise<void> {
    try {
      await addDoc(collection(db, 'mail'), {
        to: clientEmail,
        message: {
          subject: `Nova Proposta Recebida - ${projectName}`,
          html: emailTemplates.proposalReceived(clientName, projectName, freelancerName, proposedBudget)
        },
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao enviar e-mail de proposta recebida:', error);
      throw error;
    }
  }

  // Enviar e-mail de proposta aceita
  static async sendProposalAcceptedEmail(
    freelancerEmail: string,
    freelancerName: string,
    projectName: string,
    proposedBudget: number
  ): Promise<void> {
    try {
      await addDoc(collection(db, 'mail'), {
        to: freelancerEmail,
        message: {
          subject: `Proposta Aceita! - ${projectName}`,
          html: emailTemplates.proposalAccepted(freelancerName, projectName, proposedBudget)
        },
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao enviar e-mail de proposta aceita:', error);
      throw error;
    }
  }

  // Enviar e-mail de garantia depositada
  static async sendEscrowDepositedEmail(
    freelancerEmail: string,
    freelancerName: string,
    projectName: string,
    projectValue: number,
    clientName: string
  ): Promise<void> {
    try {
      await addDoc(collection(db, 'mail'), {
        to: freelancerEmail,
        message: {
          subject: `Garantia Confirmada - Inicie o Projeto ${projectName}!`,
          html: emailTemplates.escrowDeposited(freelancerName, projectName, projectValue, clientName)
        },
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao enviar e-mail de garantia depositada:', error);
      throw error;
    }
  }

  // Enviar e-mail de atualização de status do projeto
  static async sendProjectStatusEmail(email: string, projectName: string, status: string, userName: string): Promise<void> {
    try {
      await addDoc(collection(db, 'mail'), {
        to: email,
        message: {
          subject: `Atualização de Projeto - ${projectName}`,
          html: emailTemplates.projectStatus(projectName, status, userName)
        },
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao enviar e-mail de atualização de projeto:', error);
      throw error;
    }
  }

  // Enviar mensagem de suporte
  static async sendSupportMessage(userName: string, userEmail: string, subject: string, message: string): Promise<void> {
    try {
      // E-mail para a equipe de suporte
      await addDoc(collection(db, 'mail'), {
        to: 'suporte@xjobs.com.br', // Substitua pelo e-mail real da equipe de suporte
        message: {
          subject: `[SUPORTE] ${subject}`,
          html: emailTemplates.supportMessage(userName, userEmail, subject, message)
        },
        createdAt: serverTimestamp()
      });

      // Log da solicitação no Firestore para o gestor
      await addDoc(collection(db, 'logs'), {
        type: 'support_request',
        action: 'support_message_sent',
        title: `Nova solicitação de suporte de ${userName}`,
        description: `${userName} (${userEmail}) enviou uma solicitação de suporte com o assunto: "${subject}"
Mensagem: ${message}`,
        metadata: {
          type: 'support_request',
          userName,
          userEmail,
          subject,
          message,
          status: 'pending',
          requestDate: new Date().toLocaleDateString('pt-BR'),
          requestTime: new Date().toLocaleTimeString('pt-BR')
        },
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem de suporte:', error);
      throw error;
    }
  }

  // Enviar confirmação de suporte ao usuário
  static async sendSupportConfirmation(userEmail: string, userName: string, subject: string, message: string): Promise<void> {
    try {
      // E-mail de confirmação para o usuário
      await addDoc(collection(db, 'mail'), {
        to: userEmail,
        message: {
          subject: `Confirmação de Suporte - ${subject}`,
          html: emailTemplates.supportConfirmation(userName, subject, message)
        },
        createdAt: serverTimestamp()
      });

      // Não criamos log aqui para evitar duplicação - o log é criado no sendSupportMessage
    } catch (error) {
      console.error('Erro ao enviar confirmação de suporte:', error);
      throw error;
    }
  }

  // Enviar resposta de suporte
  static async sendSupportResponse(userEmail: string, userName: string, originalSubject: string, response: string): Promise<void> {
    try {
      await addDoc(collection(db, 'mail'), {
        to: userEmail,
        message: {
          subject: `Re: ${originalSubject}`,
          html: emailTemplates.supportResponse(userName, originalSubject, response)
        }
      });
    } catch (error) {
      console.error('Erro ao enviar resposta de suporte:', error);
      throw error;
    }
  }
}