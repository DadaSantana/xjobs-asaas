import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileUpload } from "@/components/ui/file-upload";
import { CalendarIcon, X, Plus, ArrowLeft, Bold, Italic, List, ListOrdered, Link2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAppSelector } from "@/hooks/redux";
import { ProjectService } from "@/services/projectService";
import { CreateProjectData, ProjectCategory, ProjectExperience, ProjectAttachment } from "@/types/project";
import { categoryStructure, getCategories, getSubcategories, mapCategoryToProject } from "@/types/categories";
import { cn } from "@/lib/utils";

const projectSchema = z.object({
  title: z.string().min(10, "Título deve ter pelo menos 10 caracteres"),
  category: z.enum(["desenvolvimento", "design", "marketing", "redacao", "consultoria", "outros"]),
  budgetMin: z.number().min(30, "Valor mínimo é R$ 30"),
  budgetMax: z.number().min(30, "Valor mínimo é R$ 30").max(10000, "Valor máximo é R$ 10.000"),
  budgetType: z.enum(["fixo", "por_hora"]),
  deadline: z.date({
    required_error: "Prazo é obrigatório",
  }),
  experienceLevel: z.enum(["iniciante", "intermediario", "avancado"]),
}).refine((data) => data.budgetMax >= data.budgetMin, {
  message: "Orçamento máximo deve ser maior ou igual ao mínimo",
  path: ["budgetMax"],
});

type ProjectFormData = z.infer<typeof projectSchema>;

// Componente Editor de Texto Rico Simples
const RichTextEditor = ({ value, onChange, error }: { 
  value: string; 
  onChange: (value: string) => void; 
  error?: string;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Salvar e restaurar posição do cursor
  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      return selection.getRangeAt(0);
    }
    return null;
  };

  const restoreSelection = (range: Range | null) => {
    if (range) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  const handleFormat = (command: string, value?: string) => {
    const range = saveSelection();
    
    // Focar no editor antes do comando
    if (editorRef.current) {
      editorRef.current.focus();
    }
    
    // Executar comando
    const success = document.execCommand(command, false, value);
    
    // Atualizar conteúdo após comando
    setTimeout(() => {
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
        
        // Restaurar seleção apenas se o comando foi bem-sucedido
        if (success && range) {
          restoreSelection(range);
        }
      }
    }, 10);
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Atalhos de teclado
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          handleFormat('bold');
          break;
        case 'i':
          e.preventDefault();
          handleFormat('italic');
          break;
      }
    }
  };

  // Sincronizar conteúdo quando value muda externamente
  useEffect(() => {
    if (editorRef.current) {
      // Apenas atualizar se o conteúdo for diferente e não estiver focado
      if (editorRef.current.innerHTML !== value && !isFocused) {
        editorRef.current.innerHTML = value;
      }
    }
  }, [value, isFocused]);

  return (
    <div className={`border rounded-md ${error ? 'border-red-500' : 'border-gray-300'} ${isFocused ? 'ring-2 ring-blue-500' : ''} relative`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-gray-50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat('bold')}
          className="h-8 w-8 p-0"
          title="Negrito (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat('italic')}
          className="h-8 w-8 p-0"
          title="Itálico (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat('insertUnorderedList')}
          className="h-8 w-8 p-0"
          title="Lista com marcadores"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat('insertOrderedList')}
          className="h-8 w-8 p-0"
          title="Lista numerada"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const url = prompt('Digite o URL:');
            if (url) handleFormat('createLink', url);
          }}
          className="h-8 w-8 p-0"
          title="Inserir link"
        >
          <Link2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="p-4 min-h-[250px] focus:outline-none overflow-y-auto rich-editor-scroll bg-white"
        style={{ 
          minHeight: '200px',
          maxHeight: '300px',
          lineHeight: '1.6',
          fontSize: '14px'
        }}
        suppressContentEditableWarning={true}
      />
      
      {/* Placeholder quando vazio */}
      {(!value || value === '<br>' || value === '<div><br></div>') && (
        <div className="absolute top-16 left-4 text-gray-400 pointer-events-none z-10 p-4">
          Descreva detalhadamente o que você precisa, incluindo funcionalidades, objetivos, requisitos específicos, tecnologias preferidas...
        </div>
      )}
    </div>
  );
};

const PublicarProjeto = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const userProfile = useAppSelector(state => state.auth.userProfile);
  
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    setValue,
    watch
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      budgetMin: 30,
      budgetMax: 30,
    }
  });

  const watchedDeadline = watch("deadline");

  const categories: { value: ProjectCategory; label: string }[] = [
    { value: "desenvolvimento", label: "Desenvolvimento" },
    { value: "design", label: "Design" },
    { value: "marketing", label: "Marketing" },
    { value: "redacao", label: "Redação" },
    { value: "consultoria", label: "Consultoria" },
    { value: "outros", label: "Outros" },
  ];

  const experienceLevels: { value: ProjectExperience; label: string }[] = [
    { value: "iniciante", label: "Iniciante" },
    { value: "intermediario", label: "Intermediário" },
    { value: "avancado", label: "Avançado" },
  ];

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const onSubmit = async (data: ProjectFormData) => {
    console.log('onSubmit chamado com:', data);
    console.log('userProfile:', userProfile);
    console.log('skills:', skills);
    console.log('description:', description);

    // Validação adicional: orçamento máximo não pode ser menor que o mínimo
    if (data.budgetMax < data.budgetMin) {
      toast({
        title: "Erro",
        description: "O orçamento máximo não pode ser menor que o mínimo.",
        variant: "destructive",
      });
      return;
    }
    
    if (!userProfile) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para publicar um projeto",
        variant: "destructive",
      });
      return;
    }

    if (skills.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos uma habilidade necessária",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCategory) {
      toast({
        title: "Erro",
        description: "Selecione uma categoria para o projeto",
        variant: "destructive",
      });
      return;
    }

    if (!selectedSubcategory) {
      toast({
        title: "Erro",
        description: "Selecione uma subcategoria para o projeto",
        variant: "destructive",
      });
      return;
    }

    // Verificar se a descrição está válida
    const cleanDescription = description.replace(/<[^>]*>/g, '').trim();
    const isDescriptionEmpty = !description.trim() || 
                              description === '<br>' || 
                              description === '<div><br></div>' || 
                              cleanDescription.length === 0;
    
    const isDescriptionTooShort = cleanDescription.length < 50;
    
    console.log('Descrição vazia?', isDescriptionEmpty);
    console.log('Descrição muito curta?', isDescriptionTooShort, 'Tamanho:', cleanDescription.length);
    
    if (isDescriptionEmpty) {
      toast({
        title: "Erro",
        description: "A descrição do projeto é obrigatória",
        variant: "destructive",
      });
      return;
    }

    if (isDescriptionTooShort) {
      toast({
        title: "Erro",
        description: "A descrição deve ter pelo menos 50 caracteres",
        variant: "destructive",
      });
      return;
    }

    console.log('Iniciando publicação do projeto...');
    setIsLoading(true);

    try {
      // 1. Primeiro criar o projeto sem anexos
      const projectData: CreateProjectData = {
        title: data.title,
        description: description, // Usar a descrição do editor rico
        category: data.category,
        newCategory: selectedCategory, // Nova categoria estruturada
        newSubcategory: selectedSubcategory, // Nova subcategoria estruturada
        skills,
        budget: {
          min: data.budgetMin,
          max: data.budgetMax,
          type: data.budgetType,
        },
        deadline: data.deadline,
        experienceLevel: data.experienceLevel,
        clientId: userProfile.uid,
        clientName: userProfile.name || 'Cliente',
        attachments: [] // Começar sem anexos
      };

      console.log('Dados do projeto:', projectData);

      const projectId = await ProjectService.createProject(projectData);
      
      console.log('Projeto criado com ID:', projectId);

      // 2. Se há anexos, fazer upload com o ID real do projeto
      if (attachments.length > 0) {
        console.log('Processando anexos:', attachments);
        const uploadedAttachments: ProjectAttachment[] = [];
        
        for (const attachment of attachments) {
          // Re-upload com ID real do projeto (se foi feito upload temporário)
          if (attachment.url.includes('/temp/')) {
            // TODO: Implementar transferência de arquivo temporário
            uploadedAttachments.push(attachment);
          } else {
            uploadedAttachments.push(attachment);
          }
        }

        // Atualizar projeto com anexos (seria necessário implementar método updateProject)
        // await ProjectService.updateProjectAttachments(projectId, uploadedAttachments);
      }

      toast({
        title: "Sucesso!",
        description: "Projeto publicado com sucesso!",
      });

      setSkills([]);
      setAttachments([]);
      setDescription("");
      setSelectedCategory("");
      setSelectedSubcategory("");
      navigate('/cliente/meus-projetos');
    } catch (error) {
      console.error('Erro ao publicar projeto:', error);
      toast({
        title: "Erro",
        description: `Erro ao publicar projeto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 w-full min-h-screen">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/cliente/visao-geral')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Publicar Novo Projeto</h1>
              <p className="text-gray-600">Descreva seu projeto e encontre o freelancer ideal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Layout Principal em Duas Colunas */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit(onSubmit, (errors) => {
          console.log('Erro de validação:', errors);
          toast({
            title: "Erro de Validação",
            description: "Por favor, verifique os campos obrigatórios",
            variant: "destructive",
          });
        })}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* COLUNA 1 - Título, Categoria e Editor Rico */}
            <div className="space-y-6">
              <Card className="p-6">
                <div className="space-y-6">
                  {/* Título */}
                  <div>
                    <Label htmlFor="title" className="text-lg font-semibold">Título do Projeto *</Label>
                    <Input
                      id="title"
                      {...register("title")}
                      placeholder="Ex: Desenvolvimento de aplicativo mobile para delivery"
                      className="mt-2 text-lg h-12"
                    />
                    {errors.title && (
                      <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
                    )}
                  </div>

                  {/* Nova Categoria */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-lg font-semibold">Categoria *</Label>
                      <Select 
                        value={selectedCategory} 
                        onValueChange={(value) => {
                          setSelectedCategory(value);
                          setSelectedSubcategory(""); // Reset subcategoria
                          setValue("category", mapCategoryToProject(value) as ProjectCategory, { shouldValidate: true });
                        }}
                      >
                        <SelectTrigger className="mt-2 h-12">
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {getCategories().map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.category && (
                        <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
                      )}
                    </div>

                    {/* Subcategoria */}
                    {selectedCategory && (
                      <div>
                        <Label className="text-lg font-semibold">Subcategoria *</Label>
                        <Select 
                          value={selectedSubcategory} 
                          onValueChange={setSelectedSubcategory}
                        >
                          <SelectTrigger className="mt-2 h-12">
                            <SelectValue placeholder="Selecione uma subcategoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {getSubcategories(selectedCategory).map((subcategory) => (
                              <SelectItem key={subcategory} value={subcategory}>
                                {subcategory}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Editor de Texto Rico */}
              <Card className="p-6">
                <Label className="text-lg font-semibold mb-4 block">Descrição Detalhada *</Label>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  error={(() => {
                    const cleanDescription = description.replace(/<[^>]*>/g, '').trim();
                    const isEmpty = !description.trim() || description === '<br>' || description === '<div><br></div>' || cleanDescription.length === 0;
                    const isTooShort = cleanDescription.length > 0 && cleanDescription.length < 50;
                    
                    if (isEmpty) return "Descrição é obrigatória";
                    if (isTooShort) return "Descrição deve ter pelo menos 50 caracteres";
                    return undefined;
                  })()}
                />
                {(() => {
                  const cleanDescription = description.replace(/<[^>]*>/g, '').trim();
                  const isEmpty = !description.trim() || description === '<br>' || description === '<div><br></div>' || cleanDescription.length === 0;
                  const isTooShort = cleanDescription.length > 0 && cleanDescription.length < 50;
                  
                  if (isEmpty) {
                    return <p className="text-red-500 text-sm mt-1">Descrição detalhada é obrigatória</p>;
                  }
                  if (isTooShort) {
                    return <p className="text-red-500 text-sm mt-1">Descrição deve ter pelo menos 50 caracteres (atual: {cleanDescription.length})</p>;
                  }
                  return <p className="text-green-600 text-sm mt-1">✓ Descrição válida ({cleanDescription.length} caracteres)</p>;
                })()}
              </Card>
            </div>

            {/* COLUNA 2 - Demais Inputs */}
            <div className="space-y-6">
              {/* Habilidades */}
              <Card className="p-6">
                <Label className="text-lg font-semibold">Habilidades Necessárias *</Label>
                <div className="mt-4 space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Ex: React, Node.js, Figma..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    />
                    <Button type="button" onClick={addSkill} variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="px-3 py-1">
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="ml-2 hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              {/* Orçamento */}
              <Card className="p-6">
                <Label className="text-lg font-semibold mb-4 block">Orçamento</Label>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="budgetMin">Mínimo (R$) *</Label>
                      <Input
                        id="budgetMin"
                        type="number"
                        min={30}
                        max={10000}
                        {...register("budgetMin", { valueAsNumber: true })}
                        placeholder="30"
                        className="mt-1"
                      />
                      {errors.budgetMin && (
                        <p className="text-red-500 text-sm mt-1">{errors.budgetMin.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="budgetMax">Máximo (R$) *</Label>
                      <Input
                        id="budgetMax"
                        type="number"
                        min={30}
                        max={10000}
                        {...register("budgetMax", { valueAsNumber: true })}
                        placeholder="10000"
                        className="mt-1"
                      />
                      {errors.budgetMax && (
                        <p className="text-red-500 text-sm mt-1">{errors.budgetMax.message}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Tipo de Orçamento *</Label>
                    <Select onValueChange={(value) => setValue("budgetType", value as "fixo" | "por_hora", { shouldValidate: true })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixo">Preço Fixo</SelectItem>
                        <SelectItem value="por_hora">Por Hora</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.budgetType && (
                      <p className="text-red-500 text-sm mt-1">{errors.budgetType.message}</p>
                    )}
                  </div>
                </div>
              </Card>

              {/* Prazo e Experiência */}
              <Card className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-lg font-semibold">Prazo de Entrega *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full mt-2 justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {watchedDeadline ? (
                            format(watchedDeadline, "PPP", { locale: ptBR })
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={watchedDeadline}
                          onSelect={(date) => date && setValue("deadline", date, { shouldValidate: true })}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.deadline && (
                      <p className="text-red-500 text-sm mt-1">{errors.deadline.message}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-lg font-semibold">Nível de Experiência *</Label>
                    <Select onValueChange={(value) => setValue("experienceLevel", value as ProjectExperience, { shouldValidate: true })}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Selecione o nível" />
                      </SelectTrigger>
                      <SelectContent>
                        {experienceLevels.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.experienceLevel && (
                      <p className="text-red-500 text-sm mt-1">{errors.experienceLevel.message}</p>
                    )}
                  </div>
                </div>
              </Card>

              {/* Upload de Arquivos */}
              <Card className="p-6">
                <Label className="text-lg font-semibold mb-4 block">Anexos</Label>
                <p className="text-gray-600 mb-4 text-sm">
                  Anexe documentos, imagens ou outros arquivos que possam ajudar os freelancers.
                </p>
                
                <FileUpload
                  attachments={attachments}
                  onAttachmentsChange={setAttachments}
                  projectId="temp"
                  maxFiles={5}
                  disabled={isLoading}
                />
              </Card>

              {/* Botões de Ação */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/cliente/visao-geral')}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || isSubmitting}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    console.log('Botão clicado!');
                    console.log('Errors:', errors);
                    console.log('isValid:', isValid);
                    console.log('Form values:', watch());
                  }}
                >
                  {isLoading || isSubmitting ? "Publicando..." : "Publicar Projeto"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PublicarProjeto;
