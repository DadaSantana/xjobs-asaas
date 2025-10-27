import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppSelector } from '@/hooks/redux';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/types/user';
import { Notification } from '@/types/notification';
import { AdminService, SystemLog } from '@/services/adminService';
import { 
  Users, 
  Briefcase, 
  UserPlus, 
  Shield,
  Crown,
  TrendingUp,
  MessageSquare,
  Activity,
  DollarSign,
  FileText,
  Calendar,
  AlertTriangle,
  Receipt,
  CreditCard,
  Wallet,
  Bell,
  Eye,
  EyeOff,
  CheckCircle
} from 'lucide-react';

const ManagerDashboard = () => {
  const userProfile = useAppSelector(state => state.auth.userProfile);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [stats, setStats] = useState({
    // Dados existentes
    totalUsers: 0,
    totalClients: 0,
    totalFreelancers: 0,
    totalManagers: 0,
    totalModerators: 0,
    activeChats: 0,
    disputedChats: 0,
    
    // Dados mensais de usuários
    monthlyFreelancers: 0,
    monthlyClients: 0,
    
    // Dados de projetos
    monthlyProjectsCreated: 0,
    monthlyProjectsCompleted: 0,
    monthlyDisputes: { count: 0, totalValue: 0 },
    
    // Dados financeiros
    totalFreelancerEarnings: 0,
    monthlyFreelancerEarnings: 0,
    totalClientSpending: 0,
    platformRevenue: 0
  });
  
  const [recentUsers, setRecentUsers] = useState<UserProfile[]>([]);
  const [recentProofs, setRecentProofs] = useState<any>({
    payments: [],
    subscriptions: [],
    earnings: []
  });
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [logStats, setLogStats] = useState({ total: 0, unread: 0 });
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    // Verificar se o usuário tem permissão
    if (!userProfile || (userProfile.role !== 'manager' && userProfile.role !== 'moderator')) {
      navigate('/manager/login');
      return;
    }
    
    loadDashboardData();
  }, [userProfile, navigate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Carregar estatísticas, usuários recentes, comprovantes e logs
      const [statsData, recentUsersData, proofsData, logsData, logStatsData] = await Promise.all([
        AdminService.getStats(),
        AdminService.getRecentUsers(5),
        AdminService.getRecentProofs(5),
        AdminService.getSystemLogs(10, showUnreadOnly),
        AdminService.getLogStats()
      ]);
      
      setStats(statsData);
      setRecentUsers(recentUsersData);
      setRecentProofs(proofsData);
      setSystemLogs(logsData);
      setLogStats(logStatsData);
      
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSystemLogs = async () => {
    try {
      setLogsLoading(true);
      const [logsData, logStatsData] = await Promise.all([
        AdminService.getSystemLogs(20, showUnreadOnly),
        AdminService.getLogStats()
      ]);
      setSystemLogs(logsData);
      setLogStats(logStatsData);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar logs do sistema",
        variant: "destructive",
      });
    } finally {
      setLogsLoading(false);
    }
  };

  const handleMarkLogAsRead = async (logId: string) => {
    try {
      await AdminService.markLogAsRead(logId);
      await loadSystemLogs();
      toast({
        title: "Sucesso",
        description: "Log marcado como lido",
      });
    } catch (error) {
      console.error('Erro ao marcar log como lido:', error);
      toast({
        title: "Erro",
        description: "Erro ao marcar log como lido",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllLogsAsRead = async () => {
    try {
      await AdminService.markAllLogsAsRead();
      await loadSystemLogs();
      toast({
        title: "Sucesso",
        description: "Todos os logs foram marcados como lidos",
      });
    } catch (error) {
      console.error('Erro ao marcar todos os logs como lidos:', error);
      toast({
        title: "Erro",
        description: "Erro ao marcar todos os logs como lidos",
        variant: "destructive",
      });
    }
  };

  const toggleUnreadFilter = () => {
    setShowUnreadOnly(!showUnreadOnly);
  };

  // Recarregar logs quando o filtro mudar
  useEffect(() => {
    if (!loading) {
      loadSystemLogs();
    }
  }, [showUnreadOnly]);

  const getLogTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'payment': 'Pagamento',
      'project': 'Projeto',
      'user': 'Usuário',
      'dispute': 'Disputa',
      'plan': 'Plano',
      'system': 'Sistema',
      'error': 'Erro'
    };
    return labels[type] || type;
  };

  const getLogLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      'info': 'bg-blue-100 text-blue-800',
      'warning': 'bg-yellow-100 text-yellow-800',
      'error': 'bg-red-100 text-red-800',
      'critical': 'bg-red-200 text-red-900'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  const getUserDisplayInfo = (log: SystemLog) => {
    if (log.metadata?.userName) {
      return log.metadata.userName;
    }
    if (log.metadata?.clientName) {
      return log.metadata.clientName;
    }
    if (log.metadata?.freelancerName) {
      return log.metadata.freelancerName;
    }
    return log.source || 'Sistema';
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      client: 'secondary',
      freelancer: 'default',
      manager: 'destructive',
      moderator: 'outline'
    } as const;
    
    const labels = {
      client: 'Cliente',
      freelancer: 'Freelancer', 
      manager: 'Gestor',
      moderator: 'Moderador'
    };
    
    return (
      <Badge variant={variants[role as keyof typeof variants] || 'secondary'}>
        {labels[role as keyof typeof labels] || role}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm md:text-base text-gray-600">Visão geral da plataforma Xjobs</p>
      </div>

      {/* Stats Cards - Usuários */}
      <div className="mb-4 md:mb-6">
        <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4">📊 Dados de Usuários</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalClients} clientes, {stats.totalFreelancers} freelancers
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Freelancers no Mês</CardTitle>
              <Calendar className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.monthlyFreelancers}</div>
              <p className="text-xs text-muted-foreground">
                Cadastrados este mês
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes no Mês</CardTitle>
              <Calendar className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.monthlyClients}</div>
              <p className="text-xs text-muted-foreground">
                Cadastrados este mês
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chats Ativos</CardTitle>
              <MessageSquare className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeChats}</div>
              <p className="text-xs text-muted-foreground">
                {stats.disputedChats} em disputa
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats Cards - Projetos */}
      <div className="mb-4 md:mb-6">
        <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4">🚀 Dados de Projetos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projetos Criados no Mês</CardTitle>
              <Briefcase className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.monthlyProjectsCreated}</div>
              <p className="text-xs text-muted-foreground">
                Novos projetos este mês
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projetos Concluídos no Mês</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.monthlyProjectsCompleted}</div>
              <p className="text-xs text-muted-foreground">
                Finalizados este mês
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disputas no Mês</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.monthlyDisputes.count}</div>
              <p className="text-xs text-muted-foreground">
                R$ {stats.monthlyDisputes.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em disputa
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats Cards - Financeiro */}
      <div className="mb-4 md:mb-6">
        <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4">💰 Dados Financeiros</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ganhos Freelancers (Total)</CardTitle>
              <Wallet className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {stats.totalFreelancerEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Ganhos acumulados
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ganhos Freelancers (Mês)</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {stats.monthlyFreelancerEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Ganhos este mês
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gastos dos Clientes</CardTitle>
              <CreditCard className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {stats.totalClientSpending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Total investido
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita da Plataforma</CardTitle>
              <Receipt className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {stats.platformRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Comissões + Planos
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Comprovantes */}
      <div className="mb-6 md:mb-8">
        <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4">📄 Comprovantes Recentes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                Assinaturas de Plano
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentProofs.subscriptions.map((proof, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <p className="text-sm font-medium">{proof.userName}</p>
                      <p className="text-xs text-muted-foreground">{proof.planName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-blue-600">
                        R$ {proof.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(proof.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-600" />
                Pagamentos de Projeto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentProofs.payments.map((proof, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <p className="text-sm font-medium">{proof.clientName}</p>
                      <p className="text-xs text-muted-foreground">{proof.projectTitle}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600">
                        R$ {proof.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(proof.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-purple-600" />
                Ganhos de Freelancer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentProofs.earnings.map((proof, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <p className="text-sm font-medium">{proof.freelancerName}</p>
                      <p className="text-xs text-muted-foreground">{proof.projectTitle}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-purple-600">
                        R$ {proof.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(proof.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Usuários Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários Recentes</CardTitle>
            <CardDescription>
              Últimos usuários cadastrados na plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-gray-500">
                {stats.totalUsers} usuários cadastrados
              </div>
              <Button size="sm" onClick={() => navigate('/manager/users')}>
                <Users className="h-4 w-4 mr-2" />
                Ver Todos
              </Button>
            </div>
            
            {recentUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p>Nenhum usuário encontrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentUsers.map((user) => (
                  <div key={user.uid} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getRoleBadge(user.role)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Equipe Administrativa */}
        <Card>
          <CardHeader>
            <CardTitle>Equipe Administrativa</CardTitle>
            <CardDescription>
              Gestores e moderadores da plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Crown className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium">Gestores</p>
                    <p className="text-sm text-gray-500">{stats.totalManagers} ativos</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/manager/team')}>
                  Ver
                </Button>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Shield className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Moderadores</p>
                    <p className="text-sm text-gray-500">{stats.totalModerators} ativos</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/manager/team')}>
                  Ver
                </Button>
              </div>
              
              {userProfile?.role === 'manager' && (
                <div className="pt-4 border-t">
                  <Button className="w-full" onClick={() => navigate('/manager/team/new')}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Adicionar Membro
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs do Sistema */}
      <Card className="mt-6 md:mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Bell className="h-4 w-4 md:h-5 md:w-5" />
            Logs do Sistema
            {logStats.unread > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {logStats.unread}
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-sm">
            Monitore todas as atividades e notificações do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant={showUnreadOnly ? "default" : "outline"}
                size="sm"
                onClick={toggleUnreadFilter}
                disabled={logsLoading}
              >
                {showUnreadOnly ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showUnreadOnly ? 'Mostrar Todos' : 'Apenas Não Lidos'}
              </Button>
              <span className="text-sm text-gray-500">
                {logStats.total} total, {logStats.unread} não lidos
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {logStats.unread > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllLogsAsRead}
                  disabled={logsLoading}
                  className="w-full sm:w-auto"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Marcar Todos como Lidos</span>
                  <span className="sm:hidden">Marcar Lidos</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={loadSystemLogs}
                disabled={logsLoading}
                className="w-full sm:w-auto"
              >
                <Activity className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>

          {logsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Carregando logs...</p>
            </div>
          ) : systemLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p>{showUnreadOnly ? 'Nenhum log não lido' : 'Nenhum log encontrado'}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {systemLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 border rounded-lg transition-colors ${
                    log.read ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={log.read ? 'secondary' : 'default'} className="text-xs">
                          {getLogTypeLabel(log.type)}
                        </Badge>
                        <Badge className={`text-xs ${getLogLevelColor(log.level || 'info')}`}>
                          {(log.level || 'info').toUpperCase()}
                        </Badge>
                        {!log.read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                      </div>
                      <h4 className="font-medium text-sm">{log.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{log.message}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Origem: {getUserDisplayInfo(log)}</span>
                        <span>{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {!log.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkLogAsRead(log.id)}
                          className="text-xs"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Marcar como Lido
                        </Button>
                      )}
                      {log.projectId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/manager/projects/${log.projectId}`)}
                          className="text-xs"
                        >
                          Ver Projeto
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Moderação de Chats */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Moderação de Chats</CardTitle>
          <CardDescription>
            Monitore conversas que precisam de atenção
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div className="text-center py-8 text-gray-500 flex-1">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p>Nenhuma conversa em disputa no momento</p>
            </div>
            <Button onClick={() => navigate('/manager/chats')}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Ver Chats
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagerDashboard;