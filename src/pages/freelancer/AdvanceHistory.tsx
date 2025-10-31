import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Search,
  Filter,
  Calendar
} from 'lucide-react';
import { AdvanceCard } from '@/components/advance/AdvanceCard';
import { AdvanceRequest, AdvanceHistoryFilters } from '@/types/advance';
import { getAdvanceHistory, getFreelancerAdvanceStats, cancelAdvance } from '@/services/advanceService';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';

const AdvanceHistory: React.FC = () => {
  const [advances, setAdvances] = useState<AdvanceRequest[]>([]);
  const [filteredAdvances, setFilteredAdvances] = useState<AdvanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [filters, setFilters] = useState<AdvanceHistoryFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [advances, filters, searchTerm]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Carregar histórico de adiantamentos
      const advancesData = await getAdvanceHistory(user.uid);
      setAdvances(advancesData);

      // Carregar estatísticas
      const statsData = await getFreelancerAdvanceStats(user.uid);
      setStats(statsData);

    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...advances];

    // Filtro por status
    if (filters.status) {
      filtered = filtered.filter(advance => advance.status === filters.status);
    }

    // Filtro por projeto
    if (filters.projectId) {
      filtered = filtered.filter(advance => advance.projectId === filters.projectId);
    }

    // Filtro por busca (nome do projeto)
    if (searchTerm) {
      filtered = filtered.filter(advance => 
        advance.projectTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por data
    if (filters.dateFrom) {
      filtered = filtered.filter(advance => 
        advance.requestedAt.toDate() >= filters.dateFrom!
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(advance => 
        advance.requestedAt.toDate() <= filters.dateTo!
      );
    }

    setFilteredAdvances(filtered);
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

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  // Agrupar por status
  const advancesByStatus = {
    pending: filteredAdvances.filter(a => a.status === 'pending'),
    approved: filteredAdvances.filter(a => a.status === 'approved'),
    processed: filteredAdvances.filter(a => a.status === 'processed'),
    rejected: filteredAdvances.filter(a => a.status === 'rejected'),
    cancelled: filteredAdvances.filter(a => a.status === 'cancelled'),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Carregando histórico...</p>
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
        <h1 className="text-2xl font-bold">Histórico de Adiantamentos</h1>
        <p className="text-gray-600">Acompanhe suas solicitações de adiantamento</p>
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
                  <p className="text-2xl font-bold">{stats.monthlyAdvancesCount}</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar Projeto</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Nome do projeto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status || ''}
                onValueChange={(value) => setFilters({ ...filters, status: value as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="processed">Processado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data Inicial</label>
              <Input
                type="date"
                value={filters.dateFrom ? filters.dateFrom.toISOString().split('T')[0] : ''}
                onChange={(e) => setFilters({ 
                  ...filters, 
                  dateFrom: e.target.value ? new Date(e.target.value) : undefined 
                })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data Final</label>
              <Input
                type="date"
                value={filters.dateTo ? filters.dateTo.toISOString().split('T')[0] : ''}
                onChange={(e) => setFilters({ 
                  ...filters, 
                  dateTo: e.target.value ? new Date(e.target.value) : undefined 
                })}
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Adiantamentos */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">
            Todos ({filteredAdvances.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pendentes ({advancesByStatus.pending.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Aprovados ({advancesByStatus.approved.length})
          </TabsTrigger>
          <TabsTrigger value="processed">
            Processados ({advancesByStatus.processed.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejeitados ({advancesByStatus.rejected.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelados ({advancesByStatus.cancelled.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredAdvances.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum adiantamento encontrado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAdvances.map((advance) => (
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
        </TabsContent>

        {Object.entries(advancesByStatus).map(([status, statusAdvances]) => (
          <TabsContent key={status} value={status} className="space-y-4">
            {statusAdvances.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhum adiantamento {status} encontrado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {statusAdvances.map((advance) => (
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
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default AdvanceHistory;

