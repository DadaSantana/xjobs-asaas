import { useState, useEffect } from 'react';
import { useAppSelector } from '@/hooks/redux';
import { EditProfileForm } from '@/components/EditProfileForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Edit, Eye, MapPin, Phone, Mail, Building2, Users, Briefcase } from 'lucide-react';
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

  const getCompanySizeText = (size?: string) => {
    switch (size) {
      case 'startup': return 'Startup';
      case 'pequena': return 'Pequena (1-50 funcionários)';
      case 'media': return 'Média (51-250 funcionários)';
      case 'grande': return 'Grande (250+ funcionários)';
      default: return 'Não informado';
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
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
        <Button
          onClick={() => setIsEditing(!isEditing)}
          variant={isEditing ? "outline" : "default"}
          className="flex items-center gap-2"
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <EditProfileForm 
            userProfile={userProfile} 
            onProfileUpdate={(updatedProfile) => {
              setUserProfile(updatedProfile);
              setIsEditing(false);
            }} 
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex flex-col items-center md:items-start">
                  <Avatar className="w-24 h-24 mb-4">
                    <AvatarImage src={userProfile.profileImage} alt={userProfile.name} />
                    <AvatarFallback className="text-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
                      {userProfile.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {userProfile.name}
                  </h2>
                  
                  <div className="space-y-2 text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{userProfile.email}</span>
                    </div>
                    
                    {userProfile.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{userProfile.phone}</span>
                      </div>
                    )}
                    
                    {userProfile.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{userProfile.location}</span>
                      </div>
                    )}
                  </div>

                  {userProfile.bio && (
                    <div className="mt-4">
                      <h3 className="font-medium text-gray-700 mb-2">Sobre:</h3>
                      <p className="text-gray-600">{userProfile.bio}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações da Empresa */}
          <Card>
            <CardHeader>
              <CardTitle>Informações da Empresa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-700">Nome da Empresa</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-900">
                      {userProfile.companyName || 'Não informado'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Tamanho da Empresa</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-900">
                      {getCompanySizeText(userProfile.companySize)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Setor</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Briefcase className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-900">
                      {userProfile.industry || 'Não informado'}
                    </span>
                  </div>
                </div>

                {userProfile.cnpj && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">CNPJ</label>
                    <div className="mt-1">
                      <span className="text-gray-900">{userProfile.cnpj}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas */}
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {userProfile.completedProjects || 0}
                  </div>
                  <div className="text-sm text-gray-500">Projetos Concluídos</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    R$ {userProfile.totalSpent?.toLocaleString('pt-BR') || '0,00'}
                  </div>
                  <div className="text-sm text-gray-500">Total Investido</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {userProfile.rating?.toFixed(1) || '0.0'}
                  </div>
                  <div className="text-sm text-gray-500">
                    Avaliação ({userProfile.ratingCount || 0} avaliações)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MeuPerfil; 