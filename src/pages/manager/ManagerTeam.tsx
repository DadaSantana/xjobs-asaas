import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/hooks/redux';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/types/user';
import { AdminService } from '@/services/adminService';
import { 
  Shield, 
  Crown,
  UserPlus,
  Search,
  Mail,
  Calendar,
  UserX,
  Settings,
  AlertTriangle
} from 'lucide-react';

const ManagerTeam = () => {
  const userProfile = useAppSelector(state => state.auth.userProfile);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<UserProfile | null>(null);

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      // Carregar membros da equipe do Firestore
      const teamData = await AdminService.getTeamMembers();
      setTeamMembers(teamData);
    } catch (error) {
      console.error('Erro ao carregar equipe:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar membros da equipe",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditMember = (member: UserProfile) => {
    // Por enquanto, redireciona para a página de detalhes do usuário
    // Em uma implementação mais completa, poderia abrir um modal de edição
    navigate(`/manager/user/${member.uid}`);
  };

  const handleRemoveMember = (member: UserProfile) => {
    setMemberToDelete(member);
    setShowDeleteDialog(true);
  };

  const confirmRemoveMember = async () => {
    if (!memberToDelete) return;
    
    try {
      setRemovingMember(memberToDelete.uid);
      await AdminService.removeTeamMember(memberToDelete.uid);
      
      toast({
        title: "Sucesso",
        description: "Membro removido da equipe com sucesso",
      });
      
      // Recarregar lista de membros
      await loadTeamMembers();
      setShowDeleteDialog(false);
      setMemberToDelete(null);
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover membro da equipe",
        variant: "destructive",
      });
    } finally {
      setRemovingMember(null);
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'manager') {
      return (
        <Badge variant="destructive" className="bg-yellow-100 text-yellow-800 border-yellow-300">
          <Crown className="h-3 w-3 mr-1" />
          Gestor
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
        <Shield className="h-3 w-3 mr-1" />
        Moderador
      </Badge>
    );
  };

  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || member.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const managers = filteredMembers.filter(m => m.role === 'manager');
  const moderators = filteredMembers.filter(m => m.role === 'moderator');

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando equipe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Equipe</h1>
            <p className="text-sm md:text-base text-gray-600">Gerencie gestores e moderadores da plataforma</p>
          </div>
          
          {userProfile?.role === 'manager' && (
            <Button onClick={() => navigate('/manager/team/new')} className="w-full sm:w-auto">
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar Membro
            </Button>
          )}
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-600" />
              Gestores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{managers.length}</div>
            <p className="text-xs text-muted-foreground">
              Controle total da plataforma
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              Moderadores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{moderators.length}</div>
            <p className="text-xs text-muted-foreground">
              Moderação de chats e disputas
            </p>
          </CardContent>
        </Card>
        
        <Card className="sm:col-span-2 md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total da Equipe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{teamMembers.length}</div>
            <p className="text-xs text-muted-foreground">
              Membros administrativos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-4 md:mb-6">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col gap-4">
            <div className="w-full">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 sm:flex gap-2">
              <Button
                variant={filterRole === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterRole('all')}
                className="text-xs sm:text-sm"
                size="sm"
              >
                Todos
              </Button>
              <Button
                variant={filterRole === 'manager' ? 'default' : 'outline'}
                onClick={() => setFilterRole('manager')}
                className="text-xs sm:text-sm"
                size="sm"
              >
                Gestores
              </Button>
              <Button
                variant={filterRole === 'moderator' ? 'default' : 'outline'}
                onClick={() => setFilterRole('moderator')}
                className="text-xs sm:text-sm"
                size="sm"
              >
                Moderadores
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista da equipe */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Shield className="h-4 w-4 md:h-5 md:w-5" />
            <span className="truncate">Equipe ({filteredMembers.length})</span>
          </CardTitle>
          <CardDescription className="text-sm">
            Lista de gestores e moderadores com acesso administrativo
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <Shield className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">
                Nenhum membro encontrado
              </h3>
              <p className="text-sm md:text-base text-gray-500 mb-4">
                {searchTerm || filterRole !== 'all' 
                  ? 'Tente ajustar os filtros de busca'
                  : 'Nenhum membro da equipe cadastrado ainda'
                }
              </p>
              {userProfile?.role === 'manager' && !searchTerm && filterRole === 'all' && (
                <Button onClick={() => navigate('/manager/team/new')} className="w-full sm:w-auto">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Adicionar Primeiro Membro
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {filteredMembers.map((member) => (
                <div key={member.uid} className="border rounded-lg p-3 md:p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0">
                        {member.role === 'manager' ? (
                          <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                            <Crown className="h-5 w-5 md:h-6 md:w-6 text-yellow-600" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <Shield className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                          </div>
                        )}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-medium text-sm md:text-base text-gray-900 truncate">{member.name}</h3>
                          {getRoleBadge(member.role)}
                          {member.uid === userProfile?.uid && (
                            <Badge variant="secondary" className="text-xs">
                              Você
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs md:text-sm text-gray-500">
                          <div className="flex items-center gap-1 min-w-0">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{member.email}</span>
                          </div>
                          
                          {member.createdAt && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Calendar className="h-3 w-3" />
                              <span className="whitespace-nowrap">
                                Desde {typeof member.createdAt === 'object' && member.createdAt.toDate 
                                  ? member.createdAt.toDate().toLocaleDateString()
                                  : new Date(member.createdAt as any).toLocaleDateString()
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs md:text-sm"
                        onClick={() => handleEditMember(member)}
                      >
                        <Settings className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                        <span className="hidden sm:inline">Editar</span>
                        <span className="sm:hidden">Edit</span>
                      </Button>
                      
                      {userProfile?.role === 'manager' && member.uid !== userProfile.uid && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs md:text-sm text-red-600 hover:text-red-700"
                          onClick={() => handleRemoveMember(member)}
                          disabled={removingMember === member.uid}
                        >
                          <UserX className="h-3 w-3 md:h-4 md:w-4" />
                          <span className="sr-only">Remover</span>
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

      {/* Dialog de confirmação de remoção */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmar Remoção
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover <strong>{memberToDelete?.name}</strong> da equipe?
              <br />
              <span className="text-red-600 font-medium">Esta ação não pode ser desfeita.</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              disabled={removingMember !== null}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmRemoveMember}
              disabled={removingMember !== null}
            >
              {removingMember ? 'Removendo...' : 'Remover da Equipe'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagerTeam;