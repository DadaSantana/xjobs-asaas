import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Star, 
  MapPin, 
  Calendar, 
  ExternalLink, 
  Mail, 
  Phone,
  ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UserProfileService } from "@/services/userProfileService";
import { UserProfile } from "@/types/user";

const PublicPortfolio = () => {
  const { freelancerId } = useParams<{ freelancerId: string }>();
  const { toast } = useToast();
  const [freelancer, setFreelancer] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (freelancerId) {
      loadFreelancerProfile();
    }
  }, [freelancerId]);

  const loadFreelancerProfile = async () => {
    try {
      setIsLoading(true);
      if (!freelancerId) return;
      
      const profile = await UserProfileService.getUserProfile(freelancerId);
      if (!profile) {
        toast({
          title: "Erro",
          description: "Freelancer não encontrado",
          variant: "destructive",
        });
        return;
      }
      setFreelancer(profile);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar perfil do freelancer",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? "text-yellow-400 fill-current" : "text-gray-300"
        }`}
      />
    ));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  if (!freelancer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Freelancer não encontrado
          </h1>
          <Button onClick={() => window.history.back()} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button 
            onClick={() => window.history.back()} 
            variant="ghost" 
            size="sm"
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <Avatar className="w-24 h-24">
              <AvatarImage src={freelancer.profileImage} alt={freelancer.name} />
              <AvatarFallback className="text-xl">
                {freelancer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {freelancer.name}
              </h1>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  {renderStars(Math.round(freelancer.rating || 0))}
                                     <span className="ml-2 text-gray-600">
                     {freelancer.rating?.toFixed(1) || '0.0'} • {freelancer.ratingCount || 0} avaliações
                   </span>
                </div>
              </div>

              {freelancer.location && (
                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <MapPin className="w-4 h-4" />
                  <span>{freelancer.location}</span>
                </div>
              )}

              {freelancer.bio && (
                <p className="text-gray-700 leading-relaxed">
                  {freelancer.bio}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Habilidades */}
            {Array.isArray(freelancer.skills) && freelancer.skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Habilidades</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {freelancer.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}



            {/* Portfólio */}
            {Array.isArray(freelancer.portfolio) && freelancer.portfolio.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Portfólio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {freelancer.portfolio.map((project, index) => (
                      <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        {project.coverImage && (
                          <img
                            src={project.coverImage}
                            alt={project.title}
                            className="w-full h-48 object-cover rounded-lg mb-4"
                          />
                        )}
                        <h3 className="text-lg font-semibold mb-2">{project.title}</h3>
                        <p className="text-gray-600 text-sm mb-4">{project.description}</p>
                        {project.projectUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(project.projectUrl, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Ver Projeto
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Certificações */}
            {Array.isArray(freelancer.certifications) && freelancer.certifications.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Certificações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {freelancer.certifications.map((cert, index) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4">
                        <h3 className="font-semibold">{cert.name}</h3>
                        <p className="text-gray-600">{cert.issuer}</p>
                        {cert.dateIssued && (
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            <Calendar className="w-4 h-4" />
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
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Informações de Contato */}
            <Card>
              <CardHeader>
                <CardTitle>Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Membro desde</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      {freelancer.createdAt && typeof freelancer.createdAt === 'object' && 'toDate' in freelancer.createdAt
                        ? freelancer.createdAt.toDate().toLocaleDateString('pt-BR')
                        : 'Não informado'
                      }
                    </span>
                  </div>
                </div>

                {freelancer.email && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Email</p>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{freelancer.email}</span>
                    </div>
                  </div>
                )}

                {freelancer.phone && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Telefone</p>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{freelancer.phone}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Estatísticas */}
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    {freelancer.rating?.toFixed(1) || '0.0'}
                  </p>
                  <p className="text-sm text-gray-500">Avaliação média</p>
                </div>
                
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    {freelancer.ratingCount || 0}
                  </p>
                  <p className="text-sm text-gray-500">Total de avaliações</p>
                </div>

                <div>
                  <p className="text-lg font-bold text-gray-900">
                    {freelancer.completedProjects || 0}
                  </p>
                  <p className="text-sm text-gray-500">Projetos concluídos</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicPortfolio;