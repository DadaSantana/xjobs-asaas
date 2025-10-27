import { useState, useEffect } from 'react';
import { useAppSelector } from '@/hooks/redux';
import { FreelancerProfile } from '@/components/freelancer/FreelancerProfile';
import { EditProfileForm } from '@/components/EditProfileForm';
import { Button } from '@/components/ui/button';
import { Edit, Eye } from 'lucide-react';
import { UserProfile } from '@/types/user';
import { UserProfileService } from '@/services/userProfileService';

const MeuPerfil = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const serializedProfile = useAppSelector(state => state.auth.userProfile);

  useEffect(() => {
    if (serializedProfile?.uid) {
      loadUserProfile();
    }
  }, [serializedProfile?.uid]);

  const loadUserProfile = async () => {
    if (!serializedProfile?.uid) return;
    
    try {
      const profile = await UserProfileService.getUserProfile(serializedProfile.uid);
      setUserProfile(profile);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-gray-500">Carregando perfil...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Meu Perfil</h1>
        <Button
          onClick={() => setIsEditing(!isEditing)}
          variant={isEditing ? "outline" : "default"}
          className="flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          {isEditing ? (
            <>
              <Eye className="h-4 w-4" />
              Ver Perfil
            </>
          ) : (
            <>
              <Edit className="h-4 w-4" />
              Editar Perfil
            </>
          )}
        </Button>
      </div>

      {isEditing ? (
        <EditProfileForm 
          userProfile={userProfile} 
          onProfileUpdate={(updatedProfile) => {
            setUserProfile(updatedProfile);
            setIsEditing(false);
          }} 
        />
      ) : (
        <FreelancerProfile userId={userProfile.uid} isOwnProfile={true} />
      )}
    </div>
  );
};

export default MeuPerfil;