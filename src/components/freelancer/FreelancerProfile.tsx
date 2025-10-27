import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Star, 
  MapPin, 
  Phone, 
  Mail, 
  LinkedinIcon, 
  Calendar, 
  Award,
  ExternalLink,
  MessageCircle,
  Clock,
  X
} from 'lucide-react';
import { UserProfile, UserReview, PortfolioItem } from '@/types/user';
import { UserProfileService } from '@/services/userProfileService';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface FreelancerProfileProps {
  userId: string;
  isOwnProfile?: boolean;
  onContactClick?: () => void;
}

export const FreelancerProfile: React.FC<FreelancerProfileProps> = ({
  userId,
  isOwnProfile = false,
  onContactClick
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPortfolioItem, setSelectedPortfolioItem] = useState<PortfolioItem | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
    loadReviews();
  }, [userId]);

  const loadProfile = async () => {
    try {
      const profileData = await UserProfileService.getUserProfile(userId);
      setProfile(profileData);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar perfil do freelancer",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      const reviewsData = await UserProfileService.getUserReviews(userId);
      setReviews(reviewsData);
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const formatName = (fullName: string) => {
    const parts = fullName.split(' ');
    if (parts.length > 1) {
      return `${parts[0]} ${parts[parts.length - 1][0]}.`;
    }
    return fullName;
  };

  const getAvailabilityColor = (availability?: string) => {
    switch (availability) {
      case 'disponivel': return 'bg-green-500';
      case 'ocupado': return 'bg-yellow-500';
      case 'indisponivel': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getAvailabilityText = (availability?: string) => {
    switch (availability) {
      case 'disponivel': return 'Disponível';
      case 'ocupado': return 'Ocupado';
      case 'indisponivel': return 'Indisponível';
      default: return 'Status não informado';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Perfil não encontrado</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-2 sm:px-6 py-4 sm:py-6">
      {/* Header do Perfil */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            {/* Avatar e Info Básica */}
            <div className="flex flex-col items-center sm:items-start">
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 mb-3 sm:mb-4">
                <AvatarImage src={profile.profileImage} alt={profile.name} />
                <AvatarFallback className="text-base sm:text-lg">
                  {profile.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${getAvailabilityColor(profile.availability)}`}></div>
                <span className="text-xs sm:text-sm text-gray-600">{getAvailabilityText(profile.availability)}</span>
              </div>
            </div>

            {/* Informações Principais */}
            <div className="flex-1">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-4">
                <div className="text-center sm:text-left">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                    {isOwnProfile ? profile.name : formatName(profile.name)}
                  </h1>
                  
                  {profile.specialization && (
                    <p className="text-base sm:text-lg text-blue-600 font-medium mb-2">
                      {profile.specialization}
                    </p>
                  )}
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                    <div className="flex items-center justify-center sm:justify-start gap-1">
                      {renderStars(Math.round(profile.rating || 0))}
                      <span className="text-xs sm:text-sm text-gray-600 ml-1">
                        {profile.rating?.toFixed(1) || '0.0'} ({profile.ratingCount || 0} avaliações)
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {profile.location && (
                      <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span className="text-xs sm:text-sm">{profile.location}</span>
                      </div>
                    )}

                    {profile.hourlyRate && (
                      <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs sm:text-sm">R$ {profile.hourlyRate}/hora</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botões de Ação */}
                {!isOwnProfile && (
                  <div className="flex gap-2 mt-4 lg:mt-0 justify-center lg:justify-start">
                    <Button onClick={onContactClick} className="flex items-center gap-2 text-sm">
                      <MessageCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">Entrar em Contato</span>
                      <span className="sm:hidden">Contato</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Skills */}
              {profile.skills && Array.isArray(profile.skills) && profile.skills.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2 text-center sm:text-left">Habilidades:</h3>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    {profile.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Bio */}
              {profile.bio && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2 text-center sm:text-left">Sobre:</h3>
                  <p className="text-gray-600 text-sm leading-relaxed text-center sm:text-left">{profile.bio}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de Conteúdo */}
      <Tabs defaultValue="portfolio" className="w-full">
        <div className="w-full overflow-x-auto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="portfolio" className="text-xs sm:text-sm px-2 sm:px-4">Portfólio</TabsTrigger>
            <TabsTrigger value="reviews" className="text-xs sm:text-sm px-2 sm:px-4">Avaliações</TabsTrigger>
            <TabsTrigger value="certifications" className="text-xs sm:text-sm px-2 sm:px-4">Certificações</TabsTrigger>
          </TabsList>
        </div>

        {/* Portfólio */}
        <TabsContent value="portfolio" className="space-y-4">
          {profile.portfolio && Array.isArray(profile.portfolio) && profile.portfolio.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {profile.portfolio.map((item: PortfolioItem) => (
                <Card 
                  key={item.id} 
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200"
                  onClick={() => setSelectedPortfolioItem(item)}
                >
                  <div className="aspect-video bg-gray-100 relative">
                    {item.images && Array.isArray(item.images) && item.images.length > 0 ? (
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        Sem imagem
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3 sm:p-4">
                    <h3 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">{item.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-3">{item.description}</p>
                    
                    {item.technologies && Array.isArray(item.technologies) && item.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {item.technologies.slice(0, 4).map((tech, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                        {item.technologies.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{item.technologies.length - 4}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs text-gray-500">
                      <span>
                        {(() => {
                          try {
                            let date: Date;
                            if (item.completedAt && typeof item.completedAt === 'object' && 'toDate' in item.completedAt) {
                              // É um Timestamp do Firestore
                              date = (item.completedAt as any).toDate();
                            } else if (item.completedAt instanceof Date) {
                              // É um objeto Date
                              date = item.completedAt;
                            } else {
                              // É uma string ou outro formato
                              date = new Date(item.completedAt);
                            }
                            return date.toLocaleDateString('pt-BR');
                          } catch (error) {
                            console.error('Erro ao formatar data:', error, item.completedAt);
                            return 'Data inválida';
                          }
                        })()
                        }
                      </span>
                      {item.projectUrl && (
                        <a
                          href={item.projectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 self-start sm:self-auto"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Ver projeto
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <p>Nenhum item no portfólio ainda.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Avaliações */}
        <TabsContent value="reviews" className="space-y-4">
          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {review.reviewerName}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {review.reviewerType === 'client' ? 'Cliente' : 'Freelancer'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          {renderStars(review.rating)}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(review.createdAt.toDate()).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm">{review.comment}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <p>Nenhuma avaliação ainda.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Certificações */}
        <TabsContent value="certifications" className="space-y-4">
          {profile.certifications && Array.isArray(profile.certifications) && profile.certifications.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profile.certifications.map((cert) => (
                <Card key={cert.id}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      <Award className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 mb-1 text-sm sm:text-base truncate">{cert.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-600 mb-2 truncate">{cert.issuer}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          <span>
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
                                  date = new Date(cert.dateIssued);
                                }
                                return date.toLocaleDateString('pt-BR');
                              } catch (error) {
                                console.error('Erro ao formatar data da certificação:', error, cert.dateIssued);
                                return 'Data inválida';
                              }
                            })()
                            }
                          </span>
                        </div>
                        {cert.credentialUrl && (
                          <a
                            href={cert.credentialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Ver credencial
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <p>Nenhuma certificação cadastrada.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Estatísticas */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base sm:text-lg text-center sm:text-left">Estatísticas</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
            <div className="p-3 rounded-lg bg-blue-50">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                {profile.completedProjects || 0}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 mt-1">Projetos Concluídos</div>
            </div>
            <div className="p-3 rounded-lg bg-green-50">
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {profile.rating?.toFixed(1) || '0.0'}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 mt-1">Avaliação Média</div>
            </div>
            <div className="p-3 rounded-lg bg-purple-50">
              <div className="text-xl sm:text-2xl font-bold text-purple-600">
                {profile.ratingCount || 0}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 mt-1">Total de Avaliações</div>
            </div>
            <div className="p-3 rounded-lg bg-orange-50">
              <div className="text-xl sm:text-2xl font-bold text-orange-600">
                {profile.totalEarnings ? `R$ ${profile.totalEarnings.toLocaleString()}` : 'R$ 0'}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 mt-1">Ganhos Totais</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Detalhes do Portfólio */}
      <Dialog open={!!selectedPortfolioItem} onOpenChange={() => setSelectedPortfolioItem(null)}>
        <DialogContent className="w-[100dvw] h-[100dvh] max-w-none max-h-none md:max-w-4xl md:max-h-[90dvh] md:rounded-lg overflow-y-auto p-4 md:p-6">
          {selectedPortfolioItem && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">{selectedPortfolioItem.title}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Imagens do Projeto */}
                {selectedPortfolioItem.images && Array.isArray(selectedPortfolioItem.images) && selectedPortfolioItem.images.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Imagens do Projeto</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedPortfolioItem.images.map((image, index) => (
                        <div key={index} className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={image}
                            alt={`${selectedPortfolioItem.title} - Imagem ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vídeos do Projeto */}
                {selectedPortfolioItem.videos && Array.isArray(selectedPortfolioItem.videos) && selectedPortfolioItem.videos.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Vídeos do Projeto</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {selectedPortfolioItem.videos.map((video, index) => (
                        <div key={index} className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                          <video
                            src={video}
                            controls
                            className="w-full h-full"
                          >
                            Seu navegador não suporta vídeos.
                          </video>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Descrição */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Descrição</h3>
                  <p className="text-gray-700 leading-relaxed">{selectedPortfolioItem.description}</p>
                </div>

                {/* Tecnologias */}
                {selectedPortfolioItem.technologies && Array.isArray(selectedPortfolioItem.technologies) && selectedPortfolioItem.technologies.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Tecnologias Utilizadas</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedPortfolioItem.technologies.map((tech, index) => (
                        <Badge key={index} variant="outline" className="text-sm">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documentos */}
                {selectedPortfolioItem.documents && selectedPortfolioItem.documents.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Documentos do Projeto</h3>
                    <div className="grid gap-2">
                      {selectedPortfolioItem.documents.map((document, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">
                              {document.type.includes('pdf') ? '📄' : 
                               document.type.includes('word') || document.type.includes('document') ? '📝' : '📃'}
                            </span>
                            <div>
                              <p className="font-medium">{document.name}</p>
                              <p className="text-sm text-gray-500">
                                {(document.size / 1024).toFixed(0)} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(document.url, '_blank')}
                          >
                            Visualizar
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Informações do Projeto */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Data de Conclusão</h4>
                    <p className="text-gray-600">
                      {(() => {
                        try {
                          let date: Date;
                          if (selectedPortfolioItem.completedAt && typeof selectedPortfolioItem.completedAt === 'object' && 'toDate' in selectedPortfolioItem.completedAt) {
                            date = (selectedPortfolioItem.completedAt as any).toDate();
                          } else if (selectedPortfolioItem.completedAt instanceof Date) {
                            date = selectedPortfolioItem.completedAt;
                          } else {
                            date = new Date(selectedPortfolioItem.completedAt);
                          }
                          return date.toLocaleDateString('pt-BR');
                        } catch (error) {
                          console.error('Erro ao formatar data:', error, selectedPortfolioItem.completedAt);
                          return 'Data inválida';
                        }
                      })()
                      }
                    </p>
                  </div>
                  
                  {selectedPortfolioItem.projectUrl && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Link do Projeto</h4>
                      <a
                        href={selectedPortfolioItem.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Visualizar Projeto
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};