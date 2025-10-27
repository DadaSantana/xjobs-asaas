import React, { useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserProfileService } from '@/services/userProfileService';
import { PortfolioDocument } from '@/types/user';
import { FileText, X, Loader2 } from 'lucide-react';

interface DocumentUploadProps {
  userId: string;
  documents: PortfolioDocument[];
  onDocumentsChange: (documents: PortfolioDocument[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  userId,
  documents,
  onDocumentsChange,
  maxFiles = 3,
  disabled = false
}) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (files: FileList) => {
    if (disabled || uploading) return;

    const fileArray = Array.from(files);
    
    // Verificar limite de arquivos
    if (documents.length + fileArray.length > maxFiles) {
      toast({
        title: "Limite de arquivos excedido",
        description: `Você pode anexar no máximo ${maxFiles} documentos.`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      for (const file of fileArray) {
        // Verificar se arquivo já existe
        if (documents.some(doc => doc.name === file.name && doc.size === file.size)) {
          toast({
            title: "Arquivo duplicado",
            description: `O arquivo "${file.name}" já foi anexado.`,
            variant: "destructive",
          });
          continue;
        }

        try {
          const document = await UserProfileService.uploadPortfolioDocument(userId, file);
          onDocumentsChange([...documents, document]);
          
          toast({
            title: "Upload concluído",
            description: `Documento "${file.name}" foi anexado com sucesso.`,
          });
        } catch (error) {
          console.error('Erro no upload:', error);
          toast({
            title: "Erro no upload",
            description: error instanceof Error ? error.message : "Erro desconhecido",
            variant: "destructive",
          });
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveDocument = (documentToRemove: PortfolioDocument) => {
    const updatedDocuments = documents.filter(doc => doc.id !== documentToRemove.id);
    onDocumentsChange(updatedDocuments);
    
    toast({
      title: "Documento removido",
      description: `Documento "${documentToRemove.name}" foi removido.`,
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('text')) return '📃';
    return '📄';
  };

  return (
    <div>
      <Label>Documentos do Projeto</Label>
      <div className="space-y-4">
        <div>
          <Label htmlFor="portfolio-documents" className="cursor-pointer">
            <div className="flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              ) : (
                <FileText className="w-5 h-5 text-gray-500" />
              )}
              <span className="text-gray-600">
                {uploading ? 'Enviando documentos...' : 'Clique para adicionar documentos'}
              </span>
            </div>
            <input
              ref={fileInputRef}
              id="portfolio-documents"
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              multiple
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileSelect(e.target.files);
                }
              }}
              className="hidden"
              disabled={disabled || uploading}
            />
          </Label>
          <p className="text-xs text-gray-500 mt-1">
            Múltiplos documentos • Máximo 10MB cada • PDF, Word ou TXT
          </p>
        </div>

        {/* Preview dos documentos */}
        {documents.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {documents.map((document) => (
              <div key={document.id} className="relative group">
                <div className="relative">
                  <div className="w-full h-24 bg-gray-100 rounded-lg border flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-3xl block mb-1">{getFileTypeIcon(document.type)}</span>
                      <p className="text-xs text-gray-600 px-2 truncate">{document.name}</p>
                    </div>
                  </div>
                </div>
                
                {/* Botões de ação */}
                <div className="absolute top-1 right-1 flex gap-1">
                  <button
                    type="button"
                    onClick={() => window.open(document.url, '_blank')}
                    className="p-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors opacity-0 group-hover:opacity-100"
                    title="Visualizar documento"
                  >
                    <FileText className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveDocument(document)}
                    className="p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors opacity-0 group-hover:opacity-100"
                    disabled={disabled}
                    title="Remover documento"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                
                {/* Info do arquivo */}
                <div className="absolute bottom-1 left-1 right-1">
                  <div className="bg-black bg-opacity-60 text-white text-xs px-1 py-0.5 rounded text-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatFileSize(document.size)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
