import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from '@/hooks/use-toast';
import { useAppSelector } from '@/hooks/redux';
import { UserProfile } from '@/types/user';
import { FeaturedFreelancersService, FeaturedFreelancer } from '@/services/featuredFreelancersService';
import { 
  Star, 
  MapPin, 
  Award,
  Plus,
  Minus,
  Trash2,
  Search,
  Users,
  TrendingUp,
  Filter,
  Eye,
  UserPlus,
  Briefcase
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const ManagerFeaturedFreelancers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const userProfile = useAppSelector(state => state.auth.userProfile);
  
  const [featuredFreelancers, setFeaturedFreelancers] = useState<FeaturedFreelancer[]>([]);
  const [availableFreelancers, setAvailableFreelancers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingFreelancer, setAddingFreelancer] = useState(false);
  const [removingFreelancer, setRemovingFreelancer] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [stats, setStats] = useState<{ total: number; byCategory: { [key: string]: number } }>({ total: 0, byCategory: {} });
  
  // Filtros para buscar freelancers disponíveis
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [newFreelancerCategory, setNewFreelancerCategory] = useState('Redação');
  
  const categories = [
    "Todos",
    "Redação",
    "Design", 
    "Programação",
    "Marketing",
    "Tradução",
    "Locução"
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [featured, statistics] = await Promise.all([
        FeaturedFreelancersService.getFeaturedFreelancers(),
        FeaturedFreelancersService.getFeaturedStats()
      ]);
      
      setFeaturedFreelancers(featured);
      setStats(statistics);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar freelancers em destaque",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableFreelancers = async () => {
    try {
      const available = await FeaturedFreelancersService.searchAvailableFreelancers({
        searchTerm,
        category: selectedCategory === 'Todos' ? undefined : selectedCategory
      });
      setAvailableFreelancers(available);
    } catch (error) {
      console.error('Erro ao carregar freelancers disponíveis:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar freelancers disponíveis",
        variant: "destructive"
      });
    }
  };

  const handleAddFeatured = async (freelancerId: string) => {
    try {
      setAddingFreelancer(true);
      await FeaturedFreelancersService.addFeaturedFreelancer(freelancerId, newFreelancerCategory);
      
      toast({
        title: "Sucesso",
        description: "Freelancer adicionado aos destaques!",
      });
      
      await loadData();
      await loadAvailableFreelancers();
      setShowAddDialog(false);
    } catch (error) {
      console.error('Erro ao adicionar freelancer:', error);
      toast({
        title: "Erro",
        description: "Falha ao adicionar freelancer aos destaques",
        variant: "destructive"
      });
    } finally {
      setAddingFreelancer(false);
    }
  };

  const handleRemoveFeatured = async (freelancerId: string) => {
    try {
      setRemovingFreelancer(freelancerId);
      await FeaturedFreelancersService.removeFeaturedFreelancer(freelancerId);
      
      toast({
        title: "Sucesso",
        description: "Freelancer removido dos destaques!",
      });
      
      await loadData();
    } catch (error) {
      console.error('Erro ao remover freelancer:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover freelancer dos destaques",
        variant: "destructive"
      });
    } finally {
      setRemovingFreelancer(null);
    }
  };

  const getBadge = (freelancer: FeaturedFreelancer | UserProfile) => {
    const rating = freelancer.rating || 0;
    if (rating >= 4.8) return { text: "Top Rated", color: "bg-yellow-500" };
    if (rating >= 4.5) return { text: "Pro", color: "bg-blue-600" };
    return { text: "Verified", color: "bg-green-600" };
  };

  const getPrice = (freelancer: FeaturedFreelancer | UserProfile, category?: string) => {
    if (freelancer.hourlyRate) {
      return `R$ ${freelancer.hourlyRate}/hora`;
    }

    const baseRates: { [key: string]: number } = {
      "Redação": 45,
      "Design": 65,
      "Programação": 95,
      "Marketing": 60,
      "Tradução": 55,
      "Locução": 80
    };

    const baseRate = baseRates[category || 'Redação'] || 50;
    const rating = freelancer.rating || 0;
    const ratingMultiplier = rating > 4.5 ? 1.2 : 1.0;
    const finalRate = Math.round(baseRate * ratingMultiplier);

    return `R$ ${finalRate}/hora`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 text-center">Carregando...</p>
      </div>
    );
  }

  // Cálculos para estatísticas
  const totalProjects = featuredFreelancers.reduce((acc, f) => acc + (f.totalProjects || 0), 0);
  const averageRating = featuredFreelancers.length > 0 
    ? featuredFreelancers.reduce((acc, f) => acc + (f.averageRating || 0), 0) / featuredFreelancers.length 
    : 0;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Freelancers em Destaque</h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
            Gerencie quais freelancers aparecerão na seção de destaque da página inicial
          </p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button onClick={loadAvailableFreelancers} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Adicionar Freelancer</span>
              <span className="sm:hidden">Adicionar</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[100dvw] h-[100dvh] max-w-none max-h-none md:max-w-4xl md:max-h-[90dvh] md:rounded-lg overflow-y-auto p-0 flex flex-col">
            <DialogHeader className="p-4 md:p-6 border-b">
              <DialogTitle className="text-lg sm:text-xl">Adicionar Freelancer em Destaque</DialogTitle>
              <DialogDescription className="text-sm">
                Selecione um freelancer para adicionar à seção de destaque
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {/* Filtros */}
              <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar por nome, bio ou habilidades..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button onClick={loadAvailableFreelancers} variant="outline" size="sm">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Categoria para o novo freelancer */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria do Destaque:
                </label>
                <Select value={newFreelancerCategory} onValueChange={setNewFreelancerCategory}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(cat => cat !== 'Todos').map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lista de freelancers disponíveis */}
              {availableFreelancers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {availableFreelancers.map((freelancer) => {
                    const badge = getBadge(freelancer);
                    const price = getPrice(freelancer, newFreelancerCategory);
                    
                    return (
                      <Card key={freelancer.uid} className="relative hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3 mb-4">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={freelancer.profileImage} alt={freelancer.name} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg">
                                {freelancer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{freelancer.name}</h3>
                              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span>{(freelancer.rating || 0).toFixed(1)}</span>
                                <span>({freelancer.ratingCount || 0})</span>
                              </div>
                            </div>
                            <Badge className={`${badge.color} text-white text-xs shrink-0`}>
                              {badge.text}
                            </Badge>
                          </div>

                          <p className="text-gray-600 text-sm line-clamp-2 mb-3">{freelancer.bio}</p>

                          <div className="flex flex-wrap gap-1 mb-3">
                            {(freelancer.skills || []).slice(0, 3).map((skill) => (
                              <Badge key={skill} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {(freelancer.skills || []).length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{(freelancer.skills || []).length - 3}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-green-600">{price}</span>
                            <Button
                              size="sm"
                              onClick={() => handleAddFeatured(freelancer.uid)}
                              disabled={addingFreelancer}
                              className="shrink-0"
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Adicionar</span>
                              <span className="sm:hidden">Add</span>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum freelancer disponível encontrado</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Total em Destaque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{featuredFreelancers.length}</div>
            <p className="text-xs text-gray-600">Freelancers em destaque</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              Total de Freelancers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableFreelancers.length}</div>
            <p className="text-xs text-gray-600">Freelancers cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-600" />
              Média de Avaliação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageRating.toFixed(1)}
            </div>
            <p className="text-xs text-gray-600">Avaliação média</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-purple-600" />
              Projetos Concluídos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects}</div>
            <p className="text-xs text-gray-600">Total de projetos</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Freelancers em Destaque */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Freelancers em Destaque
          </CardTitle>
          <CardDescription>
            Gerencie os freelancers que aparecem na seção de destaque
          </CardDescription>
        </CardHeader>
        <CardContent>
          {featuredFreelancers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Star className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum freelancer em destaque ainda</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {featuredFreelancers.map((freelancer) => (
                <Card key={freelancer.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={freelancer.profileImage} alt={freelancer.name} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg">
                          {freelancer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{freelancer.name}</h4>
                        <p className="text-sm text-gray-600 line-clamp-2">{freelancer.bio}</p>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-current" />
                            <span className="text-xs font-medium">{freelancer.averageRating.toFixed(1)}</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            ({freelancer.totalReviews} avaliações)
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1 mt-2">
                          {freelancer.skills.slice(0, 2).map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {freelancer.skills.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{freelancer.skills.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveFeatured(freelancer.id)}
                      className="w-full mt-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={loading}
                    >
                      <Minus className="w-3 h-3 mr-1" />
                      Remover do Destaque
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagerFeaturedFreelancers;
