
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DashboardFreelancer = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirecionar para a nova rota do freelancer
    navigate('/freelancer', { replace: true });
  }, [navigate]);

  return null;
};

export default DashboardFreelancer;
