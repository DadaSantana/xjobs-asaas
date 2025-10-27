import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAppSelector } from '@/hooks/redux';
import { UserProfileService } from '@/services/userProfileService';

const Avaliar = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const userProfile = useAppSelector((s) => s.auth.userProfile);

  const search = new URLSearchParams(location.search);
  const projectId = search.get('projectId') || '';
  const targetUserId = search.get('targetUserId') || '';
  const targetRole = (search.get('targetRole') || 'freelancer') as 'client' | 'freelancer';

  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!projectId || !targetUserId) {
      toast({ title: 'Dados inválidos', description: 'Parâmetros ausentes.', variant: 'destructive' });
    }
  }, [projectId, targetUserId, toast]);

  const submit = async () => {
    if (!userProfile) {
      toast({ title: 'Sessão', description: 'Faça login para avaliar.', variant: 'destructive' });
      return;
    }
    if (rating < 1 || rating > 5) {
      toast({ title: 'Avaliação inválida', description: 'Escolha entre 1 e 5 estrelas.', variant: 'destructive' });
      return;
    }
    try {
      setIsSubmitting(true);
      await UserProfileService.addReview({
        reviewerId: userProfile.uid,
        reviewerName: userProfile.name,
        reviewerType: userProfile.role,
        targetUserId,
        projectId,
        rating,
        comment,
      });
      toast({ title: 'Obrigado!', description: 'Sua avaliação foi registrada.' });
      navigate(-1);
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao enviar avaliação.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <Card className="p-6 space-y-4">
        <h1 className="text-xl font-semibold">Deixar Avaliação</h1>
        <p className="text-sm text-gray-600">Projeto: {projectId}</p>
        <p className="text-sm text-gray-600">Avaliar: {targetRole === 'freelancer' ? 'Freelancer' : 'Cliente'}</p>

        <div className="flex gap-2">
          {[1,2,3,4,5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`text-2xl ${star <= rating ? 'text-yellow-500' : 'text-gray-300'}`}
            >
              ★
            </button>
          ))}
        </div>

        <Textarea
          placeholder="Escreva um comentário público (opcional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button onClick={submit} disabled={isSubmitting || rating === 0}>
            {isSubmitting ? 'Enviando...' : 'Enviar Avaliação'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Avaliar;


