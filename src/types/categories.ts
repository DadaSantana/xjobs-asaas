// Estrutura de categorias e subcategorias
export const categoryStructure = {
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

// Interface para categoria e subcategoria
export interface CategoryData {
  category: string;
  subcategory: string;
}

// Função para obter todas as categorias
export const getCategories = (): string[] => {
  return Object.keys(categoryStructure);
};

// Função para obter subcategorias de uma categoria
export const getSubcategories = (category: string): string[] => {
  return categoryStructure[category as keyof typeof categoryStructure] || [];
};

// Função para verificar se uma categoria existe
export const isCategoryValid = (category: string): boolean => {
  return category in categoryStructure;
};

// Função para verificar se uma subcategoria é válida para uma categoria
export const isSubcategoryValid = (category: string, subcategory: string): boolean => {
  const subcategories = getSubcategories(category);
  return subcategories.includes(subcategory);
};

// Mapeamento para categorias do projeto (backward compatibility)
export const mapCategoryToProject = (category: string): string => {
  switch (category) {
    case "Design Gráfico":
      return "design";
    case "Comunicação e Marketing":
      return "marketing";
    case "Programação e TI":
      return "desenvolvimento";
    case "PJ Home Office":
      return "outros";
    default:
      return "outros";
  }
};

// Mapeamento reverso do projeto para categoria
export const mapProjectToCategory = (projectCategory: string): string => {
  switch (projectCategory) {
    case "design":
      return "Design Gráfico";
    case "marketing":
      return "Comunicação e Marketing";
    case "desenvolvimento":
      return "Programação e TI";
    case "outros":
      return "PJ Home Office";
    default:
      return "PJ Home Office";
  }
}; 