import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/types/user';
import { AdminService } from '@/services/adminService';
import { 
  Users, 
  Search,
  Filter,
  UserCheck,
  UserX,
  Mail,
  Calendar,
  Briefcase,
  AlertTriangle
} from 'lucide-react';

const ManagerUsers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      // Carregar usuários do Firestore
      const usersData = await AdminService.getAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    setUserToDelete(user);
    setShowDeleteDialog(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      setDeletingUser(userToDelete.uid);
      await AdminService.deleteUser(userToDelete.uid);
      
      toast({
        title: "Sucesso",
        description: "Usuário removido com sucesso",
      });
      
      // Recarregar lista de usuários
      await loadUsers();
      setShowDeleteDialog(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Erro ao remover usuário:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover usuário",
        variant: "destructive",
      });
    } finally {
      setDeletingUser(null);
    }
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Usuários</h1>
        <p className="text-sm md:text-base text-gray-600">Gerencie clientes e freelancers da plataforma</p>
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
            
            <div className="grid grid-cols-2 sm:flex gap-2">
              <Button
                variant={filterRole === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterRole('all')}
                className="text-xs sm:text-sm"
                size="sm"
              >
                Todos
              </Button>
              <Button
                variant={filterRole === 'client' ? 'default' : 'outline'}
                onClick={() => setFilterRole('client')}
                className="text-xs sm:text-sm"
                size="sm"
              >
                Clientes
              </Button>
              <Button
                variant={filterRole === 'freelancer' ? 'default' : 'outline'}
                onClick={() => setFilterRole('freelancer')}
                className="text-xs sm:text-sm col-span-2 sm:col-span-1"
                size="sm"
              >
                Freelancers
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de usuários */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Users className="h-4 w-4 md:h-5 md:w-5" />
            <span className="truncate">Usuários ({filteredUsers.length})</span>
          </CardTitle>
          <CardDescription className="text-sm">
            Lista completa de usuários da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum usuário encontrado
              </h3>
              <p className="text-gray-500">
                {searchTerm || filterRole !== 'all' 
                  ? 'Tente ajustar os filtros de busca'
                  : 'Nenhum usuário cadastrado ainda'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.uid} className="border rounded-lg p-3 md:p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-semibold text-sm md:text-lg">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                          <h3 className="font-medium text-gray-900 text-sm md:text-base truncate">{user.name}</h3>
                          {getRoleBadge(user.role)}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1 text-xs md:text-sm text-gray-500">
                          <div className="flex items-center gap-1 min-w-0">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{user.email}</span>
                          </div>
                          
                          {user.phone && (
                            <div className="flex items-center gap-1">
                              <span className="truncate">{user.phone}</span>
                            </div>
                          )}
                          
                          {user.createdAt && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 flex-shrink-0" />
                              <span className="whitespace-nowrap">
                                {typeof user.createdAt === 'object' && user.createdAt.toDate 
                                  ? user.createdAt.toDate().toLocaleDateString()
                                  : new Date(user.createdAt as any).toLocaleDateString()
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs md:text-sm px-2 md:px-3"
                        onClick={() => navigate(`/manager/user/${user.uid}`)}
                      >
                        <span className="hidden sm:inline">Ver Perfil</span>
                        <span className="sm:hidden">Ver</span>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700 px-2"
                        onClick={() => handleDeleteUser(user)}
                        disabled={deletingUser === user.uid}
                      >
                        <UserX className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o usuário <strong>{userToDelete?.name}</strong>?
              <br />
              <span className="text-red-600 font-medium">Esta ação não pode ser desfeita.</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              disabled={deletingUser !== null}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteUser}
              disabled={deletingUser !== null}
            >
              {deletingUser ? 'Removendo...' : 'Remover Usuário'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagerUsers;