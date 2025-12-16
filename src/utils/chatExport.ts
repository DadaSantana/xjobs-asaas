import jsPDF from 'jspdf';
import { Chat, ChatMessage } from '@/types/chat';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Exporta uma conversa para formato TXT
 */
export const exportChatToTxt = (chat: Chat, messages: ChatMessage[]): void => {
  let content = '='.repeat(80) + '\n';
  content += 'EXPORTAÇÃO DE CONVERSA\n';
  content += '='.repeat(80) + '\n\n';
  
  // Informações do chat
  content += 'INFORMAÇÕES DO CHAT\n';
  content += '-'.repeat(80) + '\n';
  content += `ID do Chat: ${chat.id}\n`;
  content += `Projeto: ${chat.projectTitle}\n`;
  content += `Cliente: ${chat.clientName} (ID: ${chat.clientId})\n`;
  content += `Freelancer: ${chat.freelancerName} (ID: ${chat.freelancerId})\n`;
  const createdAt = chat.createdAt?.toDate ? chat.createdAt.toDate() : new Date(chat.createdAt);
  content += `Criado em: ${createdAt.toLocaleString('pt-BR')}\n`;
  if (chat.lastMessageAt) {
    const lastMessageDate = chat.lastMessageAt?.toDate ? chat.lastMessageAt.toDate() : new Date(chat.lastMessageAt);
    content += `Última mensagem: ${lastMessageDate.toLocaleString('pt-BR')}\n`;
  }
  content += `Status: ${chat.isActive ? 'Ativo' : 'Inativo'}\n`;
  if (chat.isDisputed) {
    content += `Disputa: Sim\n`;
    if (chat.disputeReason) {
      content += `Motivo da disputa: ${chat.disputeReason}\n`;
    }
  }
  if (chat.blockedUsers && chat.blockedUsers.length > 0) {
    content += `Usuários bloqueados: ${chat.blockedUsers.join(', ')}\n`;
  }
  content += '\n';
  
  // Mensagens
  content += 'MENSAGENS\n';
  content += '-'.repeat(80) + '\n';
  content += `Total de mensagens: ${messages.length}\n\n`;
  
  messages.forEach((message, index) => {
    const timestamp = message.timestamp?.toDate 
      ? message.timestamp.toDate() 
      : (message.timestamp ? new Date(message.timestamp) : new Date());
    const formattedDate = format(timestamp, "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR });
    
    content += `[${index + 1}] ${formattedDate}\n`;
    content += `De: ${message.senderName} (${message.senderType})\n`;
    
    if (message.type === 'file' && message.fileName) {
      content += `Tipo: Arquivo\n`;
      content += `Nome do arquivo: ${message.fileName}\n`;
      if (message.fileUrl) {
        content += `URL: ${message.fileUrl}\n`;
      }
      if (message.fileSize) {
        content += `Tamanho: ${(message.fileSize / 1024).toFixed(2)} KB\n`;
      }
    } else if (message.type === 'image') {
      content += `Tipo: Imagem\n`;
      if (message.fileUrl) {
        content += `URL: ${message.fileUrl}\n`;
      }
    }
    
    content += `Mensagem:\n${message.content}\n`;
    
    if (message.isEdited) {
      content += `(Mensagem editada)\n`;
    }
    
    content += '\n' + '-'.repeat(80) + '\n\n';
  });
  
  content += '='.repeat(80) + '\n';
  content += `Exportado em: ${new Date().toLocaleString('pt-BR')}\n`;
  content += '='.repeat(80) + '\n';
  
  // Criar e baixar arquivo
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `conversa_${chat.id}_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Exporta uma conversa para formato PDF
 */
export const exportChatToPdf = async (chat: Chat, messages: ChatMessage[]): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - (margin * 2);
  let yPosition = margin;
  const lineHeight = 7;
  const spacing = 3;

  // Função auxiliar para adicionar nova página se necessário
  const checkNewPage = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
  };

  // Cabeçalho
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('EXPORTAÇÃO DE CONVERSA', margin, yPosition);
  yPosition += lineHeight + spacing;

  // Linha divisória
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += spacing * 2;

  // Informações do chat
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMAÇÕES DO CHAT', margin, yPosition);
  yPosition += lineHeight;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const chatInfo = [
    `ID do Chat: ${chat.id}`,
    `Projeto: ${chat.projectTitle}`,
    `Cliente: ${chat.clientName} (ID: ${chat.clientId})`,
    `Freelancer: ${chat.freelancerName} (ID: ${chat.freelancerId})`,
    `Criado em: ${(chat.createdAt?.toDate ? chat.createdAt.toDate() : new Date(chat.createdAt)).toLocaleString('pt-BR')}`,
  ];

  if (chat.lastMessageAt) {
    const lastMessageDate = chat.lastMessageAt?.toDate ? chat.lastMessageAt.toDate() : new Date(chat.lastMessageAt);
    chatInfo.push(`Última mensagem: ${lastMessageDate.toLocaleString('pt-BR')}`);
  }

  chatInfo.push(`Status: ${chat.isActive ? 'Ativo' : 'Inativo'}`);

  if (chat.isDisputed) {
    chatInfo.push(`Disputa: Sim`);
    if (chat.disputeReason) {
      chatInfo.push(`Motivo da disputa: ${chat.disputeReason}`);
    }
  }

  if (chat.blockedUsers && chat.blockedUsers.length > 0) {
    chatInfo.push(`Usuários bloqueados: ${chat.blockedUsers.join(', ')}`);
  }

  chatInfo.forEach((info) => {
    checkNewPage(lineHeight);
    const lines = doc.splitTextToSize(info, maxWidth);
    lines.forEach((line: string) => {
      checkNewPage(lineHeight);
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    });
    yPosition += spacing;
  });

  yPosition += spacing * 2;

  // Mensagens
  checkNewPage(lineHeight * 2);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('MENSAGENS', margin, yPosition);
  yPosition += lineHeight;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total de mensagens: ${messages.length}`, margin, yPosition);
  yPosition += lineHeight + spacing * 2;

  messages.forEach((message, index) => {
    checkNewPage(lineHeight * 5);
    
    // Número e data da mensagem
    doc.setFont('helvetica', 'bold');
    const timestamp = message.timestamp?.toDate 
      ? message.timestamp.toDate() 
      : (message.timestamp ? new Date(message.timestamp) : new Date());
    const formattedDate = format(timestamp, "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR });
    doc.text(`[${index + 1}] ${formattedDate}`, margin, yPosition);
    yPosition += lineHeight;

    // Remetente
    doc.setFont('helvetica', 'normal');
    const senderText = `De: ${message.senderName} (${message.senderType})`;
    const senderLines = doc.splitTextToSize(senderText, maxWidth);
    senderLines.forEach((line: string) => {
      checkNewPage(lineHeight);
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    });

    // Informações de arquivo/imagem se aplicável
    if (message.type === 'file' && message.fileName) {
      checkNewPage(lineHeight * 3);
      doc.setFont('helvetica', 'italic');
      doc.text(`Tipo: Arquivo - ${message.fileName}`, margin, yPosition);
      yPosition += lineHeight;
      if (message.fileSize) {
        doc.text(`Tamanho: ${(message.fileSize / 1024).toFixed(2)} KB`, margin, yPosition);
        yPosition += lineHeight;
      }
      doc.setFont('helvetica', 'normal');
    } else if (message.type === 'image') {
      checkNewPage(lineHeight);
      doc.setFont('helvetica', 'italic');
      doc.text('Tipo: Imagem', margin, yPosition);
      yPosition += lineHeight;
      doc.setFont('helvetica', 'normal');
    }

    // Conteúdo da mensagem
    checkNewPage(lineHeight * 3);
    const contentLines = doc.splitTextToSize(message.content || '(sem conteúdo)', maxWidth);
    contentLines.forEach((line: string) => {
      checkNewPage(lineHeight);
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    });

    if (message.isEdited) {
      checkNewPage(lineHeight);
      doc.setFont('helvetica', 'italic');
      doc.text('(Mensagem editada)', margin, yPosition);
      yPosition += lineHeight;
      doc.setFont('helvetica', 'normal');
    }

    yPosition += spacing * 2;
    
    // Linha divisória entre mensagens
    if (index < messages.length - 1) {
      checkNewPage(lineHeight);
      doc.setLineWidth(0.2);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += spacing * 2;
    }
  });

  // Rodapé
  yPosition = pageHeight - margin - lineHeight;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(
    `Exportado em: ${new Date().toLocaleString('pt-BR')}`,
    margin,
    yPosition
  );

  // Salvar PDF
  const fileName = `conversa_${chat.id}_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.pdf`;
  doc.save(fileName);
};
