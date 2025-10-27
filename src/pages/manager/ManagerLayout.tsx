import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { useAppSelector } from '@/hooks/redux';
import { AuthService } from '@/services/authService';
import {
  Users,
  UserPlus,
  Settings,
  LogOut,
  Shield,
  Crown,
  MessageSquare,
  BarChart3,
  Menu,
  X,
  Star,
  Briefcase
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminService } from '@/services/adminService';
import { Switch } from '@/components/ui/switch';
import ManagerHeader from '@/components/manager/ManagerHeader';

const ManagerLayout = () => {
  const userProfile = useAppSelector(state => state.auth.userProfile);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  const menuItems = [
    {
      title: 'Dashboard',
      icon: BarChart3,
      path: '/manager/dashboard'
    },
    {
      title: 'Usuários',
      icon: Users,
      path: '/manager/users'
    },
    {
      title: 'Projetos',
      icon: Briefcase,
      path: '/manager/projects'
    },
    {
      title: 'Equipe',
      icon: Shield,
      path: '/manager/team'
    },
    {
      title: 'Chats',
      icon: MessageSquare,
      path: '/manager/chats'
    },
    {
      title: 'Planos',
      icon: BarChart3,
      path: '/manager/plans'
    },
    {
      title: 'Freelancers em Destaque',
      icon: Star,
      path: '/manager/featured-freelancers'
    },
    {
      title: 'Suporte',
      icon: MessageSquare,
      path: '/manager/support'
    }
  ];

  const isActive = (path: string) => {
    if (path === '/manager/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <ManagerHeader />
      
      {/* Sidebar - Hidden on mobile */}
      <div className={cn(
        "fixed left-0 top-0 h-screen bg-white shadow-lg transition-all duration-300 ease-in-out flex flex-col z-40 hidden md:flex",
        sidebarOpen ? "w-64" : "w-16"
      )}>
        {/* Header do Sidebar */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-blue-600">Xjobs Admin</h1>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2"
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Perfil do usuário */}
        {sidebarOpen && (
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                {userProfile?.role === 'manager' ? (
                  <Crown className="h-5 w-5 text-yellow-600" />
                ) : (
                  <Shield className="h-5 w-5 text-blue-600" />
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
        )}

        {/* Menu de navegação */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Button
                  key={item.path}
                  variant={active ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start h-auto p-3",
                    sidebarOpen ? "flex-row" : "flex-col",
                    active && "bg-blue-600 text-white hover:bg-blue-700"
                  )}
                  onClick={() => navigate(item.path)}
                >
                  <Icon className={cn(
                    "h-5 w-5",
                    sidebarOpen ? "mr-3" : "mb-1"
                  )} />
                  {sidebarOpen && (
                    <div className="text-left">
                      <div className="font-medium">{item.title}</div>
                    </div>
                  )}
                  {!sidebarOpen && (
                    <div className="text-xs">{item.title}</div>
                  )}
                </Button>
              );
            })}
          </div>
        </nav>

        {/* Footer do Sidebar */}
        <div className="p-4 border-t border-gray-200">
          <div className="space-y-2">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start",
                sidebarOpen ? "flex-row" : "flex-col"
              )}
              onClick={() => navigate('/manager/settings')}
            >
              <Settings className={cn(
                "h-4 w-4",
                sidebarOpen ? "mr-2" : "mb-1"
              )} />
              {sidebarOpen ? "Configurações" : "Config"}
            </Button>
            <div className={cn("w-full flex items-center", sidebarOpen ? "flex-row" : "flex-col")}>
              <Switch
                checked={planStatus}
                disabled={loadingPlan}
                onCheckedChange={handleTogglePlan}
                className="mb-2"
              />
              <span className="ml-2 text-sm">{planStatus ? "Botão 'Meu Plano' do Freelancer ATIVO" : "Botão 'Meu Plano' do Freelancer INATIVO"}</span>
            </div>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50",
                sidebarOpen ? "flex-row" : "flex-col"
              )}
              onClick={handleLogout}
            >
              <LogOut className={cn(
                "h-4 w-4",
                sidebarOpen ? "mr-2" : "mb-1"
              )} />
              {sidebarOpen ? "Sair" : "Sair"}
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 h-screen transition-all duration-300 ease-in-out",
        "pt-16 md:pt-0", // Padding top para mobile header
        sidebarOpen ? "md:ml-64" : "md:ml-16" // Margin left apenas no desktop
      )}>
        <Outlet />
      </div>
    </div>
  );
};

export default ManagerLayout;