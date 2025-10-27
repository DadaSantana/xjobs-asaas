import { Routes, Route, useLocation } from 'react-router-dom';
import { SidebarProvider } from "@/components/ui/sidebar";
import ClienteSidebar from '@/components/cliente/ClienteSidebar';
import ClienteHeader from '@/components/cliente/ClienteHeader';
import VisaoGeral from './VisaoGeral';
import PublicarProjeto from './PublicarProjeto';
import MeusProjetos from './MeusProjetos';
import DetalheProjeto from './DetalheProjeto';
import Freelancers from './Freelancers';
import Pagamentos from './Pagamentos';
import Pagamento from './Pagamento';
import Suporte from './Suporte';
import Mensagens from './Mensagens';
import MeuPerfil from './MeuPerfil';
import Avaliar from '../Avaliar';

const ClienteLayout = () => {
  console.log('ClienteLayout renderizado');
  const location = useLocation();
  const isMessagesRoute = location.pathname.includes('/mensagens');
  const isPublicarProjetoRoute = location.pathname.includes('/publicar-projeto');
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ClienteSidebar />
        <div className="flex-1 flex flex-col">
          <ClienteHeader />
          <main className={`flex-1 bg-gray-50 md:mt-0 mt-16 ${isMessagesRoute || isPublicarProjetoRoute ? '' : 'p-6'}`}>
            <Routes>
              <Route path="/" element={<VisaoGeral />} />
              <Route path="/publicar-projeto" element={<PublicarProjeto />} />
              <Route path="/meus-projetos" element={<MeusProjetos />} />
              <Route path="/projeto/:projectId" element={<DetalheProjeto />} />
              <Route path="/avaliar" element={<Avaliar />} />
              <Route path="/mensagens" element={<Mensagens />} />
              <Route path="/freelancers" element={<Freelancers />} />
              <Route path="/pagamentos" element={<Pagamentos />} />
              <Route path="/meu-perfil" element={<MeuPerfil />} />
              <Route path="/suporte" element={<Suporte />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ClienteLayout;
