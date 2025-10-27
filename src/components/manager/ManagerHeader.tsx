import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { useAppSelector } from '@/hooks/redux';
import { AuthService } from '@/services/authService';
import { AdminService } from '@/services/adminService';
import { Switch } from '@/components/ui/switch';
import {
  Menu,
  X,
  Users,
  Shield,
  MessageSquare,
  BarChart3,
  Star,
  Settings,
  LogOut,
  Crown,
  UserPlus
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ManagerHeader = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const userProfile = useAppSelector(state => state.auth.userProfile);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Firestore plan status logic
  const [planStatus, setPlanStatus] = useState<boolean>(false);
  const [loadingPlan, setLoadingPlan] = useState<boolean>(true);
  
  useEffect(() => {
    AdminService.getPlanStatus().then((status) => {
      setPlanStatus(status);
      setLoadingPlan(false);
    });
  }, []);
  
  const handleTogglePlan = async () => {
    setLoadingPlan(true);
    try {
      await AdminService.setPlanStatus(!planStatus);
      setPlanStatus(!planStatus);
    } catch (error) {
      // opcional: mostrar erro ao usuário
    }
    setLoadingPlan(false);
  };

  const handleLogout = async () => {
    try {
      await AuthService.logoutUser();
      navigate('/manager/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const menuItems = [
    {
      title: 'Dashboard',
      icon: BarChart3,
      path: '/manager/dashboard',
      description: 'Visão geral da plataforma'
    },
    {
      title: 'Usuários',
      icon: Users,
      path: '/manager/users',
      description: 'Gerenciar clientes e freelancers'
    },
    {
      title: 'Equipe',
      icon: Shield,
      path: '/manager/team',
      description: 'Gestores e moderadores'
    },
    {
      title: 'Chats',
      icon: MessageSquare,
      path: '/manager/chats',
      description: 'Moderação de conversas'
    },
    {
      title: 'Planos',
      icon: BarChart3,
      path: '/manager/plans',
      description: 'Gerenciar planos do Pagar.me'
    },
    {
      title: 'Freelancers em Destaque',
      icon: Star,
      path: '/manager/featured-freelancers',
      description: 'Selecionar freelancers para destaque'
    },
    {
      title: 'Suporte',
      icon: MessageSquare,
      path: '/manager/support',
      description: 'Gerenciar solicitações de suporte'
    }
  ];

  const isActive = (path: string) => {
    if (path === '/manager/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm md:hidden fixed top-0 left-0 right-0 z-50">
      {/* Mobile Menu Button */}
      <div className="md:hidden">
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="p-2"
              onClick={() => setIsDrawerOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
          </DrawerTrigger>
          
          <DrawerContent className="h-[85vh]">
            <DrawerHeader className="text-left border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">X</span>
                  </div>
                  <DrawerTitle className="text-lg font-semibold">Xjobs Admin</DrawerTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2"
                  onClick={() => setIsDrawerOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </DrawerHeader>
            
            <div className="p-4 space-y-4 flex-1 max-h-[calc(100dvh-200px)] overflow-y-auto">
              {/* User Profile Section */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    {userProfile?.role === 'manager' ? (
                      <Crown className="h-6 w-6 text-yellow-600" />
                    ) : (
                      <Shield className="h-6 w-6 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {userProfile?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {userProfile?.role === 'manager' ? 'Gestor' : 'Moderador'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="space-y-3">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        setIsDrawerOpen(false);
                      }}
                      className={`w-full text-left p-3 rounded-lg transition-colors font-medium flex items-center space-x-3 ${
                        active 
                          ? 'bg-blue-600 text-white' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <div>
                        <div className="font-medium">{item.title}</div>
                        <div className="text-xs opacity-75">{item.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 my-4"></div>

              {/* Settings and Logout */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    navigate('/manager/settings');
                    setIsDrawerOpen(false);
                  }}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors font-medium flex items-center space-x-3 text-gray-700"
                >
                  <Settings className="h-5 w-5" />
                  <span>Configurações</span>
                </button>
                
                {userProfile?.role === 'manager' && (
                  <button
                    onClick={() => {
                      navigate('/manager/team/new');
                      setIsDrawerOpen(false);
                    }}
                    className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors font-medium flex items-center space-x-3 text-gray-700"
                  >
                    <UserPlus className="h-5 w-5" />
                    <span>Adicionar Membro</span>
                  </button>
                )}
                
                {/* Plan Status Toggle */}
                <div className="p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Planos Freelancer</div>
                      <div className="text-xs text-gray-500">
                        {planStatus ? "Botão 'Meu Plano' ATIVO" : "Botão 'Meu Plano' INATIVO"}
                      </div>
                    </div>
                    <Switch
                      checked={planStatus}
                      disabled={loadingPlan}
                      onCheckedChange={handleTogglePlan}
                    />
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <div className="mt-auto pt-4">
                <Button 
                  variant="outline" 
                  className="w-full justify-center py-3 text-base text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => {
                    handleLogout();
                    setIsDrawerOpen(false);
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Logo/Title */}
      <div className="flex-1 flex justify-center">
        <h1 className="text-xl font-bold text-blue-600">Xjobs Admin</h1>
      </div>

      {/* User Profile Dropdown */}
      <div className="flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-gray-50 rounded-lg p-2 transition-colors">
            <Avatar className="h-8 w-8 border-2 border-gray-200">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-semibold">
                {getInitials(userProfile?.name || 'Admin')}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-48 bg-white shadow-lg border border-gray-200">
            <DropdownMenuLabel className="pb-2">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-gray-900">
                  {userProfile?.name}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {userProfile?.role === 'manager' ? 'Gestor' : 'Moderador'}
              </div>
            </DropdownMenuLabel>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={() => navigate('/manager/settings')}
              className="cursor-pointer flex items-center gap-2 py-2"
            >
              <Settings className="h-4 w-4" />
              <span>Configurações</span>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={handleLogout}
              className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 flex items-center gap-2 py-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default ManagerHeader;