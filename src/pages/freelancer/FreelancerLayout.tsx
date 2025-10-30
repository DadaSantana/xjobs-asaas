import { Routes, Route, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import FreelancerSidebar from '@/components/freelancer/FreelancerSidebar';
import FreelancerHeader from '@/components/freelancer/FreelancerHeader';
import RecipientCheckWrapper from '@/components/RecipientCheckWrapper';
import VisaoGeral from './VisaoGeral';
import EncontreTrabalho from './EncontreTrabalho';
import MeusProjetos from './MeusProjetos';
import MinhasFinancas from './MinhasFinancas';
import MeusPlanos from './MeusPlanos';
import Suporte from './Suporte';
import Mensagens from './Mensagens';
import MeuPerfil from './MeuPerfil';
import AdvanceManagement from './AdvanceManagement';
import AdvanceHistory from './AdvanceHistory';
import { useAppSelector } from '@/hooks/redux';
import Avaliar from '../Avaliar';
import DetalheProjetoFreelancer from './DetalheProjeto';

const FreelancerLayout = () => {
  console.log('FreelancerLayout renderizado');
  const { isLoading, isAuthenticated } = useAppSelector((s) => s.auth);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMessagesRoute = location.pathname.includes('/mensagens');
  
  // Verificar se deve redirecionar para aba de planos
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'planos' && location.pathname === '/freelancer') {
      console.log('Redirecionando para /freelancer/meus-planos');
      navigate('/freelancer/meus-planos', { replace: true });
    }
  }, [searchParams, location.pathname, navigate]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Sessão expirada. Faça login novamente.</p>
          <a href="/login" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Ir para Login</a>
        </div>
      </div>
    );
  }
  
  return (
    <RecipientCheckWrapper 
      showRecipientModal={showRecipientModal}
      onCloseRecipientModal={() => setShowRecipientModal(false)}
    >
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <FreelancerSidebar onRequestRecipientSetup={() => setShowRecipientModal(true)} />
          <div className="flex-1 flex flex-col w-full md:w-auto">
            <FreelancerHeader />
            <main className={`flex-1 bg-gray-50 overflow-y-auto md:mt-0 mt-16 ${isMessagesRoute ? '' : 'px-6 py-6 md:p-6'}`}>
              <div className={isMessagesRoute ? '' : 'max-w-7xl mx-auto'}>
                <Routes>
                  <Route path="/" element={<VisaoGeral />} />
                  <Route path="/encontre-trabalho" element={<EncontreTrabalho />} />
                  <Route path="/projeto/:projectId" element={<DetalheProjetoFreelancer />} />
                  <Route path="/meus-projetos" element={<MeusProjetos />} />
                  <Route path="/avaliar" element={<Avaliar />} />
                  <Route path="/mensagens" element={<Mensagens />} />
                  <Route path="/minhas-financas" element={<MinhasFinancas />} />
                  <Route path="/adiantamentos" element={<AdvanceManagement />} />
                  <Route path="/historico-adiantamentos" element={<AdvanceHistory />} />
                  <Route path="/meus-planos" element={<MeusPlanos />} />
                  <Route path="/meu-perfil" element={<MeuPerfil />} />
                  <Route path="/suporte" element={<Suporte />} />
                </Routes>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </RecipientCheckWrapper>
  );
};

export default FreelancerLayout;
