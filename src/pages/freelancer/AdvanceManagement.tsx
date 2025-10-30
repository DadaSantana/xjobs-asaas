import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Zap, 
  AlertCircle, 
  Clock,
  CheckCircle,
  Calendar,
  DollarSign
} from 'lucide-react';
import { AdvanceRequestDialog } from '@/components/advance/AdvanceRequestDialog';
import { AdvanceCard } from '@/components/advance/AdvanceCard';
import { 
  getAdvanceHistory, 
  getFreelancerAdvanceStats, 
  cancelAdvance,
  checkAdvanceEligibility 
} from '@/services/advanceService';
import { AdvanceRequest } from '@/types/advance';
import { useToast } from '@/hooks/use-toast';
import { useAppSelector } from '@/hooks/redux';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const AdvanceManagement: React.FC = () => {
  const userProfile = useAppSelector(state => state.auth.userProfile);
  const { toast } = useToast();
  
  const [advances, setAdvances] = useState<AdvanceRequest[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<{ id: string; title: string } | null>(null);
  const [eligibleProjects, setEligibleProjects] = useState<any[]>([]);

  useEffect(() => {
    if (userProfile?.uid) {
      loadData();
    }
  }, [userProfile]);

  const loadData = async () => {
    if (!userProfile?.uid) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Carregar dados em paralelo
      const [advancesData, statsData] = await Promise.all([
        getAdvanceHistory(userProfile.uid),
        getFreelancerAdvanceStats(userProfile.uid)
      ]);
      
      setAdvances(advancesData);
      setStats(statsData);
      
      // Carregar projetos elegíveis para adiantamento
      await loadEligibleProjects();
      
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadEligibleProjects = async () => {
    if (!userProfile?.uid) return;
    
    try {
      // Buscar projetos com pagamentos confirmados mas não totalmente liberados
      const paymentsQuery = query(
        collection(db, 'projectPayments'),
        where('freelancerId', '==', userProfile.uid),
        where('paymentStatus', '==', 'paid'),
        orderBy('createdAt', 'desc')
      );
      
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const eligibleProjectsData = [];
      
      for (const doc of paymentsSnapshot.docs) {
        const payment = doc.data();
        const totalPaid = Number(payment.totalHeld || 0);
        const totalReleased = Number(payment.totalReleased || 0);
        const availableAmount = totalPaid - totalReleased;
        
        if (availableAmount > 50) { // Mínimo R$ 50 para adiantamento
          // Verificar elegibilidade
          const eligibility = await checkAdvanceEligibility(userProfile.uid, payment.projectId);
          
          if (eligibility.eligible) {
            eligibleProjectsData.push({
              id: payment.projectId,
              title: payment.projectTitle,
              availableAmount,
              paymentId: doc.id
            });
          }
        }
      }
      
      setEligibleProjects(eligibleProjectsData);
      
    } catch (error) {
      console.error('Erro ao carregar projetos elegíveis:', error);
    }
  };

  const handleAdvanceRequest = (projectId: string, projectTitle: string) => {
    setSelectedProject({ id: projectId, title: projectTitle });
    setShowAdvanceDialog(true);
  };

  const handleAdvanceSuccess = () => {
    loadData();
    setShowAdvanceDialog(false);
    setSelectedProject(null);
  };

  const handleCancel = async (advanceId: string) => {
    try {
      await cancelAdvance(advanceId);
      toast({
        title: 'Adiantamento cancelado',
        description: 'Sua solicitação foi cancelada com sucesso.',
      });
      await loadData();
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Erro ao cancelar adiantamento',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Carregando dados de adiantamento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6 text-yellow-500" />
          Adiantamento de Valores
        </h1>
        <p className="text-gray-600">
          Receba antecipadamente valores de projetos concluídos com taxa de 5%
        </p>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Solicitado</p>
                  <p className="text-2xl font-bold">{stats.totalAdvancesRequested}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Aprovados</p>
                  <p className="text-2xl font-bold text-green-600">{stats.totalAdvancesApproved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Valor Total</p>
                  <p className="text-2xl font-bold text-blue-600">
                    R$ {stats.totalAmountAdvanced.toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Este Mês</p>
                  <p className="text-2xl font-bold">{stats.monthlyAdvancesCount}/3</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Projetos Elegíveis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Projetos Elegíveis para Adiantamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {eligibleProjects.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Nenhum projeto elegível encontrado</p>
              <p className="text-sm text-gray-500">
                Projetos precisam ter pagamento confirmado e valor mínimo de R$ 50,00
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {eligibleProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold">{project.title}</h4>
                    <p className="text-sm text-gray-600">
                      Valor disponível: R$ {project.availableAmount.toFixed(2)}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleAdvanceRequest(project.id, project.title)}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    Solicitar Adiantamento
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Adiantamentos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Histórico de Adiantamentos</CardTitle>
            {advances.length > 6 && (
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/freelancer/adiantamentos'}>
                Ver Todos
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {advances.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Nenhum adiantamento solicitado ainda</p>
              <p className="text-sm text-gray-500">
                Solicite adiantamentos dos projetos elegíveis acima
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {advances.slice(0, 6).map((advance) => (
                <AdvanceCard
                  key={advance.id}
                  advance={advance}
                  onCancel={handleCancel}
                  showActions={true}
                  isAdmin={false}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de solicitação */}
      {selectedProject && (
        <AdvanceRequestDialog
          open={showAdvanceDialog}
          onOpenChange={setShowAdvanceDialog}
          projectId={selectedProject.id}
          projectTitle={selectedProject.title}
          onSuccess={handleAdvanceSuccess}
        />
      )}
    </div>
  );
};

export default AdvanceManagement;
