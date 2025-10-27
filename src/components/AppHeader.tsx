import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Home, User, Briefcase, MessageCircle, Settings } from "lucide-react";

interface AppHeaderProps {
  showMenuItems?: boolean;
  title?: string;
  variant?: "landing" | "dashboard";
}

const AppHeader = ({ showMenuItems = true, title = "Xjobs", variant = "landing" }: AppHeaderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
    setIsOpen(false);
  };

  const landingMenuItems = [
    { id: 'features', label: 'Recursos', icon: <Briefcase className="h-4 w-4" /> },
    { id: 'freelancer-steps', label: 'Para Freelancers', icon: <User className="h-4 w-4" /> },
    { id: 'client-steps', label: 'Para Clientes', icon: <User className="h-4 w-4" /> },
    { id: 'featured-freelancers', label: 'Freelancers', icon: <Briefcase className="h-4 w-4" /> },
  ];

  const dashboardMenuItems = [
    { href: '/', label: 'Início', icon: <Home className="h-4 w-4" /> },
    { href: '/profile', label: 'Perfil', icon: <User className="h-4 w-4" /> },
    { href: '/messages', label: 'Mensagens', icon: <MessageCircle className="h-4 w-4" /> },
    { href: '/settings', label: 'Configurações', icon: <Settings className="h-4 w-4" /> },
  ];

  const menuItems = variant === "landing" ? landingMenuItems : dashboardMenuItems;

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <h1 className="text-xl font-bold text-gray-800">{title}</h1>
          </Link>

          {/* Menu Button */}
          {showMenuItems && (
            <Drawer open={isOpen} onOpenChange={setIsOpen}>
              <DrawerTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2"
                  onClick={() => setIsOpen(true)}
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </DrawerTrigger>
              
              <DrawerContent className="h-[85vh]">
                <DrawerHeader className="text-left border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <DrawerTitle className="text-lg font-semibold">Menu</DrawerTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2"
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </DrawerHeader>
                
                <div className="p-4 space-y-4 flex-1">
                  {/* Menu Items */}
                  <div className="space-y-3">
                    {variant === "landing" ? (
                      // Landing page menu items
                      landingMenuItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => scrollToSection(item.id)}
                          className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-700 font-medium flex items-center space-x-3"
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </button>
                      ))
                    ) : (
                      // Dashboard menu items
                      dashboardMenuItems.map((item) => (
                        <Link
                          key={item.href}
                          to={item.href}
                          onClick={() => setIsOpen(false)}
                          className={`w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors font-medium flex items-center space-x-3 ${
                            location.pathname === item.href ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                          }`}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </Link>
                      ))
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200 my-4"></div>

                  {/* Auth Buttons - Only show on landing pages */}
                  {variant === "landing" && (
                    <div className="space-y-3">
                      <Button 
                        variant="outline" 
                        className="w-full justify-center py-3 text-base"
                        onClick={() => {
                          setIsOpen(false);
                          window.location.href = '/login';
                        }}
                      >
                        Login
                      </Button>
                      
                      <Button 
                        className="w-full justify-center py-3 text-base bg-blue-600 hover:bg-blue-700"
                        onClick={() => {
                          setIsOpen(false);
                          window.location.href = '/cadastro';
                        }}
                      >
                        CADASTRE-SE
                      </Button>
                    </div>
                  )}

                  {/* Dashboard logout */}
                  {variant === "dashboard" && (
                    <div className="mt-auto pt-4">
                      <Button 
                        variant="outline" 
                        className="w-full justify-center py-3 text-base text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => {
                          // Add logout logic here
                          setIsOpen(false);
                        }}
                      >
                        Sair
                      </Button>
                    </div>
                  )}
                </div>
              </DrawerContent>
            </Drawer>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;