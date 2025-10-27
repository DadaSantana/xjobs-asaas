import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/types/user';
import { AdminService } from '@/services/adminService';
import { 
  ArrowLeft,
  User, 
  Mail, 
  Phone, 
  Calendar,
  MapPin,
  Briefcase,
  Star,
  DollarSign,
  FileText,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ManagerUserDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadUserDetails(id);
    }
  }, [id]);

  const loadUserDetails = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Buscar detalhes do usuário
      const userDetails = await AdminService.getUserById(userId);
      setUser(userDetails);
    } catch (err) {
      console.error('Erro ao carregar detalhes do usuário:', err);
      setError('Erro ao carregar detalhes do usuário');
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes do usuário.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      'client': 'Cliente',
      'freelancer': 'Freelancer',
      'manager': 'Gestor',
      'moderator': 'Moderador'
    };
    return roleMap[role] || role;
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'manager':
        return 'default';
      case 'moderator':
        return 'secondary';
      case 'freelancer':
        return 'outline';
      case 'client':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'Não informado';
    
    let dateObj: Date;
    if (date.toDate) {
      dateObj = date.toDate();
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      dateObj = new Date(date);
    }
    
    return formatDistanceToNow(dateObj, { 
      addSuffix: true, 
      locale: ptBR 
    });
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/manager/users')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando detalhes do usuário...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/manager/users')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Usuário não encontrado</h3>
          <p className="text-gray-600">O usuário solicitado não foi encontrado ou você não tem permissão para visualizá-lo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/manager/users')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Detalhes do Usuário</h1>
          <p className="text-gray-600">Informações completas do perfil</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações Básicas */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nome</label>
                  <p className="text-gray-900">{user.name || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Telefone</label>
                  <p className="text-gray-900">{user.phone || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tipo de Usuário</label>
                  <div>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {user.bio && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Biografia</label>
                  <p className="text-gray-900 mt-1">{user.bio}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informações Profissionais (para freelancers) */}
          {user.role === 'freelancer' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Informações Profissionais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {user.skills && user.skills.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Habilidades</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {user.skills.map((skill, index) => (
                        <Badge key={index} variant="outline">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {user.experience && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Experiência</label>
                    <p className="text-gray-900 mt-1">{user.experience}</p>
                  </div>
                )}
                
                {user.portfolio && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Portfólio</label>
                    <p className="text-gray-900 mt-1">
                      {typeof user.portfolio === 'string' 
                        ? user.portfolio 
                        : Array.isArray(user.portfolio) 
                          ? user.portfolio.map((item, index) => (
                              <span key={index} className="block">
                                {typeof item === 'string' ? item : item.title || item.name || 'Item do portfólio'}
                              </span>
                            ))
                          : 'Portfólio disponível'
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar com informações adicionais */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Atividade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Cadastrado</label>
                <p className="text-gray-900">{formatDate(user.createdAt)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Última atualização</label>
                <p className="text-gray-900">{formatDate(user.updatedAt)}</p>
              </div>
              {user.lastLogin && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Último login</label>
                  <p className="text-gray-900">{formatDate(user.lastLogin)}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                  <span className="text-gray-900">
                    {user.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas (se disponível) */}
          {user.role === 'freelancer' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Estatísticas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">-</p>
                  <p className="text-sm text-gray-500">Projetos concluídos</p>
                </div>
                <Separator />
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">-</p>
                  <p className="text-sm text-gray-500">Avaliação média</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagerUserDetail;