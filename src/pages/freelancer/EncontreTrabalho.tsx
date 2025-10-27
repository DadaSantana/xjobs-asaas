import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, 
  Calendar, 
  DollarSign, 
  Users, 
  Clock, 
  Send, 
  Filter, 
  TrendingUp, 
  Heart, 
  Eye, 
  MapPin,
  SlidersHorizontal,
  ChevronDown,
  X
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAppSelector } from "@/hooks/redux";
import { usePresence } from "@/hooks/usePresence";
import { ProjectService } from "@/services/projectService";

import { LikeProjectButton } from "@/components/LikeProjectButton";
import { 
  Project, 
  ProjectFilters, 
  CreateProposalData, 
  ProjectCategory, 
  ProjectExperience,
  ProjectProposal
} from "@/types/project";
import { 
  getProjectStatusColor, 
  getProjectStatusLabel, 
  getProjectStatusIcon 
} from "@/utils/projectHelpers";
import { stripHtml } from "@/lib/utils";

// Interface estendida para incluir os novos filtros
interface ExtendedProjectFilters extends ProjectFilters {
  selectedCategories?: string[];
  selectedSubcategories?: string[];
}

// Estrutura de categorias e subcategorias conforme especificado pelo usuário
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
  ],
  "PJ Home Office": [
    "Design Gráfico",
    "Comunicação e Marketing",
    "Programação e TI",
    "Outros"
  ]
};

const EncontreTrabalho = () => {
  const { toast } = useToast();
  const userProfile = useAppSelector(state => state.auth.userProfile);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Extrair IDs dos clientes dos projetos para monitorar presença
  const clientIds = projects.map(project => project.clientId);
  const { isUserOnline, isInitialized: presenceInitialized } = usePresence(clientIds);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<ExtendedProjectFilters>({
    selectedCategories: [],
    selectedSubcategories: []
  });
  
  // Formulário de proposta
  const [proposalForm, setProposalForm] = useState({
    coverLetter: "",
    proposedBudget: "",
    estimatedDays: "",
  });

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [projects, searchTerm, filters]);

  // Debounce para busca em tempo real
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      filterProjects();
    }, 300); // 300ms de delay

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Função para lidar com seleção de categorias
  const handleCategoryChange = (category: string, checked: boolean) => {
    const newSelectedCategories = checked 
      ? [...(filters.selectedCategories || []), category]
      : (filters.selectedCategories || []).filter(c => c !== category);
    
    // Remove subcategorias da categoria desmarcada
    const newSelectedSubcategories = checked 
      ? filters.selectedSubcategories || []
      : (filters.selectedSubcategories || []).filter(sub => 
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
      ? [...(filters.selectedSubcategories || []), subcategory]
      : (filters.selectedSubcategories || []).filter(s => s !== subcategory);

    setFilters({
      ...filters,
      selectedSubcategories: newSelectedSubcategories
    });
  };

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      // Carregar todos os projetos recebendo propostas por padrão
      const allProjects = await ProjectService.getProjects();
      setProjects(allProjects);
      // Exibir imediatamente sem aguardar efeitos de filtro
      setFilteredProjects(allProjects);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar projetos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterProjects = () => {
    // Trabalhar sempre com uma cópia para evitar mutação de estado
    let filtered = [...projects];

    // Filtro por status apenas se explicitamente selecionado
    if (filters.status) {
      filtered = filtered.filter(project => project.status === filters.status);
    }

    // Filtro por termo de busca - MELHORADO
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(project => {
        // Busca no título
        const titleMatch = (project.title || '').toLowerCase().includes(searchLower);
        
        // Busca na descrição (removendo HTML)
        const cleanDescription = stripHtml(project.description || '').toLowerCase();
        const descriptionMatch = cleanDescription.includes(searchLower);
        
        // Busca nas habilidades
        const skillsMatch = (project.skills || []).some(skill => 
          skill.toLowerCase().includes(searchLower)
        );
        
        // Busca no nome do cliente
        const clientMatch = (project.clientName || '').toLowerCase().includes(searchLower);
        
        // Busca na categoria
        const categoryMatch = getCategoryLabel(project.category).toLowerCase().includes(searchLower);
        
        return titleMatch || descriptionMatch || skillsMatch || clientMatch || categoryMatch;
      });
    }

    // Filtro por categorias selecionadas
    if (filters.selectedCategories && filters.selectedCategories.length > 0) {
      filtered = filtered.filter(project => {
        return filters.selectedCategories!.some(category => {
          if (category === "Design Gráfico") {
            return project.category === 'design' || 
                   project.skills.some(skill => 
                     skill.toLowerCase().includes("design") ||
                     skill.toLowerCase().includes("ui") ||
                     skill.toLowerCase().includes("ux")
                   );
          } else if (category === "Comunicação e Marketing") {
            return project.category === 'marketing' || 
                   project.skills.some(skill => 
                     skill.toLowerCase().includes("marketing") ||
                     skill.toLowerCase().includes("copywriting") ||
                     skill.toLowerCase().includes("seo")
                   );
          } else if (category === "Programação e TI") {
            return project.category === 'desenvolvimento' || 
                   project.skills.some(skill => 
                     skill.toLowerCase().includes("dev") ||
                     skill.toLowerCase().includes("programação") ||
                     skill.toLowerCase().includes("web")
                   );
          } else if (category === "PJ Home Office") {
            return true; // PJ Home Office inclui todos os tipos
          }
          return false;
        });
      });
    }

    // Filtro por subcategorias selecionadas
    if (filters.selectedSubcategories && filters.selectedSubcategories.length > 0) {
      filtered = filtered.filter(project => {
        return filters.selectedSubcategories!.some(subcategory => 
          (project.skills || []).some(skill => skill.toLowerCase().includes(subcategory.toLowerCase())) ||
          (project.title || '').toLowerCase().includes(subcategory.toLowerCase()) ||
          stripHtml(project.description || '').toLowerCase().includes(subcategory.toLowerCase())
        );
      });
    }

    // Filtro de categoria antiga (compatibilidade)
    if (filters.category) {
      filtered = filtered.filter(project => project.category === filters.category);
    }

    // Filtro por nível de experiência
    if (filters.experienceLevel) {
      filtered = filtered.filter(project => project.experienceLevel === filters.experienceLevel);
    }

    // Filtro por orçamento
    if (filters.budgetMin) {
      filtered = filtered.filter(project => project.budget.max >= filters.budgetMin!);
    }
    if (filters.budgetMax) {
      filtered = filtered.filter(project => project.budget.min <= filters.budgetMax!);
    }

    // Ordenação
    switch (filters.sortBy) {
      case 'budget_desc':
        filtered = [...filtered].sort((a, b) => (a.budget?.max ?? 0) < (b.budget?.max ?? 0) ? 1 : -1);
        break;
      case 'budget_asc':
        filtered = [...filtered].sort((a, b) => (a.budget?.min ?? 0) - (b.budget?.min ?? 0));
        break;
      case 'deadline':
        filtered = [...filtered].sort((a, b) => {
          const aTime = a.deadline instanceof Date ? a.deadline.getTime() : new Date(a.deadline as any).getTime();
          const bTime = b.deadline instanceof Date ? b.deadline.getTime() : new Date(b.deadline as any).getTime();
          return aTime - bTime;
        });
        break;
      default:
        filtered = [...filtered].sort((a, b) => {
          // Se createdAt for um Timestamp do Firebase, converter para Date
          const dateA = a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt 
            ? a.createdAt.toDate() 
            : new Date(a.createdAt as any);
          const dateB = b.createdAt && typeof b.createdAt === 'object' && 'toDate' in b.createdAt 
            ? b.createdAt.toDate() 
            : new Date(b.createdAt as any);
          return dateB.getTime() - dateA.getTime();
        });
    }

    setFilteredProjects(filtered);
  };

  const handleSubmitProposal = async () => {
    if (!userProfile || !selectedProject) {
      toast({
        title: "Erro",
        description: "Informações do usuário ou projeto não encontradas",
        variant: "destructive",
      });
      return;
    }

    if (!proposalForm.coverLetter.trim() || !proposalForm.proposedBudget || !proposalForm.estimatedDays) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos da proposta",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmittingProposal(true);

      const proposalData: CreateProposalData = {
        projectId: selectedProject.id,
        coverLetter: proposalForm.coverLetter,
        proposedBudget: Number(proposalForm.proposedBudget),
        estimatedDays: Number(proposalForm.estimatedDays),
      };

      await ProjectService.createProposal(
        userProfile.uid,
        userProfile.name,
        userProfile.rating,
        proposalData
      );

      toast({
        title: "Sucesso!",
        description: "Proposta enviada com sucesso!",
      });

      // Limpar formulário e fechar modal
      setProposalForm({
        coverLetter: "",
        proposedBudget: "",
        estimatedDays: "",
      });
      setSelectedProject(null);

      // Recarregar projetos para atualizar contador
      loadProjects();
    } catch (error) {
      console.error('Erro ao enviar proposta:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar proposta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  const getCategoryLabel = (category: ProjectCategory) => {
    const categories = {
      desenvolvimento: "Desenvolvimento",
      design: "Design",
      marketing: "Marketing",
      redacao: "Redação",
      consultoria: "Consultoria",
      outros: "Outros"
    };
    return categories[category] || category;
  };

  const getExperienceLevelLabel = (level: ProjectExperience) => {
    const levels = {
      iniciante: "Iniciante",
      intermediario: "Intermediário",
      avancado: "Avançado"
    };
    return levels[level] || level;
  };

  const getClientStatus = (clientId: string) => {
    if (!presenceInitialized) {
      return {
        isOnline: false,
        label: "Verificando...",
        dotColor: "bg-gray-300 animate-pulse"
      };
    }

    const isOnline = isUserOnline(clientId);
    return {
      isOnline,
      label: isOnline ? "Online" : "Offline",
      dotColor: isOnline ? "bg-green-500" : "bg-gray-400"
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-4 w-full max-w-none md:max-w-[calc(100dvw-300px)] overflow-x-hidden pb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Encontre Trabalho</h1>
          <p className="text-sm md:text-base text-gray-600">Descubra projetos que combinam com suas habilidades</p>
        </div>
        <div className="text-center py-6">
          <p className="text-gray-500">Carregando projetos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-none md:max-w-[calc(100dvw-300px)] overflow-x-hidden pb-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Encontre Trabalho</h1>
        <p className="text-sm md:text-base text-gray-600">Descubra projetos que combinam com suas habilidades</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-4">
          <div className="space-y-4">
            {/* Search bar - sempre visível */}
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                searchTerm.trim() ? 'text-blue-600' : 'text-gray-400'
              }`} />
              <Input
                placeholder="Buscar projetos por título, descrição, habilidade, cliente ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-10 text-base md:text-sm ${
                  searchTerm.trim() ? 'border-blue-300 focus:border-blue-500' : ''
                }`}
              />
              {searchTerm.trim() && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
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
                      {/* Filtros de Categoria e Subcategoria - Mobile */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-gray-700">Categorias e Especialidades</h3>
                        {Object.entries(categoryStructure).map(([category, subcategories]) => (
                          <div key={category} className="border rounded-lg p-3">
                            <div className="flex items-center space-x-2 mb-2">
                              <Checkbox
                                id={`mobile-category-${category}`}
                                checked={filters.selectedCategories?.includes(category) || false}
                                onCheckedChange={(checked) => handleCategoryChange(category, checked as boolean)}
                              />
                              <Label 
                                htmlFor={`mobile-category-${category}`}
                                className="text-sm font-medium text-gray-900 cursor-pointer"
                              >
                                {category}
                              </Label>
                            </div>
                            
                            {filters.selectedCategories?.includes(category) && (
                              <div className="ml-6 space-y-2">
                                {subcategories.map((subcategory) => (
                                  <div key={subcategory} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`mobile-subcategory-${subcategory}`}
                                      checked={filters.selectedSubcategories?.includes(subcategory) || false}
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
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Nível de Experiência</label>
                          <Select onValueChange={(value) => setFilters(prev => ({ ...prev, experienceLevel: value === "all" ? undefined : value as ProjectExperience }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Todos os níveis" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos os níveis</SelectItem>
                              <SelectItem value="iniciante">Iniciante</SelectItem>
                              <SelectItem value="intermediario">Intermediário</SelectItem>
                              <SelectItem value="avancado">Avançado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Orçamento Mínimo</label>
                          <Input
                            type="number"
                            placeholder="R$ 0"
                            onChange={(e) => setFilters(prev => ({ ...prev, budgetMin: Number(e.target.value) || undefined }))}
                          />
                        </div>
                      </div>

                      {/* Botões de ação */}
                      <div className="flex gap-3 pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setFilters({
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
                          className="flex-1 bg-green-600 hover:bg-green-700"
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
                <Select onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value as any }))}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Mais recentes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recente">Mais recentes</SelectItem>
                    <SelectItem value="budget_desc">Maior orçamento</SelectItem>
                    <SelectItem value="budget_asc">Menor orçamento</SelectItem>
                    <SelectItem value="deadline">Prazo mais próximo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filtros ativos */}
            {(searchTerm.trim() || 
             (filters.selectedCategories && filters.selectedCategories.length > 0) || 
             (filters.selectedSubcategories && filters.selectedSubcategories.length > 0)) && (
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="text-sm text-gray-600">Filtros ativos:</span>
                
                {/* Badge de busca */}
                {searchTerm.trim() && (
                  <Badge variant="default" className="flex items-center gap-1 bg-blue-600">
                    <Search className="w-3 h-3" />
                    "{searchTerm}"
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-red-200" 
                      onClick={() => setSearchTerm('')}
                    />
                  </Badge>
                )}
                
                {filters.selectedCategories?.map((category) => (
                  <Badge key={category} variant="secondary" className="flex items-center gap-1">
                    {category}
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-red-600" 
                      onClick={() => handleCategoryChange(category, false)}
                    />
                  </Badge>
                ))}
                {filters.selectedSubcategories?.map((subcategory) => (
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
                        checked={filters.selectedCategories?.includes(category) || false}
                        onCheckedChange={(checked) => handleCategoryChange(category, checked as boolean)}
                      />
                      <Label 
                        htmlFor={`category-${category}`}
                        className="text-sm font-medium text-gray-900 cursor-pointer"
                      >
                        {category}
                        {filters.selectedCategories?.includes(category) && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {filters.selectedSubcategories?.filter(sub => subcategories.includes(sub)).length || 'Todas'}
                          </Badge>
                        )}
                      </Label>
                    </div>
                    
                    {filters.selectedCategories?.includes(category) && (
                      <div className="ml-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {subcategories.map((subcategory) => (
                          <div key={subcategory} className="flex items-center space-x-2">
                            <Checkbox
                              id={`subcategory-${subcategory}`}
                              checked={filters.selectedSubcategories?.includes(subcategory) || false}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Categoria (Legado)</label>
                <Select onValueChange={(value) => setFilters(prev => ({ ...prev, category: value === "all" ? undefined : value as ProjectCategory }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="desenvolvimento">Desenvolvimento</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="redacao">Redação</SelectItem>
                    <SelectItem value="consultoria">Consultoria</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Nível de Experiência</label>
                <Select onValueChange={(value) => setFilters(prev => ({ ...prev, experienceLevel: value === "all" ? undefined : value as ProjectExperience }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="iniciante">Iniciante</SelectItem>
                    <SelectItem value="intermediario">Intermediário</SelectItem>
                    <SelectItem value="avancado">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Orçamento Mín.</label>
                <Input
                  type="number"
                  placeholder="R$ 0"
                  onChange={(e) => setFilters(prev => ({ ...prev, budgetMin: Number(e.target.value) || undefined }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Orçamento Máx.</label>
                <Input
                  type="number"
                  placeholder="R$ 10.000"
                  onChange={(e) => setFilters(prev => ({ ...prev, budgetMax: Number(e.target.value) || undefined }))}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Contador de resultados */}
      {filteredProjects.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {filteredProjects.length} projeto{filteredProjects.length !== 1 ? 's' : ''} encontrado{filteredProjects.length !== 1 ? 's' : ''}
            {searchTerm.trim() && ` para "${searchTerm}"`}
          </p>
        </div>
      )}

      {/* Lista de Projetos */}
      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm.trim() ? 'Nenhum projeto encontrado' : 'Encontre seus projetos'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm.trim() 
                    ? `Não encontramos projetos que correspondam à busca "${searchTerm}". Tente outros termos ou ajuste os filtros.`
                    : 'Para acessá-los, selecione um ou mais filtros, ou pesquise o nome do trabalho na área de pesquisa.'
                  }
                </p>
                {(searchTerm.trim() || 
                  (filters.selectedCategories && filters.selectedCategories.length > 0) || 
                  (filters.selectedSubcategories && filters.selectedSubcategories.length > 0)) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setFilters({
                        selectedCategories: [],
                        selectedSubcategories: []
                      });
                    }}
                    className="text-sm"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Limpar todos os filtros
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ) : (
          filteredProjects.map((project) => (
            <Card key={project.id} className="p-3 md:p-4 hover:shadow-lg transition-shadow">
              <div className="space-y-3">
                {/* Header com título e badges */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">{project.title}</h3>
                    <div className="flex flex-wrap gap-1 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {getCategoryLabel(project.category)}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {getExperienceLevelLabel(project.experienceLevel)}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-lg md:text-xl font-bold text-green-600 mb-1">
                      {(() => {
                        const min = project.budget?.min ?? 0;
                        const max = project.budget?.max ?? 0;
                        return `R$ ${min.toLocaleString()} - R$ ${max.toLocaleString()}`;
                      })()}
                    </div>
                    <div className="text-xs text-gray-500">{project.budget?.type === 'fixo' ? 'Preço fixo' : 'Por hora'}</div>
                  </div>
                </div>

                {/* Descrição */}
                <p className="text-gray-600 text-sm line-clamp-2">{stripHtml(project.description || '')}</p>
                
                {/* Informações do Cliente */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                        {((project.clientName || '').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()) || 'CL'}
                      </AvatarFallback>
                    </Avatar>
                    {/* Indicador de status online */}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${getClientStatus(project.clientId).dotColor} border-2 border-white rounded-full`}></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{project.clientName || 'Cliente'}</p>
                    <p className="text-xs text-gray-500">
                      Cliente{getClientStatus(project.clientId).isOnline ? ' • Online' : ''}
                    </p>
                  </div>
                </div>
              </div>

                {/* Skills */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {(project.skills || []).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>

                {/* Footer com metadados e ações */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Prazo: {(() => {
                          const date = project.deadline instanceof Date ? project.deadline : new Date(project.deadline as any);
                          return isNaN(date.getTime()) ? '-' : format(date, "dd/MM/yyyy", { locale: ptBR });
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      <span>{project.likesCount || 0} interessados</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <LikeProjectButton
                      projectId={project.id}
                      projectTitle={project.title}
                      currentLikesCount={project.likesCount || 0}
                      maxLikes={project.maxLikes || 80}
                      isProjectActive={project.status === 'recebendo_propostas'}
                      onLikeSuccess={() => {
                        toast({
                          title: "Sucesso!",
                          description: "Interesse demonstrado com sucesso!",
                        });
                        loadProjects(); // Recarregar para atualizar contador
                      }}
                      onUnlikeSuccess={() => {
                        toast({
                          title: "Interesse removido",
                          description: "Sua curtida foi removida com sucesso.",
                        });
                        loadProjects(); // Recarregar para atualizar contador
                      }}
                    />
                  </div>
                </div>
            </Card>
          ))
        )}
      </div>
      

    </div>
  );
};

export default EncontreTrabalho;
