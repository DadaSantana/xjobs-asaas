
import { useAppSelector } from '@/hooks/redux';
import { Button } from '@/components/ui/button';
import { AuthService } from '@/services/authService';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const DashboardCliente = () => {
  const userProfile = useAppSelector(state => state.auth.userProfile);
  const navigate = useNavigate();

  useEffect(() => {
    // Redireciona para o novo layout do cliente
    if (userProfile?.role === 'client') {
      navigate('/cliente');
    } else if (userProfile?.role === 'freelancer') {
      navigate('/freelancer');
    }
  }, [userProfile, navigate]);

  const handleLogout = async () => {
    try {
      await AuthService.logoutUser();
      navigate('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Redirecionando...
              </h1>
              <p className="text-gray-600 mt-2">
                Você será redirecionado para o painel adequado ao seu perfil.
              </p>
            </div>
            <Button onClick={handleLogout} variant="outline">
              Sair
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCliente;
