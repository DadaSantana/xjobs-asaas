import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Upload, File, Download } from 'lucide-react';
import { FileUploadService } from '@/services/fileUploadService';
import { ProjectAttachment } from '@/types/project';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  attachments: ProjectAttachment[];
  onAttachmentsChange: (attachments: ProjectAttachment[]) => void;
  projectId?: string;
  maxFiles?: number;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  attachments,
  onAttachmentsChange,
  projectId = 'temp',
  maxFiles = 5,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (files: FileList) => {
    if (disabled) return;

    const fileArray = Array.from(files);
    
    // Verificar limite de arquivos
    if (attachments.length + fileArray.length > maxFiles) {
      toast({
        title: "Limite de arquivos excedido",
        description: `Você pode anexar no máximo ${maxFiles} arquivos.`,
        variant: "destructive",
      });
      return;
    }

    // Processar cada arquivo
    for (const file of fileArray) {
      // Validar arquivo
      const validation = FileUploadService.validateFile(file);
      if (!validation.isValid) {
        toast({
          title: "Arquivo inválido",
          description: validation.error,
          variant: "destructive",
        });
        continue;
      }

      // Verificar se arquivo já existe
      if (attachments.some(att => att.name === file.name && att.size === file.size)) {
        toast({
          title: "Arquivo duplicado",
          description: `O arquivo "${file.name}" já foi anexado.`,
          variant: "destructive",
        });
        continue;
      }

      try {
        setUploadingFiles(prev => [...prev, file.name]);
        
        // Upload do arquivo
        const attachment = await FileUploadService.uploadProjectFile(projectId, file);
        
        // Adicionar à lista de anexos
        onAttachmentsChange([...attachments, attachment]);
        
        toast({
          title: "Upload concluído",
          description: `Arquivo "${file.name}" foi anexado com sucesso.`,
        });
      } catch (error) {
        console.error('Erro no upload:', error);
        toast({
          title: "Erro no upload",
          description: error instanceof Error ? error.message : "Erro desconhecido",
          variant: "destructive",
        });
      } finally {
        setUploadingFiles(prev => prev.filter(name => name !== file.name));
      }
    }
  };

  const handleRemoveAttachment = async (attachment: ProjectAttachment) => {
    if (disabled) return;

    try {
      // Se o projeto já existe, deletar do Storage
      if (projectId !== 'temp') {
        await FileUploadService.deleteProjectFile(projectId, attachment.id, attachment.name);
      }
      
      // Remover da lista
      onAttachmentsChange(attachments.filter(att => att.id !== attachment.id));
      
      toast({
        title: "Arquivo removido",
        description: `"${attachment.name}" foi removido.`,
      });
    } catch (error) {
      console.error('Erro ao remover arquivo:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover arquivo.",
        variant: "destructive",
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!disabled && e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card
        className={`p-6 border-2 border-dashed transition-colors cursor-pointer ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <div className="text-center">
          <Upload className={`mx-auto h-12 w-12 mb-4 ${
            disabled ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <p className={`text-lg font-medium mb-2 ${
            disabled ? 'text-gray-400' : 'text-gray-700'
          }`}>
            {disabled ? 'Upload desabilitado' : 'Arraste arquivos aqui ou clique para selecionar'}
          </p>
          <p className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-500'}`}>
            Máximo {maxFiles} arquivos • 10MB cada • Imagens e documentos
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Formatos: JPG, PNG, GIF, WebP, PDF, Word, Excel, PowerPoint, TXT, ZIP, RAR
          </p>
        </div>
      </Card>

      {/* Input oculto */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
        onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled}
      />

      {/* Lista de arquivos anexados */}
      {(attachments.length > 0 || uploadingFiles.length > 0) && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Arquivos Anexados ({attachments.length}/{maxFiles})</h4>
          
          {/* Arquivos em upload */}
          {uploadingFiles.map((fileName) => (
            <Card key={`uploading-${fileName}`} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-600">Fazendo upload de "{fileName}"...</span>
                </div>
              </div>
            </Card>
          ))}

          {/* Arquivos anexados */}
          {attachments.map((attachment) => (
            <Card key={attachment.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{FileUploadService.getFileIcon(attachment.type)}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{attachment.name}</p>
                    <p className="text-xs text-gray-500">
                      {FileUploadService.formatFileSize(attachment.size)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(attachment.url, '_blank');
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {!disabled && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveAttachment(attachment);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}; 