import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Phone, 
  Linkedin, 
  Star, 
  Calendar, 
  DollarSign,
  Building,
  Users,
  Award,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { UserProfile } from '@/types/user';
import { UserProfileService } from '@/services/userProfileService';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userRole: 'client' | 'freelancer';
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  userRole
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      loadProfile();
    }
  }, [isOpen, userId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const userProfile = await UserProfileService.getUserProfile(userId);
      setProfile(userProfile);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatRating = (rating: number) => {
    return rating ? rating.toFixed(1) : '0.0';
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'disponivel': return 'text-green-600 bg-green-100';
      case 'ocupado': return 'text-yellow-600 bg-yellow-100';
      case 'indisponivel': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAvailabilityText = (availability: string) => {
    switch (availability) {
      case 'disponivel': return 'Disponível';
      case 'ocupado': return 'Ocupado';
      case 'indisponivel': return 'Indisponível';
      default: return 'Não informado';
    }
  };

  const getExperienceText = (experience: string) => {
    switch (experience) {
      case 'iniciante': return 'Iniciante';
      case 'intermediario': return 'Intermediário';
      case 'avancado': return 'Avançado';
      default: return 'Não informado';
    }
  };

  const getCompanySizeText = (size: string) => {
    switch (size) {
      case 'startup': return 'Startup';
      case 'pequena': return 'Pequena (1-50 funcionários)';
      case 'media': return 'Média (51-500 funcionários)';
      case 'grande': return 'Grande (500+ funcionários)';
      default: return 'Não informado';
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[100dvw] h-[100dvh] max-w-none max-h-none md:max-w-4xl md:max-h-[90dvh] md:rounded-lg overflow-y-auto p-0 flex flex-col">
        <DialogHeader className="p-4 md:p-6 border-b">
          <DialogTitle>Perfil de {userName}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Carregando perfil...</span>
            </div>
          ) : profile ? (
            <div className="space-y-6">
            {/* Cabeçalho do Perfil */}
            <div className="flex items-start gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={profile.profileImage} alt={profile.name} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {profile.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900">{profile.name}</h2>
                  <Badge variant={userRole === 'freelancer' ? 'default' : 'secondary'}>
                    {userRole === 'freelancer' ? 'Freelancer' : 'Cliente'}
                  </Badge>
                </div>
                
                {profile.bio && (
                  <p className="text-gray-600 mb-3">{profile.bio}</p>
                )}
                
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {profile.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {profile.location}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    {formatRating(profile.rating)} ({profile.ratingCount || 0} avaliações)
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Membro desde {(() => {
                      try {
                        let date: Date;
                        if (profile.createdAt && typeof profile.createdAt === 'object' && 'toDate' in profile.createdAt) {
                          // É um Timestamp do Firestore
                          date = (profile.createdAt as any).toDate();
                        } else if (profile.createdAt instanceof Date) {
                          // É um objeto Date
                          date = profile.createdAt;
                        } else {
                          // É uma string ou outro formato
                          date = new Date(profile.createdAt as unknown as string | number);
                        }
                        return date.toLocaleDateString('pt-BR');
                      } catch (error) {
                        console.error('Erro ao formatar data de criação:', error, profile.createdAt);
                        return 'Data inválida';
                      }
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Conteúdo específico por tipo de usuário */}
            {userRole === 'freelancer' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Informações Profissionais */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Informações Profissionais</h3>
                    <div className="space-y-3">
                      {profile.specialization && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Especialização:</span>
                          <p className="text-gray-900">{profile.specialization}</p>
                        </div>
                      )}
                      
                      {profile.experience && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Experiência:</span>
                          <p className="text-gray-900">{getExperienceText(profile.experience)}</p>
                        </div>
                      )}
                      
                      {profile.hourlyRate && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Valor por hora:</span>
                          <p className="text-gray-900 flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            R$ {profile.hourlyRate}/hora
                          </p>
                        </div>
                      )}
                      
                      {profile.availability && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Disponibilidade:</span>
                          <Badge className={`${getAvailabilityColor(profile.availability)} text-xs`}>
                            {getAvailabilityText(profile.availability)}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Estatísticas */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Estatísticas</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Projetos concluídos:</span>
                        <p className="text-2xl font-bold text-blue-600">{profile.completedProjects || 0}</p>
                      </div>
                      
                      <div>
                        <span className="text-sm font-medium text-gray-500">Total ganho:</span>
                        <p className="text-2xl font-bold text-green-600">
                          R$ {(profile.totalEarnings || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Habilidades */}
                {profile.skills && profile.skills.length > 0 && (
                  <Card className="lg:col-span-2">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold mb-4">Habilidades</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.skills.map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-sm">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Portfólio */}
                {profile.portfolio && profile.portfolio.length > 0 && (
                  <Card className="lg:col-span-2">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold mb-4">Portfólio Recente</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {profile.portfolio.slice(0, 4).map((item) => (
                          <div key={item.id} className="border rounded-lg p-4">
                            {(item.coverImage || (item.images && item.images.length > 0)) && (
                              <img
                                src={item.coverImage || item.images?.[0]}
                                alt={item.title}
                                className="w-full h-32 object-cover rounded mb-3"
                              />
                            )}
                            <h4 className="font-medium mb-1">{item.title}</h4>
                            <p className="text-sm text-gray-600 mb-2" style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}>
                              {item.description}
                            </p>
                            {item.projectUrl && (
                              <a
                                href={item.projectUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                              >
                                Ver projeto <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Certificações */}
                {profile.certifications && profile.certifications.length > 0 && (
                  <Card className="lg:col-span-2">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold mb-4">Certificações</h3>
                      <div className="space-y-3">
                        {profile.certifications.slice(0, 3).map((cert) => (
                          <div key={cert.id} className="flex items-center gap-3 p-3 border rounded-lg">
                            {cert.imageUrl && (
                              <img
                                src={cert.imageUrl}
                                alt={cert.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <h4 className="font-medium">{cert.name}</h4>
                              <p className="text-sm text-gray-600">{cert.issuer}</p>
                              <p className="text-xs text-gray-500">
                                {(() => {
                                  try {
                                    let date: Date;
                                    if (cert.dateIssued && typeof cert.dateIssued === 'object' && 'toDate' in cert.dateIssued) {
                                      // É um Timestamp do Firestore
                                      date = (cert.dateIssued as any).toDate();
                                    } else if (cert.dateIssued instanceof Date) {
                                      // É um objeto Date
                                      date = cert.dateIssued;
                                    } else {
                                      // É uma string ou outro formato
                                      date = new Date(cert.dateIssued as unknown as string | number);
                                    }
                                    return date.toLocaleDateString('pt-BR');
                                  } catch (error) {
                                    console.error('Erro ao formatar data da certificação:', error, cert.dateIssued);
                                    return 'Data inválida';
                                  }
                                })()
                                }
                              </p>
                            </div>
                            {cert.credentialUrl && (
                              <Button variant="ghost" size="sm" asChild>
                                <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              /* Perfil de Cliente */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Informações da Empresa */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Informações da Empresa</h3>
                    <div className="space-y-3">
                      {profile.companyName && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Empresa:</span>
                          <p className="text-gray-900 flex items-center gap-1">
                            <Building className="w-4 h-4" />
                            {profile.companyName}
                          </p>
                        </div>
                      )}
                      
                      {profile.industry && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Setor:</span>
                          <p className="text-gray-900">{profile.industry}</p>
                        </div>
                      )}
                      
                      {profile.companySize && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Tamanho da empresa:</span>
                          <p className="text-gray-900 flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {getCompanySizeText(profile.companySize)}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Estatísticas do Cliente */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Estatísticas</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Projetos publicados:</span>
                        <p className="text-2xl font-bold text-blue-600">{profile.completedProjects || 0}</p>
                      </div>
                      
                      <div>
                        <span className="text-sm font-medium text-gray-500">Total investido:</span>
                        <p className="text-2xl font-bold text-green-600">
                          R$ {(profile.totalSpent || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Informações de Contato */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Contato</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-900">{profile.phone}</span>
                    </div>
                  )}
                  
                  {profile.linkedInUrl && (
                    <div className="flex items-center gap-2">
                      <Linkedin className="w-4 h-4 text-gray-500" />
                      <a 
                        href={profile.linkedInUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        LinkedIn
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Não foi possível carregar o perfil.</p>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
};