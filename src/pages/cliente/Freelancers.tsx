import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Separator } from "@/components/ui/separator";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Star, 
  Search,
  Filter,
  MapPin, 
  Clock,
  Award,
  TrendingUp,
  Users,
  Briefcase,
  MessageCircle,
  Heart,
  SlidersHorizontal,
  ChevronDown,
  CheckCircle,
  Crown,
  Zap,

  X,
  ChevronRight
} from 'lucide-react';
import { UserProfile } from '@/types/user';
import { UserProfileService } from '@/services/userProfileService';
import { useToast } from '@/hooks/use-toast';
import { useAppSelector } from '@/hooks/redux';
import { FavoriteFreelancersService } from '@/services/favoriteFreelancersService';
import { ChatService } from '@/services/chatService';
import { useNavigate } from 'react-router-dom';

interface FreelancerFilters {
  search: string;
  category: string;
  experience: string;
  availability: string;
  hourlyRateMin: string;
  hourlyRateMax: string;
  location: string;
  rating: string;
  sortBy: string;
  selectedCategories: string[];
  selectedSubcategories: string[];
}

// Estrutura de categorias e subcategorias conforme especificado
const categoryStructure = {
  "Design Gráfico": [
    "Apresentação",
    "Design 3D", 
    "Identidade Visual",
    "Diagramação",
    "Embalagem",
    "Ilustração",
    "Edição de Vídeo",
    "Banner",
    "Animação",
    "Flyer",
    "Post",
    "Infográfico",
    "Designer UI/UX",
    "Estampa",
    "LP e Site",
    "Outros"
  ],
  "Comunicação e Marketing": [
    "Jornalismo",
    "Copywriting",
    "Revisão de texto",
    "Review de Produto",
    "Roteiro",
    "Transcrição",
    "Direito",
    "Legendagem",
    "Tradução",
    "SEO",
    "Wordpress",
    "Social media",
    "Blog",
    "Outros"
  ],
  "Programação e TI": [
    "Desenvolvimento de software",
    "Análise de dados",
    "Cibersegurança",
    "Desenvolvimento web",
    "IA",
    "Consultoria em TI",
    "Teste e qualidade de software",
    "Desenvolvimento de jogos",
    "Outros"
  ]
};

const Freelancers = () => {
  const [freelancers, setFreelancers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [favoriteFreelancers, setFavoriteFreelancers] = useState<string[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState<Record<string, boolean>>({});

  const { toast } = useToast();
  const userProfile = useAppSelector(state => state.auth.userProfile);
  const navigate = useNavigate();

  const [filters, setFilters] = useState<FreelancerFilters>({
    search: '',
    category: '',
    experience: 'all',
    availability: 'all',
    hourlyRateMin: '',
    hourlyRateMax: '',
    location: '',
    rating: '',
    sortBy: 'rating',
    selectedCategories: [],
    selectedSubcategories: []
  });

  const categories = [
    "Todos",
    "Programação",
    "Design",
    "Redação",
    "Marketing",
    "Tradução",
    "Locução",
    "Consultoria",
    "Data Science",
    "Mobile"
  ];



  const experienceLevels = [
    { value: 'all', label: 'Todos os níveis' },
    { value: 'iniciante', label: 'Iniciante (0-2 anos)' },
    { value: 'intermediario', label: 'Intermediário (2-5 anos)' },
    { value: 'avancado', label: 'Avançado (5+ anos)' }
  ];

  const availabilityOptions = [
    { value: 'all', label: 'Qualquer disponibilidade' },
    { value: 'disponivel', label: 'Disponível agora' },
    { value: 'ocupado', label: 'Ocupado' },
    { value: 'indisponivel', label: 'Indisponível' }
  ];

  const sortOptions = [
    { value: 'rating', label: 'Melhor avaliação' },
    { value: 'price_low', label: 'Menor preço' },
    { value: 'price_high', label: 'Maior preço' },
    { value: 'recent', label: 'Mais recentes' },
    { value: 'experience', label: 'Mais experientes' },
    { value: 'projects', label: 'Mais projetos' }
  ];

  useEffect(() => {
    loadFreelancers();
  }, []);



  // Função para lidar com seleção de categorias
  const handleCategoryChange = (category: string, checked: boolean) => {
    const newSelectedCategories = checked 
      ? [...filters.selectedCategories, category]
      : filters.selectedCategories.filter(c => c !== category);
    
    // Remove subcategorias da categoria desmarcada
    const newSelectedSubcategories = checked 
      ? filters.selectedSubcategories
      : filters.selectedSubcategories.filter(sub => 
          !categoryStructure[category as keyof typeof categoryStructure]?.includes(sub)
        );

    setFilters({
      ...filters,
      selectedCategories: newSelectedCategories,
      selectedSubcategories: newSelectedSubcategories
    });
  };

  // Função para lidar com seleção de subcategorias
  const handleSubcategoryChange = (subcategory: string, checked: boolean) => {
    const newSelectedSubcategories = checked 
      ? [...filters.selectedSubcategories, subcategory]
      : filters.selectedSubcategories.filter(s => s !== subcategory);

    setFilters({
      ...filters,
      selectedSubcategories: newSelectedSubcategories
    });
  };

  // Helper function para normalizar skills
  const getSkillsArray = (skills: string[] | string | undefined): string[] => {
    if (Array.isArray(skills)) return skills;
    if (typeof skills === 'string') return [skills];
    return [];
  };

  // Função para carregar favoritos do usuário
  const loadFavorites = async () => {
    if (!userProfile?.uid) return;
    
    try {
      const favorites = await FavoriteFreelancersService.getFavoriteFreelancers(userProfile.uid);
      setFavoriteFreelancers(favorites);
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
    }
  };

  const loadFreelancers = async () => {
    try {
      setLoading(true);
      const data = await UserProfileService.searchFreelancers({ limit: 100 });
      
      // Normalizar dados dos freelancers
      const normalizedFreelancers = data
        .filter(f => f.role === 'freelancer')
        .map(freelancer => ({
          ...freelancer,
          skills: getSkillsArray(freelancer.skills),
          rating: freelancer.rating || 0,
          ratingCount: freelancer.ratingCount || 0,
          completedProjects: freelancer.completedProjects || 0,
          hourlyRate: freelancer.hourlyRate || 0
        }));
      
      setFreelancers(normalizedFreelancers);
      
      // Carregar favoritos após carregar freelancers
      await loadFavorites();
    } catch (error) {
      console.error('Erro ao carregar freelancers:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os freelancers. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Função para alternar favorito
  const handleToggleFavorite = async (freelancerId: string) => {
    if (!userProfile?.uid) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para favoritar freelancers.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoadingFavorites(prev => ({ ...prev, [freelancerId]: true }));
      
      const isFavorite = favoriteFreelancers.includes(freelancerId);
      
      if (isFavorite) {
        await FavoriteFreelancersService.removeFromFavorites(userProfile.uid, freelancerId);
        setFavoriteFreelancers(prev => prev.filter(id => id !== freelancerId));
        toast({
          title: "Removido dos favoritos",
          description: "Freelancer removido da sua lista de favoritos."
        });
      } else {
        await FavoriteFreelancersService.addToFavorites(userProfile.uid, freelancerId);
        setFavoriteFreelancers(prev => [...prev, freelancerId]);
        toast({
          title: "Adicionado aos favoritos",
          description: "Freelancer adicionado à sua lista de favoritos."
        });
      }
    } catch (error) {
      console.error('Erro ao alterar favorito:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o favorito. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoadingFavorites(prev => ({ ...prev, [freelancerId]: false }));
    }
  };

  // Função para abrir chat com freelancer
  const handleOpenChat = async (freelancer: UserProfile) => {
    if (!userProfile?.uid) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para iniciar um chat.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Criar ou obter chat direto existente
      const chat = await ChatService.getOrCreateDirectChat(
        userProfile.uid,
        userProfile.name || 'Cliente',
        freelancer.uid,
        freelancer.name || 'Freelancer'
      );
      
      // Navegar para a página de chat
      navigate(`/cliente/mensagens?chatId=${chat.id}`);
    } catch (error) {
      console.error('Erro ao abrir chat:', error);
      toast({
        title: "Erro",
        description: "Não foi possível abrir o chat. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const filteredAndSortedFreelancers = useMemo(() => {
    let result = [...freelancers];

    // Aplicar filtros
    if (filters.search) {
      result = result.filter(f => {
        const skills = getSkillsArray(f.skills);
        return f.name.toLowerCase().includes(filters.search.toLowerCase()) ||
               f.bio?.toLowerCase().includes(filters.search.toLowerCase()) ||
               skills.some(skill => skill.toLowerCase().includes(filters.search.toLowerCase()));
      });
    }

    // Filtro por categorias selecionadas
    if (filters.selectedCategories.length > 0) {
      result = result.filter(f => {
        const skills = getSkillsArray(f.skills);
        return filters.selectedCategories.some(category => {
          if (category === "Design Gráfico") {
            return skills.some(skill => 
              skill.toLowerCase().includes("design") ||
              skill.toLowerCase().includes("gráfico") ||
              skill.toLowerCase().includes("ui") ||
              skill.toLowerCase().includes("ux") ||
              skill.toLowerCase().includes("photoshop") ||
              skill.toLowerCase().includes("illustrator") ||
              skill.toLowerCase().includes("figma")
            );
          } else if (category === "Comunicação e Marketing") {
            return skills.some(skill => 
              skill.toLowerCase().includes("marketing") ||
              skill.toLowerCase().includes("copywriting") ||
              skill.toLowerCase().includes("copy") ||
              skill.toLowerCase().includes("seo") ||
              skill.toLowerCase().includes("social media") ||
              skill.toLowerCase().includes("redação") ||
              skill.toLowerCase().includes("jornalismo")
            );
          } else if (category === "Programação e TI") {
            return skills.some(skill => 
              skill.toLowerCase().includes("dev") ||
              skill.toLowerCase().includes("javascript") ||
              skill.toLowerCase().includes("react") ||
              skill.toLowerCase().includes("node") ||
              skill.toLowerCase().includes("python") ||
              skill.toLowerCase().includes("php") ||
              skill.toLowerCase().includes("java") ||
              skill.toLowerCase().includes("web") ||
              skill.toLowerCase().includes("software") ||
              skill.toLowerCase().includes("programação")
            );
          }
          return skills.some(skill => skill.toLowerCase().includes(category.toLowerCase()));
        });
      });
    }

    // Filtro por subcategorias selecionadas
    if (filters.selectedSubcategories.length > 0) {
      result = result.filter(f => {
        const skills = getSkillsArray(f.skills);
        return filters.selectedSubcategories.some(subcategory => 
          skills.some(skill => skill.toLowerCase().includes(subcategory.toLowerCase()))
        );
      });
    }

    // Filtro de categoria antiga (compatibilidade)
    if (filters.category && filters.category !== 'Todos' && filters.selectedCategories.length === 0) {
      result = result.filter(f => {
        const skills = getSkillsArray(f.skills);
        return skills.some(skill => 
          skill.toLowerCase().includes(filters.category.toLowerCase()) ||
          (filters.category === "Programação" && (
            skill.toLowerCase().includes("dev") ||
            skill.toLowerCase().includes("javascript") ||
            skill.toLowerCase().includes("react") ||
            skill.toLowerCase().includes("node") ||
            skill.toLowerCase().includes("python") ||
            skill.toLowerCase().includes("php")
          ))
        );
      });
    }

    if (filters.experience && filters.experience !== 'all') {
      result = result.filter(f => f.experience === filters.experience);
    }

    if (filters.availability && filters.availability !== 'all') {
      result = result.filter(f => f.availability === filters.availability);
    }

    if (filters.hourlyRateMin) {
      result = result.filter(f => (f.hourlyRate || 0) >= parseFloat(filters.hourlyRateMin));
    }

    if (filters.hourlyRateMax) {
      result = result.filter(f => (f.hourlyRate || 0) <= parseFloat(filters.hourlyRateMax));
    }

    if (filters.location) {
      result = result.filter(f => 
        f.location?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    if (filters.rating) {
      result = result.filter(f => f.rating >= parseFloat(filters.rating));
    }

    // Aplicar ordenação
    switch (filters.sortBy) {
      case 'rating':
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'price_low':
        result.sort((a, b) => (a.hourlyRate || 0) - (b.hourlyRate || 0));
        break;
      case 'price_high':
        result.sort((a, b) => (b.hourlyRate || 0) - (a.hourlyRate || 0));
        break;
      case 'recent':
        result.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date();
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date();
          return dateB.getTime() - dateA.getTime();
        });
        break;
      case 'experience':
        result.sort((a, b) => {
          const expOrder = { 'avancado': 3, 'intermediario': 2, 'iniciante': 1 };
          return (expOrder[b.experience as keyof typeof expOrder] || 0) - 
                 (expOrder[a.experience as keyof typeof expOrder] || 0);
        });
        break;
      case 'projects':
        result.sort((a, b) => (b.completedProjects || 0) - (a.completedProjects || 0));
        break;
    }

    return result;
  }, [freelancers, filters]);

  const getBadgeInfo = (freelancer: UserProfile) => {
    if (freelancer.rating >= 4.9) return { text: "Elite", color: "bg-purple-600", icon: Crown };
    if (freelancer.rating >= 4.7) return { text: "Top Rated", color: "bg-yellow-500", icon: Star };
    if (freelancer.rating >= 4.5) return { text: "Pro", color: "bg-blue-600", icon: Zap };
    if (freelancer.rating >= 4.0) return { text: "Verified", color: "bg-green-600", icon: CheckCircle };
    return { text: "New", color: "bg-gray-500", icon: Users };
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'disponivel': return 'text-green-600 bg-green-50';
      case 'ocupado': return 'text-yellow-600 bg-yellow-50';
      case 'indisponivel': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
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

  const FreelancerCard = ({ freelancer }: { freelancer: UserProfile }) => {
    const badge = getBadgeInfo(freelancer);
    const BadgeIcon = badge.icon;
    const skills = getSkillsArray(freelancer.skills);

    return (
      <Card className="group hover:shadow-lg transition-all duration-300 md:hover:-translate-y-1 border-0 shadow-sm">
        <CardContent className="p-4 md:p-6">
          {/* Layout mobile: vertical stack */}
          <div className="md:hidden space-y-4">
            {/* Header móvel */}
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={freelancer.profileImage} alt={freelancer.name} />
                    <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold text-sm">
                      {freelancer.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                    freelancer.availability === 'disponivel' ? 'bg-green-500' : 
                    freelancer.availability === 'ocupado' ? 'bg-yellow-500' : 'bg-gray-400'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base text-gray-900 truncate">{freelancer.name}</h3>
                  <div className="flex items-center space-x-1 mt-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-sm text-gray-900">
                      {freelancer.rating?.toFixed(1) || '0.0'}
                    </span>
                    <span className="text-gray-500 text-xs">
                      ({freelancer.ratingCount || 0})
                    </span>
                  </div>
                </div>
              </div>
              <Badge className={`${badge.color} text-white text-xs px-2 py-1 flex items-center gap-1 shrink-0`}>
                <BadgeIcon className="w-3 h-3" />
                {badge.text}
              </Badge>
            </div>

            {/* Bio móvel */}
            <p className="text-gray-600 text-sm line-clamp-2">
              {freelancer.bio || 'Freelancer profissional'}
            </p>

            {/* Skills móveis */}
            <div className="flex flex-wrap gap-1">
              {skills.length > 0 ? (
                <>
                  {skills.slice(0, 2).map((skill, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {skills.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{skills.length - 2}
                    </Badge>
                  )}
                </>
              ) : (
                <Badge variant="outline" className="text-xs text-gray-400">
                  Sem habilidades
                </Badge>
              )}
            </div>

            {/* Info adicional móvel */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-3">
                {freelancer.location && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate max-w-[80px]">{freelancer.location}</span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <Briefcase className="w-3 h-3" />
                  <span>{freelancer.completedProjects || 0}</span>
                </div>
              </div>
              <Badge className={`text-xs ${getAvailabilityColor(freelancer.availability || '')}`}>
                {getAvailabilityText(freelancer.availability || '')}
              </Badge>
            </div>

            {/* Preço e ações móveis */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-gray-900">
                  R$ {freelancer.hourlyRate || 50}/h
                </div>
                {freelancer.experience && (
                  <div className="text-xs text-gray-500 capitalize">
                    {freelancer.experience}
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="px-3"
                  onClick={() => handleToggleFavorite(freelancer.uid)}
                  disabled={loadingFavorites[freelancer.uid]}
                >
                  <Heart className={`w-4 h-4 ${
                    favoriteFreelancers.includes(freelancer.uid) 
                      ? 'fill-red-500 text-red-500' 
                      : 'text-gray-400'
                  }`} />
                </Button>
                <Button 
                  size="sm" 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleOpenChat(freelancer)}
                >
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Chat
                </Button>
              </div>
            </div>
          </div>

          {/* Layout desktop: horizontal */}
          <div className="hidden md:flex items-start space-x-4">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="w-16 h-16">
                <AvatarImage src={freelancer.profileImage} alt={freelancer.name} />
                <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                  {freelancer.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
                freelancer.availability === 'disponivel' ? 'bg-green-500' : 
                freelancer.availability === 'ocupado' ? 'bg-yellow-500' : 'bg-gray-400'
              }`} />
            </div>

            {/* Informações principais */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg text-gray-900 truncate">{freelancer.name}</h3>
                <Badge className={`${badge.color} text-white text-xs px-2 py-1 flex items-center gap-1`}>
                  <BadgeIcon className="w-3 h-3" />
                  {badge.text}
                </Badge>
              </div>

              {/* Rating e avaliações */}
              <div className="flex items-center space-x-4 mb-3">
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium text-gray-900">
                    {freelancer.rating?.toFixed(1) || '0.0'}
                  </span>
                  <span className="text-gray-500 text-sm">
                    ({freelancer.ratingCount || 0} avaliações)
                  </span>
                </div>
              </div>

              {/* Bio */}
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                {freelancer.bio || 'Freelancer profissional'}
              </p>

              {/* Skills */}
              <div className="flex flex-wrap gap-1 mb-4">
                {skills.length > 0 ? (
                  <>
                    {skills.slice(0, 3).map((skill, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {skills.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{skills.length - 3}
                      </Badge>
                    )}
                  </>
                ) : (
                  <Badge variant="outline" className="text-xs text-gray-400">
                    Habilidades não informadas
                  </Badge>
                )}
              </div>

              {/* Informações adicionais */}
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <div className="flex items-center space-x-4">
                  {freelancer.location && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{freelancer.location}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    <Briefcase className="w-4 h-4" />
                    <span>{freelancer.completedProjects || 0} projetos</span>
                  </div>
                </div>
                <Badge className={`text-xs ${getAvailabilityColor(freelancer.availability || '')}`}>
                  {getAvailabilityText(freelancer.availability || '')}
                </Badge>
              </div>

              {/* Preço e ações */}
              <div className="flex items-center justify-between">
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">
                    R$ {freelancer.hourlyRate || 50}/hora
                  </div>
                  <div className="text-xs text-gray-500">
                    {freelancer.experience && (
                      <span className="capitalize">{freelancer.experience}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleToggleFavorite(freelancer.uid)}
                    disabled={loadingFavorites[freelancer.uid]}
                  >
                    <Heart className={`w-4 h-4 ${
                      favoriteFreelancers.includes(freelancer.uid) 
                        ? 'fill-red-500 text-red-500' 
                        : 'text-gray-400'
                    }`} />
                  </Button>
                  <Button 
                    size="sm" 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleOpenChat(freelancer)}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Conversar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 md:p-8 rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">💼 Freelancers</h1>
            <p className="text-blue-100 text-sm md:text-base">
              Encontre e contrate os melhores profissionais para seu projeto
            </p>
          </div>
          <div className="text-center md:text-right">
            <div className="text-xl md:text-2xl font-bold">
              {filteredAndSortedFreelancers.length}
            </div>
            <div className="text-blue-100 text-sm">
              profissionais encontrados
            </div>
          </div>
        </div>
      </div>

      {/* Filtros e busca */}
      <Card>
        <CardHeader className="pb-4">
          <div className="space-y-4">
            {/* Search bar - sempre visível */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar freelancers por nome ou habilidade..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10 text-base md:text-sm"
              />
            </div>

            {/* Controles de filtro */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex gap-2">
                {/* Botão de filtros para desktop */}
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="hidden md:flex items-center space-x-2 flex-1 md:flex-none"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Filtros</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </Button>

                {/* Drawer de filtros para mobile */}
                <Drawer open={showMobileFilters} onOpenChange={setShowMobileFilters}>
                  <DrawerTrigger asChild>
                    <Button
                      variant="outline"
                      className="md:hidden flex items-center space-x-2 flex-1"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      <span>Filtros</span>
                    </Button>
                  </DrawerTrigger>
                  
                  <DrawerContent className="h-[85vh]">
                    <DrawerHeader className="text-left border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <DrawerTitle className="text-lg font-semibold">🔍 Filtros de Busca</DrawerTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2"
                          onClick={() => setShowMobileFilters(false)}
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                    </DrawerHeader>
                    
                    <div className="p-4 space-y-6 flex-1 overflow-y-auto">
                      {/* Filtros do mobile drawer */}
                      
                      {/* Filtros de Categoria e Subcategoria - Mobile */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-gray-700">Categorias e Especialidades</h3>
                        {Object.entries(categoryStructure).map(([category, subcategories]) => (
                          <div key={category} className="border rounded-lg p-3">
                            <div className="flex items-center space-x-2 mb-2">
                              <Checkbox
                                id={`mobile-category-${category}`}
                                checked={filters.selectedCategories.includes(category)}
                                onCheckedChange={(checked) => handleCategoryChange(category, checked as boolean)}
                              />
                              <Label 
                                htmlFor={`mobile-category-${category}`}
                                className="text-sm font-medium text-gray-900 cursor-pointer"
                              >
                                {category}
                              </Label>
                            </div>
                            
                            {filters.selectedCategories.includes(category) && (
                              <div className="ml-6 space-y-2">
                                {subcategories.map((subcategory) => (
                                  <div key={subcategory} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`mobile-subcategory-${subcategory}`}
                                      checked={filters.selectedSubcategories.includes(subcategory)}
                                      onCheckedChange={(checked) => handleSubcategoryChange(subcategory, checked as boolean)}
                                    />
                                    <Label 
                                      htmlFor={`mobile-subcategory-${subcategory}`}
                                      className="text-xs text-gray-700 cursor-pointer"
                                    >
                                      {subcategory}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Categoria (Legado)</label>
                          <Select value={filters.category} onValueChange={(value) => setFilters({ ...filters, category: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Todas as categorias" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(category => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Experiência</label>
                          <Select value={filters.experience} onValueChange={(value) => setFilters({ ...filters, experience: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Qualquer nível" />
                            </SelectTrigger>
                            <SelectContent>
                              {experienceLevels.map(level => (
                                <SelectItem key={level.value} value={level.value}>
                                  {level.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Disponibilidade</label>
                          <Select value={filters.availability} onValueChange={(value) => setFilters({ ...filters, availability: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Qualquer status" />
                            </SelectTrigger>
                            <SelectContent>
                              {availabilityOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Preço mín.</label>
                            <Input
                              type="number"
                              placeholder="R$ 0"
                              value={filters.hourlyRateMin}
                              onChange={(e) => setFilters({ ...filters, hourlyRateMin: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Preço máx.</label>
                            <Input
                              type="number"
                              placeholder="R$ 1000"
                              value={filters.hourlyRateMax}
                              onChange={(e) => setFilters({ ...filters, hourlyRateMax: e.target.value })}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Localização</label>
                          <Input
                            placeholder="Cidade/Estado"
                            value={filters.location}
                            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Botões de ação */}
                      <div className="flex gap-3 pt-4 border-t">
                                                <Button
                          variant="outline"
                          onClick={() => {
                            setFilters({
                              search: '',
                              category: '',
                              experience: 'all',
                              availability: 'all',
                              hourlyRateMin: '',
                              hourlyRateMax: '',
                              location: '',
                              rating: '',
                              sortBy: 'rating',
                              selectedCategories: [],
                              selectedSubcategories: []
                            });
                            setShowMobileFilters(false);
                          }}
                          className="flex-1"
                        >
                          Limpar
                        </Button>
                        <Button
                          onClick={() => setShowMobileFilters(false)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                          Aplicar
                        </Button>
                      </div>
                    </div>
                  </DrawerContent>
                </Drawer>
              </div>
              
              {/* Ordenação */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 hidden md:inline">Ordenar:</span>
                <Select value={filters.sortBy} onValueChange={(value) => setFilters({ ...filters, sortBy: value })}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filtros ativos */}
            {(filters.selectedCategories.length > 0 || filters.selectedSubcategories.length > 0) && (
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="text-sm text-gray-600">Filtros ativos:</span>
                {filters.selectedCategories.map((category) => (
                  <Badge key={category} variant="secondary" className="flex items-center gap-1">
                    {category}
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-red-600" 
                      onClick={() => handleCategoryChange(category, false)}
                    />
                  </Badge>
                ))}
                {filters.selectedSubcategories.map((subcategory) => (
                  <Badge key={subcategory} variant="outline" className="flex items-center gap-1">
                    {subcategory}
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-red-600" 
                      onClick={() => handleSubcategoryChange(subcategory, false)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="pt-0">
            <Separator className="mb-6" />
            
            {/* Filtros de Categoria e Subcategoria */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Categorias e Especialidades</h3>
              <div className="space-y-4">
                {Object.entries(categoryStructure).map(([category, subcategories]) => (
                  <div key={category} className="border rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Checkbox
                        id={`category-${category}`}
                        checked={filters.selectedCategories.includes(category)}
                        onCheckedChange={(checked) => handleCategoryChange(category, checked as boolean)}
                      />
                      <Label 
                        htmlFor={`category-${category}`}
                        className="text-sm font-medium text-gray-900 cursor-pointer"
                      >
                        {category}
                        {filters.selectedCategories.includes(category) && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {filters.selectedSubcategories.filter(sub => subcategories.includes(sub)).length || 'Todas'}
                          </Badge>
                        )}
                      </Label>
                    </div>
                    
                    {filters.selectedCategories.includes(category) && (
                      <div className="ml-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {subcategories.map((subcategory) => (
                          <div key={subcategory} className="flex items-center space-x-2">
                            <Checkbox
                              id={`subcategory-${subcategory}`}
                              checked={filters.selectedSubcategories.includes(subcategory)}
                              onCheckedChange={(checked) => handleSubcategoryChange(subcategory, checked as boolean)}
                            />
                            <Label 
                              htmlFor={`subcategory-${subcategory}`}
                              className="text-xs text-gray-700 cursor-pointer"
                            >
                              {subcategory}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator className="mb-6" />
            
            {/* Outros filtros */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Categoria (Legado)</label>
                <Select value={filters.category} onValueChange={(value) => setFilters({ ...filters, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Experiência</label>
                <Select value={filters.experience} onValueChange={(value) => setFilters({ ...filters, experience: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    {experienceLevels.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Disponibilidade</label>
                <Select value={filters.availability} onValueChange={(value) => setFilters({ ...filters, availability: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    {availabilityOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Preço mín.</label>
                <Input
                  type="number"
                  placeholder="R$ 0"
                  value={filters.hourlyRateMin}
                  onChange={(e) => setFilters({ ...filters, hourlyRateMin: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Preço máx.</label>
                <Input
                  type="number"
                  placeholder="R$ 1000"
                  value={filters.hourlyRateMax}
                  onChange={(e) => setFilters({ ...filters, hourlyRateMax: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Localização</label>
                <Input
                  placeholder="Cidade/Estado"
                  value={filters.location}
                  onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>



      {/* Lista de freelancers */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                  <div className="text-2xl absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    🔍
                  </div>
                </div>
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  Buscando freelancers...
                </h3>
                <p className="text-gray-500 text-sm">
                  Encontrando os melhores profissionais para você
                </p>
              </div>
            </CardContent>
          </Card>
        ) : filteredAndSortedFreelancers.length === 0 ? (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <div className="text-6xl mb-4">🕵️‍♂️</div>
                <h3 className="text-xl font-medium text-gray-600 mb-2">
                  Nenhum freelancer encontrado
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  {filters.search || filters.category || filters.location ? 
                    'Tente ajustar seus filtros ou busque por outros termos' : 
                    'Não temos freelancers disponíveis no momento'}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button 
                    onClick={() => {
                      setFilters({
                        search: '',
                        category: '',
                        experience: 'all',
                        availability: 'all',
                        hourlyRateMin: '',
                        hourlyRateMax: '',
                        location: '',
                        rating: '',
                        sortBy: 'rating',
                        selectedCategories: [],
                        selectedSubcategories: []
                      });
                    }}
                    variant="outline"
                  >
                    🧹 Limpar filtros
                  </Button>
                  <Button 
                    onClick={() => loadFreelancers()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    🔄 Buscar novamente
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {filteredAndSortedFreelancers.map((freelancer) => (
              <FreelancerCard key={freelancer.uid} freelancer={freelancer} />
            ))}
          </div>
        )}
      </div>

      {/* Estatísticas */}
      {!loading && filteredAndSortedFreelancers.length > 0 && (
        <Card>
          <CardContent className="py-4 md:py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-center">
              <div className="bg-blue-50 rounded-lg p-3 md:p-4">
                <div className="text-xl md:text-2xl font-bold text-blue-600 mb-1">
                  {filteredAndSortedFreelancers.length}
                </div>
                <div className="text-xs md:text-sm text-gray-600">
                  👥 Freelancers
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 md:p-4">
                <div className="text-xl md:text-2xl font-bold text-green-600 mb-1">
                  {filteredAndSortedFreelancers.filter(f => f.availability === 'disponivel').length}
                </div>
                <div className="text-xs md:text-sm text-gray-600">
                  ✅ Disponíveis
                </div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 md:p-4">
                <div className="text-xl md:text-2xl font-bold text-yellow-600 mb-1">
                  {(filteredAndSortedFreelancers.reduce((acc, f) => acc + (f.rating || 0), 0) / filteredAndSortedFreelancers.length).toFixed(1)}
                </div>
                <div className="text-xs md:text-sm text-gray-600">
                  ⭐ Avaliação
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 md:p-4">
                <div className="text-xl md:text-2xl font-bold text-purple-600 mb-1">
                  R$ {Math.round(filteredAndSortedFreelancers.reduce((acc, f) => acc + (f.hourlyRate || 0), 0) / filteredAndSortedFreelancers.length)}
                </div>
                <div className="text-xs md:text-sm text-gray-600">
                  💰 Preço/hora
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Freelancers;
