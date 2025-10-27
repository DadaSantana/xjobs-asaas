
import { useState } from 'react';
import { useAppSelector } from '@/hooks/redux';
import { AuthService } from '@/services/authService';
import { useNavigate, Link } from 'react-router-dom';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, Search, Settings, User, LogOut, HelpCircle, Menu, X, Home, Plus, Briefcase, MessageSquare, Users, DollarSign, FileText, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import NotificationDropdown from "@/components/NotificationDropdown";
import GlobalSearchModal from "@/components/GlobalSearchModal";

const ClienteHeader = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const userProfile = useAppSelector(state => state.auth.userProfile);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await AuthService.logoutUser();
      navigate('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleProfileClick = () => {
    navigate('/cliente/meu-perfil');
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
    { title: "Visão Geral", url: "/cliente", icon: Home },
    { title: "Publicar Projeto", url: "/cliente/publicar-projeto", icon: Plus },
    { title: "Meus Projetos", url: "/cliente/meus-projetos", icon: Briefcase },
    { title: "Mensagens", url: "/cliente/mensagens", icon: MessageSquare },
    { title: "Freelancers", url: "/cliente/freelancers", icon: Users },
    { title: "Pagamentos", url: "/cliente/pagamentos", icon: DollarSign },
    { title: "Suporte", url: "/cliente/suporte", icon: HelpCircle },
  ];

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm md:relative fixed top-0 left-0 right-0 z-50">
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
                  <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">X</span>
                  </div>
                  <DrawerTitle className="text-lg font-semibold">Menu Cliente</DrawerTitle>
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
            
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              {/* Menu Items */}
              <div className="space-y-3">
                {menuItems.map((item) => (
                  <Link
                    key={item.title}
                    to={item.url}
                    onClick={() => setIsDrawerOpen(false)}
                    className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors font-medium flex items-center space-x-3 text-gray-700"
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </Link>
                ))}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 my-4"></div>

              {/* Additional Links */}
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    setIsDrawerOpen(false);
                    window.location.href = '/como-funciona';
                  }}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors font-medium flex items-center space-x-3 text-gray-700"
                >
                  <Info className="h-5 w-5" />
                  <span>Como funciona</span>
                </button>
                <button 
                  onClick={() => {
                    setIsDrawerOpen(false);
                    window.location.href = '/termos-condicoes';
                  }}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors font-medium flex items-center space-x-3 text-gray-700"
                >
                  <FileText className="h-5 w-5" />
                  <span>Termos e condições</span>
                </button>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 my-4"></div>

              {/* User Section */}
              <div className="space-y-3">
                <Link 
                  to="/cliente/meu-perfil" 
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors font-medium flex items-center space-x-3 text-gray-700"
                >
                  <User className="h-5 w-5" />
                  <span>Meu Perfil</span>
                </Link>
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

      {/* Search Bar */}
      <div className="flex-1 max-w-xl md:ml-0 ml-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar freelancers, meus projetos..."
            className="pl-10 pr-4 py-2 w-full border-gray-300 focus:border-green-500 focus:ring-green-500 cursor-pointer"
            onClick={() => setShowSearchModal(true)}
            readOnly
          />
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <NotificationDropdown />

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 transition-colors">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">
                {userProfile?.name}
              </p>
              <p className="text-xs text-gray-500">Cliente</p>
            </div>
            <Avatar className="h-10 w-10 border-2 border-gray-200">
              <AvatarFallback className="bg-gradient-to-br from-green-500 to-green-600 text-white text-sm font-semibold">
                {userProfile?.name ? getInitials(userProfile.name) : 'CL'}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-64 bg-white shadow-lg border border-gray-200">
            <DropdownMenuLabel className="pb-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                    {userProfile?.name ? getInitials(userProfile.name) : 'CL'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-900">{userProfile?.name}</p>
                  <p className="text-sm text-gray-500">{userProfile?.email}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={handleProfileClick}
              className="cursor-pointer flex items-center gap-2 py-2"
            >
              <User className="h-4 w-4" />
              <span>Meu Perfil</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem className="cursor-pointer flex items-center gap-2 py-2">
              <Settings className="h-4 w-4" />
              <span>Configurações</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem className="cursor-pointer flex items-center gap-2 py-2">
              <HelpCircle className="h-4 w-4" />
              <span>Ajuda & Suporte</span>
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

      {/* Modal de Busca Global */}
      <GlobalSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        userType="client"
        userId={userProfile?.uid}
      />
    </header>
  );
};

export default ClienteHeader;
