import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store/store';
import { useAuthWithPresence } from './hooks/useAuth';
import Index from "./pages/Index";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import NotFound from "./pages/NotFound";
import DashboardCliente from "./pages/DashboardCliente";
import FreelancerLayout from "./pages/freelancer/FreelancerLayout";
import ClienteLayout from "./pages/cliente/ClienteLayout";
import PublicPortfolio from "./pages/PublicPortfolio";
import FloatingChat from "./components/FloatingChat";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import ManagerLogin from "./pages/ManagerLogin";
import ManagerLayout from "./pages/manager/ManagerLayout";
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import ManagerUsers from "./pages/manager/ManagerUsers";
import ManagerUserDetail from "./pages/manager/ManagerUserDetail";
import ManagerTeam from "./pages/manager/ManagerTeam";
import CreateTeamMember from "./pages/manager/CreateTeamMember";
import ManagerChats from "./pages/manager/ManagerChats";
import ManagerPlans from "./pages/manager/ManagerPlans";
import ManagerFeaturedFreelancers from "./pages/manager/ManagerFeaturedFreelancers";
import ManagerSupport from "./pages/manager/ManagerSupport";
import ManagerProjects from "./pages/manager/ManagerProjects";
import ManagerProjectDetail from "./pages/manager/ManagerProjectDetail";
import Avaliar from "./pages/Avaliar";
import ComoFunciona from "./pages/ComoFunciona";
import TermosCondicoes from "./pages/TermosCondicoes";

const queryClient = new QueryClient();

const AppContent = () => {
  useAuthWithPresence();
  const location = useLocation();

  console.log('AppContent renderizado');

  // Reset scroll to top on route change (disabled for problematic routes)
  useEffect(() => {
    // Completely disable scroll reset for these routes to prevent interference
    const isProblematicRoute = location.pathname.includes('/publicar-projeto') || 
                              location.pathname.includes('/mensagens') ||
                              location.pathname.includes('/chat');
    
    if (!isProblematicRoute) {
      // Only for safe routes, reset scroll immediately without delays
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [location.pathname]);

  // Verificar se estamos em uma rota que deve mostrar o FloatingChat
  const shouldShowFloatingChat = (location.pathname.startsWith('/freelancer') ||
    location.pathname.startsWith('/cliente') ||
    location.pathname === '/dashboard-cliente' ||
    location.pathname === '/dashboard-freelancer') &&
    !location.pathname.includes('/mensagens');

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/esqueci-senha" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard-cliente" element={<DashboardCliente />} />
        <Route path="/freelancer/*" element={<FreelancerLayout />} />
        <Route path="/cliente/*" element={<ClienteLayout />} />
        <Route path="/portfolio/:freelancerId" element={<PublicPortfolio />} />
        <Route path="/dashboard-freelancer" element={<DashboardCliente />} />
        <Route path="/avaliar" element={<Avaliar />} />
        <Route path="/como-funciona" element={<ComoFunciona />} />
        <Route path="/termos-condicoes" element={<TermosCondicoes />} />
        
        
        {/* Rotas administrativas */}
        <Route path="/manager/login" element={<ManagerLogin />} />
        <Route path="/manager/*" element={<ManagerLayout />}>
          <Route path="dashboard" element={<ManagerDashboard />} />
            <Route path="users" element={<ManagerUsers />} />
            <Route path="user/:id" element={<ManagerUserDetail />} />
            <Route path="team" element={<ManagerTeam />} />
          <Route path="team/new" element={<CreateTeamMember />} />
          <Route path="chats" element={<ManagerChats />} />
          <Route path="plans" element={<ManagerPlans />} />
          <Route path="projects" element={<ManagerProjects />} />
          <Route path="projects/:id" element={<ManagerProjectDetail />} />
          <Route path="featured-freelancers" element={<ManagerFeaturedFreelancers />} />
          <Route path="support" element={<ManagerSupport />} />
        </Route>
        
        {/* Rota adicional para compatibilidade com notificações */}
        <Route path="/admin/user/:id" element={<ManagerLayout />}>
          <Route index element={<ManagerUserDetail />} />
        </Route>
        
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      {shouldShowFloatingChat && <FloatingChat />}
    </>
  );
};

const App = () => {
  console.log('App iniciado');

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;
