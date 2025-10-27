import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Heart, 
  HeartOff, 
  DollarSign,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { CreateProjectLikeData } from '@/types/project';
import { ProjectLikesService } from '@/services/projectLikesService';
import { useToast } from '@/hooks/use-toast';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';

interface LikeProjectButtonProps {
  projectId: string;
  projectTitle: string;
  currentLikesCount: number;
  maxLikes?: number;
  isProjectActive?: boolean;
  onLikeSuccess?: () => void;
  onUnlikeSuccess?: () => void;
}

export const LikeProjectButton: React.FC<LikeProjectButtonProps> = ({
  projectId,
  projectTitle,
  currentLikesCount,
  maxLikes = 80,
  isProjectActive = true,
  onLikeSuccess,
  onUnlikeSuccess
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingLike, setCheckingLike] = useState(true);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalData, setProposalData] = useState({
    proposedValue: '',
    message: ''
  });
  
  const { toast } = useToast();
  const user = useSelector((state: RootState) => state.auth.user);
  const userProfile = useSelector((state: RootState) => state.auth.userProfile);

  useEffect(() => {
    checkIfUserLiked();
  }, [projectId, user?.uid]);

  const checkIfUserLiked = async () => {
    if (!user?.uid) return;
    
    try {
      const hasLiked = await ProjectLikesService.hasUserLikedProject(projectId, user.uid);
      setIsLiked(hasLiked);
    } catch (error) {
      console.error('Erro ao verificar curtida:', error);
    } finally {
      setCheckingLike(false);
    }
  };

  const handleLikeProject = async () => {
    if (!user?.uid) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para demonstrar interesse",
        variant: "destructive"
      });
      return;
    }

    if (userProfile?.role !== 'freelancer') {
      toast({
        title: "Erro",
        description: "Apenas freelancers podem demonstrar interesse em projetos",
        variant: "destructive"
      });
      return;
    }

    setShowProposalForm(true);
  };

  const handleUnlikeProject = async () => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      await ProjectLikesService.unlikeProject(projectId, user.uid);
      setIsLiked(false);
      
      toast({
        title: "Sucesso",
        description: "Interesse removido com sucesso",
        variant: "default"
      });

      if (onUnlikeSuccess) {
        onUnlikeSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao remover interesse",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProposal = async () => {
    if (!user?.uid || !proposalData.proposedValue || !proposalData.message?.trim()) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const proposedValue = parseFloat(proposalData.proposedValue.replace(/[^\d,]/g, '').replace(',', '.'));
    
    if (isNaN(proposedValue) || proposedValue <= 0) {
      toast({
        title: "Erro",
        description: "Valor proposto inválido",
        variant: "destructive"
      });
      return;
    }

    if (proposedValue > 10000) {
      toast({
        title: "Erro",
        description: "Valor proposto não pode exceder R$ 10.000",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const likeData: CreateProjectLikeData = {
        projectId,
        freelancerId: user.uid,
        proposedValue,
        message: proposalData.message.trim()
      };

      await ProjectLikesService.likeProject(likeData);
      setIsLiked(true);
      setShowProposalForm(false);
      setProposalData({ proposedValue: '', message: '' });
      
      toast({
        title: "Sucesso",
        description: "Interesse demonstrado com sucesso!",
        variant: "default"
      });

      if (onLikeSuccess) {
        onLikeSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao demonstrar interesse",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    if (!numericValue) return '';
    
    const floatValue = parseFloat(numericValue) / 100;
    return floatValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const handleValueChange = (value: string) => {
    const formatted = formatCurrency(value);
    setProposalData(prev => ({ ...prev, proposedValue: formatted }));
  };

  // Verificações de disponibilidade
  const isProjectFull = currentLikesCount >= maxLikes;
  const canInteract = userProfile?.role === 'freelancer' && isProjectActive && !isProjectFull;

  if (checkingLike) {
    return (
      <Button disabled size="sm" className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Verificando...
      </Button>
    );
  }

  if (!canInteract && userProfile?.role === 'client') {
    return null; // Clientes não veem este botão
  }

  if (!canInteract && !isProjectActive) {
    return (
      <Button disabled size="sm" className="flex items-center gap-2 opacity-50">
        <AlertCircle className="w-4 h-4" />
        Projeto Inativo
      </Button>
    );
  }

  if (isProjectFull) {
    return (
      <Button disabled size="sm" className="flex items-center gap-2 opacity-50">
        <AlertCircle className="w-4 h-4" />
        Limite Atingido ({currentLikesCount}/{maxLikes})
      </Button>
    );
  }

  if (isLiked) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleUnlikeProject}
        disabled={loading}
        className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <HeartOff className="w-4 h-4" />
        )}
        Remover Interesse
      </Button>
    );
  }

  return (
    <>
      <Button
        size="sm"
        onClick={handleLikeProject}
        disabled={loading}
        className="flex items-center gap-2"
      >
        <Heart className="w-4 h-4" />
        Demonstrar Interesse
        <Badge variant="secondary" className="ml-1 text-xs">
          {currentLikesCount}/{maxLikes}
        </Badge>
      </Button>

      <Dialog open={showProposalForm} onOpenChange={setShowProposalForm}>
        <DialogContent className="w-[100dvw] h-[100dvh] max-w-none max-h-none md:max-w-[500px] md:max-h-[90dvh] md:rounded-lg overflow-y-auto p-0 flex flex-col">
          <DialogHeader className="p-4 md:p-6 border-b">
            <DialogTitle>Demonstrar Interesse no Projeto</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-1">{projectTitle}</h4>
              <p className="text-sm text-blue-700">
                Preencha sua proposta para demonstrar interesse neste projeto.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="proposedValue">Valor Proposto *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="proposedValue"
                  placeholder="Ex: R$ 1.500,00"
                  value={proposalData.proposedValue}
                  onChange={(e) => handleValueChange(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-gray-500">
                Limite máximo: R$ 10.000,00 (será acrescida comissão de 10%)
              </p>
              {proposalData.proposedValue && (
                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  Valor total para o cliente: {
                    (() => {
                      const value = parseFloat(proposalData.proposedValue.replace(/[^\d,]/g, '').replace(',', '.'));
                      if (!isNaN(value)) {
                        return (value * 1.1).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        });
                      }
                      return 'R$ 0,00';
                    })()
                  } (incluindo comissão de 10%)
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Mensagem de Apresentação *</Label>
              <Textarea
                id="message"
                placeholder="Olá! Tenho interesse neste projeto e posso ajudar porque..."
                value={proposalData.message}
                onChange={(e) => setProposalData(prev => ({ ...prev, message: e.target.value }))}
                rows={4}
                maxLength={500}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Descreva sua experiência e como pode ajudar</span>
                <span>{proposalData.message.length}/500</span>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Importante:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Esta ação consome uma de suas curtidas disponíveis</li>
                    <li>Sua proposta ficará visível para o cliente</li>
                    <li>Você pode remover o interesse posteriormente se necessário</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowProposalForm(false);
                  setProposalData({ proposedValue: '', message: '' });
                }}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitProposal}
                disabled={loading || !proposalData.proposedValue || !proposalData.message}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Enviar Proposta
              </Button>
            </div>
          </div>
        </div>
        </DialogContent>
      </Dialog>
    </>
  );
}; 