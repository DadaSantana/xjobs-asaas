import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { ProjectAttachment } from '@/types/project';
import { Timestamp } from 'firebase/firestore';

export class FileUploadService {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_TYPES = [
    // Imagens
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    // Documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed'
  ];

  static validateFile(file: File): { isValid: boolean; error?: string } {
    // Verificar tamanho
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `Arquivo muito grande. Tamanho máximo: 10MB. Tamanho atual: ${(file.size / 1024 / 1024).toFixed(2)}MB`
      };
    }

    // Verificar tipo
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: `Tipo de arquivo não permitido: ${file.type}. Tipos aceitos: imagens (JPG, PNG, GIF, WebP) e documentos (PDF, Word, Excel, PowerPoint, TXT, ZIP, RAR)`
      };
    }

    return { isValid: true };
  }

  static async uploadProjectFile(
    projectId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ProjectAttachment> {
    const validation = this.validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    try {
      // Gerar nome único para o arquivo
      const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fileName = `${fileId}_${file.name}`;
      const filePath = `projects/${projectId}/attachments/${fileName}`;

      // Criar referência no Storage
      const storageRef = ref(storage, filePath);

      // Upload do arquivo
      const uploadTask = await uploadBytes(storageRef, file);
      
      // Obter URL de download
      const downloadURL = await getDownloadURL(uploadTask.ref);

      // Retornar dados do anexo
      const attachment: ProjectAttachment = {
        id: fileId,
        name: file.name,
        url: downloadURL,
        size: file.size,
        type: file.type,
        uploadedAt: Timestamp.now()
      };

      return attachment;
    } catch (error) {
      console.error('Erro ao fazer upload do arquivo:', error);
      throw new Error('Erro ao fazer upload do arquivo. Tente novamente.');
    }
  }

  static async deleteProjectFile(projectId: string, attachmentId: string, fileName: string): Promise<void> {
    try {
      const filePath = `projects/${projectId}/attachments/${attachmentId}_${fileName}`;
      const storageRef = ref(storage, filePath);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error);
      throw new Error('Erro ao deletar arquivo.');
    }
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static getFileIcon(fileType: string): string {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType === 'application/pdf') return '📄';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('excel') || fileType.includes('sheet')) return '📊';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📽️';
    if (fileType === 'text/plain') return '📄';
    if (fileType.includes('zip') || fileType.includes('rar')) return '🗜️';
    return '📎';
  }
} 