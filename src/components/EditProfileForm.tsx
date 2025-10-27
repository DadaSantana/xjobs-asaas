import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DocumentUpload } from "@/components/DocumentUpload";
import { 
  Camera, 
  Save, 
  Plus, 
  Trash2, 
  Upload,
  Loader2,
  X,
  Star,
  Image as ImageIcon,
  Video,
  FileText,
  Play
} from 'lucide-react';
import { UserProfile, UpdateProfileData, PortfolioItem, Certification } from '@/types/user';
import { UserProfileService } from '@/services/userProfileService';
import { AuthService } from '@/services/authService';
import { categoryStructure, getCategories, getSubcategories } from '@/types/categories';
import { useToast } from '@/hooks/use-toast';

interface EditProfileFormProps {
  userProfile: UserProfile;
  onProfileUpdate: (updatedProfile: UserProfile) => void;
}

export const EditProfileForm: React.FC<EditProfileFormProps> = ({
  userProfile,
  onProfileUpdate
}) => {
  const [profile, setProfile] = useState<UpdateProfileData>({
    skills: []
  });
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingPortfolioImages, setUploadingPortfolioImages] = useState(false);
  const [uploadingPortfolioVideos, setUploadingPortfolioVideos] = useState(false);
  const [uploadingCertificationImage, setUploadingCertificationImage] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  
  // Estados para modais
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [showCertificationModal, setShowCertificationModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  
  console.log('EditProfileForm renderizado - showEmailModal:', showEmailModal);
  
  // Estados para alteração de email
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [updatingEmail, setUpdatingEmail] = useState(false);
  
  // Estados para novos itens
  const [newPortfolioItem, setNewPortfolioItem] = useState<Partial<PortfolioItem>>({
    title: '',
    description: '',
    images: [],
    technologies: [],
    completedAt: new Date(),
    projectUrl: '',
    value: 0,
    documents: [],
    videos: [],
    coverVideo: ''
  });
  
  const [newCertification, setNewCertification] = useState<Partial<Certification>>({
    name: '',
    issuer: '',
    dateIssued: new Date(),
    credentialUrl: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    // Inicializar formulário com dados do perfil atual
    setProfile({
      name: userProfile.name,
      bio: userProfile.bio || '',
      location: userProfile.location || '',
      phone: userProfile.phone || '',
      linkedInUrl: userProfile.linkedInUrl || '',
      cnpj: userProfile.cnpj || '',
      skills: userProfile.skills || [],
      hourlyRate: userProfile.hourlyRate || 0,
      availability: userProfile.availability || 'disponivel',
      specialization: userProfile.specialization || '',
      experience: userProfile.experience || 'iniciante',
      companyName: userProfile.companyName || '',
      companySize: userProfile.companySize || 'startup',
      industry: userProfile.industry || '',
      category: userProfile.category || '',
      subcategory: userProfile.subcategory || '',
      cep: userProfile.cep || '',
      state: userProfile.state || '',
      city: userProfile.city || '',
      street: userProfile.street || '',
      number: userProfile.number || ''
    });
    
    // Inicializar categoria e subcategoria selecionadas
    setSelectedCategory(userProfile.category || '');
    setSelectedSubcategory(userProfile.subcategory || '');
  }, [userProfile]);

  const handleSaveProfile = async () => {
    if (!userProfile.uid) return;

    setLoading(true);
    try {
      // Incluir categoria e subcategoria no perfil
      const profileData = {
        ...profile,
        category: selectedCategory,
        subcategory: selectedSubcategory
      };
      
      await UserProfileService.updateProfile(userProfile.uid, profileData);
      
      // Buscar perfil atualizado
      const updatedProfile = await UserProfileService.getUserProfile(userProfile.uid);
      if (updatedProfile) {
        onProfileUpdate(updatedProfile);
      }

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao atualizar perfil",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userProfile.uid) return;

    // Validar tipo e tamanho do arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de imagem",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB",
        variant: "destructive"
      });
      return;
    }

    setUploadingImage(true);
    try {
      const imageUrl = await UserProfileService.uploadProfileImage(userProfile.uid, file);
      setProfile(prev => ({ ...prev, profileImage: imageUrl }));
      
      toast({
        title: "Sucesso",
        description: "Imagem de perfil atualizada!",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha no upload da imagem",
        variant: "destructive"
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    
    const currentSkills = profile.skills || [];
    if (!currentSkills.includes(newSkill.trim())) {
      setProfile(prev => ({
        ...prev,
        skills: [...currentSkills, newSkill.trim()]
      }));
    }
    setNewSkill('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setProfile(prev => ({
      ...prev,
      skills: (prev.skills || []).filter(skill => skill !== skillToRemove)
    }));
  };

  const handlePortfolioImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length || !userProfile.uid) return;

    // Validar arquivos
    const invalidFiles = files.filter(file => !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      toast({
        title: "Erro",
        description: "Todos os arquivos devem ser imagens de até 5MB",
        variant: "destructive"
      });
      return;
    }

    setUploadingPortfolioImages(true);
    try {
      const imageUrls = await UserProfileService.uploadPortfolioImages(userProfile.uid, files);
      setNewPortfolioItem(prev => ({
        ...prev,
        images: [...(prev.images || []), ...imageUrls],
        coverImage: prev.coverImage || imageUrls[0] // Define a primeira como capa se não houver
      }));

      toast({
        title: "Sucesso",
        description: `${imageUrls.length} imagem(ns) adicionada(s)!`,
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha no upload das imagens",
        variant: "destructive"
      });
    } finally {
      setUploadingPortfolioImages(false);
    }
  };

  const handleSetCoverImage = (imageUrl: string) => {
    setNewPortfolioItem(prev => ({
      ...prev,
      coverImage: imageUrl
    }));
  };

  const handleRemovePortfolioImage = (imageUrl: string) => {
    setNewPortfolioItem(prev => {
      const newImages = (prev.images || []).filter(img => img !== imageUrl);
      return {
        ...prev,
        images: newImages,
        coverImage: prev.coverImage === imageUrl ? (newImages[0] || undefined) : prev.coverImage
      };
    });
  };

  const handlePortfolioVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length || !userProfile.uid) return;

    // Validar arquivos
    const invalidFiles = files.filter(file => !file.type.startsWith('video/') || file.size > 50 * 1024 * 1024); // 50MB para vídeos
    if (invalidFiles.length > 0) {
      toast({
        title: "Erro",
        description: "Todos os arquivos devem ser vídeos de até 50MB",
        variant: "destructive"
      });
      return;
    }

    setUploadingPortfolioVideos(true);
    try {
      const videoUrls = await UserProfileService.uploadPortfolioVideos(userProfile.uid, files);
      setNewPortfolioItem(prev => ({
        ...prev,
        videos: [...(prev.videos || []), ...videoUrls],
        coverVideo: prev.coverVideo || videoUrls[0] // Define o primeiro como capa se não houver
      }));

      toast({
        title: "Sucesso",
        description: `${videoUrls.length} vídeo(s) adicionado(s)!`,
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha no upload dos vídeos",
        variant: "destructive"
      });
    } finally {
      setUploadingPortfolioVideos(false);
    }
  };

  const handleSetCoverVideo = (videoUrl: string) => {
    setNewPortfolioItem(prev => ({
      ...prev,
      coverVideo: videoUrl
    }));
  };

  const handleRemovePortfolioVideo = (videoUrl: string) => {
    setNewPortfolioItem(prev => {
      const newVideos = (prev.videos || []).filter(vid => vid !== videoUrl);
      return {
        ...prev,
        videos: newVideos,
        coverVideo: prev.coverVideo === videoUrl ? (newVideos[0] || undefined) : prev.coverVideo
      };
    });
  };

  const handleAddPortfolioItem = async () => {
    if (!userProfile.uid || !newPortfolioItem.title || !newPortfolioItem.description) {
      toast({
        title: "Erro",
        description: "Preencha pelo menos o título e descrição",
        variant: "destructive"
      });
      return;
    }

    try {
      await UserProfileService.addPortfolioItem(userProfile.uid, {
        title: newPortfolioItem.title,
        description: newPortfolioItem.description,
        images: newPortfolioItem.images || [],
        coverImage: newPortfolioItem.coverImage,
        technologies: newPortfolioItem.technologies || [],
        completedAt: newPortfolioItem.completedAt || new Date(),
        projectUrl: newPortfolioItem.projectUrl,
        value: newPortfolioItem.value,
        documents: newPortfolioItem.documents || [],
        videos: newPortfolioItem.videos || [],
        coverVideo: newPortfolioItem.coverVideo
      });

      // Buscar perfil atualizado
      const updatedProfile = await UserProfileService.getUserProfile(userProfile.uid);
      if (updatedProfile) {
        onProfileUpdate(updatedProfile);
      }

      setShowPortfolioModal(false);
      setNewPortfolioItem({
        title: '',
        description: '',
        images: [],
        technologies: [],
        completedAt: new Date(),
        projectUrl: '',
        value: 0,
        coverImage: undefined,
        documents: [],
        videos: [],
        coverVideo: ''
      });

      toast({
        title: "Sucesso",
        description: "Item adicionado ao portfólio!",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao adicionar item ao portfólio",
        variant: "destructive"
      });
    }
  };

  const handleRemovePortfolioItem = async (item: PortfolioItem) => {
    if (!userProfile.uid) return;

    try {
      await UserProfileService.removePortfolioItem(userProfile.uid, item);
      
      // Buscar perfil atualizado
      const updatedProfile = await UserProfileService.getUserProfile(userProfile.uid);
      if (updatedProfile) {
        onProfileUpdate(updatedProfile);
      }

      toast({
        title: "Sucesso",
        description: "Item removido do portfólio",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao remover item do portfólio",
        variant: "destructive"
      });
    }
  };

  const handleCertificationImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userProfile.uid) return;

    // Validar arquivo
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "Arquivo deve ser uma imagem de até 5MB",
        variant: "destructive"
      });
      return;
    }

    setUploadingCertificationImage(true);
    try {
      const imageUrl = await UserProfileService.uploadCertificationImage(userProfile.uid, file);
      setNewCertification(prev => ({
        ...prev,
        imageUrl: imageUrl
      }));

      toast({
        title: "Sucesso",
        description: "Imagem da certificação adicionada!",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha no upload da imagem",
        variant: "destructive"
      });
    } finally {
      setUploadingCertificationImage(false);
    }
  };

  const handleRemoveCertificationImage = () => {
    setNewCertification(prev => ({
      ...prev,
      imageUrl: undefined
    }));
  };

  const handleAddCertification = async () => {
    if (!userProfile.uid || !newCertification.name || !newCertification.issuer) {
      toast({
        title: "Erro",
        description: "Preencha pelo menos o nome e emissor da certificação",
        variant: "destructive"
      });
      return;
    }

    try {
      await UserProfileService.addCertification(userProfile.uid, {
        name: newCertification.name,
        issuer: newCertification.issuer,
        dateIssued: newCertification.dateIssued || new Date(),
        credentialUrl: newCertification.credentialUrl,
        imageUrl: newCertification.imageUrl
      });

      // Buscar perfil atualizado
      const updatedProfile = await UserProfileService.getUserProfile(userProfile.uid);
      if (updatedProfile) {
        onProfileUpdate(updatedProfile);
      }

      setShowCertificationModal(false);
      setNewCertification({
        name: '',
        issuer: '',
        dateIssued: new Date(),
        credentialUrl: '',
        imageUrl: undefined
      });

      toast({
        title: "Sucesso",
        description: "Certificação adicionada!",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao adicionar certificação",
        variant: "destructive"
      });
    }
  };

  const handleRemoveCertification = async (certification: Certification) => {
    if (!userProfile.uid) return;

    try {
      await UserProfileService.removeCertification(userProfile.uid, certification);
      
      // Buscar perfil atualizado
      const updatedProfile = await UserProfileService.getUserProfile(userProfile.uid);
      if (updatedProfile) {
        onProfileUpdate(updatedProfile);
      }

      toast({
        title: "Sucesso",
        description: "Certificação removida",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao remover certificação",
        variant: "destructive"
      });
    }
  };

  const handleUpdateEmail = async () => {
    console.log('=== INÍCIO handleUpdateEmail ===');
    console.log('newEmail:', newEmail);
    console.log('currentPassword preenchido:', !!currentPassword);
    console.log('userProfile.email:', userProfile.email);
    console.log('updatingEmail antes:', updatingEmail);
    
    if (!newEmail || !currentPassword) {
      console.log('ERRO: Campos não preenchidos');
      toast({
        title: "Erro",
        description: "Preencha o novo email e sua senha atual",
        variant: "destructive"
      });
      return;
    }

    if (newEmail === userProfile.email) {
      console.log('ERRO: Email igual ao atual');
      toast({
        title: "Erro",
        description: "O novo email deve ser diferente do atual",
        variant: "destructive"
      });
      return;
    }

    console.log('Definindo updatingEmail = true');
    setUpdatingEmail(true);
    
    try {
      console.log('=== CHAMANDO AuthService.updateUserEmail ===');
      console.log('Parâmetros:', { newEmail, passwordLength: currentPassword.length });
      
      await AuthService.updateUserEmail(newEmail, currentPassword);
      
      console.log('=== Email de verificação enviado com sucesso ===');
      
      // Fechar modal imediatamente
      console.log('Fechando modal...');
      setShowEmailModal(false);
      setNewEmail('');
      setCurrentPassword('');

      // Atualizar estado local rapidamente e exibir toast
      console.log('Atualizando perfil local e exibindo toast...');
      onProfileUpdate({ ...userProfile, email: newEmail });
      toast({
        title: "Sucesso",
        description: "Email atualizado com sucesso! Recarregando a página...",
        variant: "default"
      });

      // Recarregar a página para refletir completamente as mudanças
      setTimeout(() => {
        window.location.reload();
      }, 1200);
      
    } catch (error: any) {
      console.error('=== ERRO CAPTURADO em handleUpdateEmail ===');
      console.error('Erro completo:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      let errorMessage = "Falha ao atualizar email";
      
      if (error.code === 'auth/wrong-password') {
        errorMessage = "Senha atual incorreta";
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Este email já está sendo usado por outra conta";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Email inválido";
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = "Por segurança, faça login novamente antes de alterar o email";
      }
      
      console.log('Mostrando toast de erro:', errorMessage);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      console.log('Definindo updatingEmail = false');
      setUpdatingEmail(false);
      console.log('=== FIM handleUpdateEmail ===');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg sm:text-xl text-center sm:text-left">Editar Perfil</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className={`grid w-full ${userProfile.role === 'freelancer' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'} gap-1 sm:gap-0 h-auto sm:h-10`}>
              <TabsTrigger value="basic" className="text-xs sm:text-sm py-2 sm:py-1.5">Informações Básicas</TabsTrigger>
              <TabsTrigger value="professional" className="text-xs sm:text-sm py-2 sm:py-1.5">Profissional</TabsTrigger>
              {userProfile.role === 'freelancer' && (
                <TabsTrigger value="portfolio" className="text-xs sm:text-sm py-2 sm:py-1.5">Portfólio & Certificações</TabsTrigger>
              )}
            </TabsList>

            {/* Informações Básicas */}
            <TabsContent value="basic" className="space-y-4 sm:space-y-6">
              {/* Foto de Perfil */}
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24">
                  <AvatarImage 
                    src={profile.profileImage || userProfile.profileImage} 
                    alt={userProfile.name} 
                  />
                  <AvatarFallback className="text-base sm:text-lg">
                    {userProfile.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="text-center sm:text-left">
                  <Label htmlFor="profile-image" className="cursor-pointer">
                    <div className="flex items-center gap-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                      {uploadingImage ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                      {uploadingImage ? 'Enviando...' : 'Alterar Foto'}
                    </div>
                    <Input
                      id="profile-image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">
                    Máximo 5MB • JPG, PNG ou GIF
                  </p>
                </div>
              </div>

              {/* Campos Básicos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={profile.name || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Seu nome completo"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="flex gap-2">
                    <Input
                      id="email"
                      value={userProfile.email}
                      disabled
                      className="bg-gray-50"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        console.log('=== BOTÃO ALTERAR EMAIL CLICADO ===');
                        console.log('Email atual:', userProfile.email);
                        setNewEmail(userProfile.email);
                        setShowEmailModal(true);
                        console.log('Modal definido para abrir');
                      }}
                    >
                      Alterar
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="location">Localização</Label>
                  <Input
                    id="location"
                    value={profile.location || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Cidade, Estado"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={profile.phone || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div>
                  <Label htmlFor="linkedInUrl">LinkedIn</Label>
                  <Input
                    id="linkedInUrl"
                    value={profile.linkedInUrl || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, linkedInUrl: e.target.value }))}
                    placeholder="https://linkedin.com/in/seu-perfil"
                  />
                </div>

                {userProfile.role === 'client' && (
                  <div>
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={profile.cnpj || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev, cnpj: e.target.value }))}
                      placeholder="XX.XXX.XXX/XXXX-XX"
                    />
                  </div>
                )}
              </div>

              {/* Bio */}
              <div>
                <Label htmlFor="bio">Sobre você</Label>
                <Textarea
                  id="bio"
                  value={profile.bio || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Conte um pouco sobre você, sua experiência e motivações..."
                  rows={4}
                  maxLength={500}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Descreva sua experiência e especialidades</span>
                  <span>{(profile.bio || '').length}/500</span>
                </div>
              </div>
            </TabsContent>

            {/* Informações Profissionais */}
            <TabsContent value="professional" className="space-y-6">
              {userProfile.role === 'freelancer' ? (
                <>
                  {/* Categoria e Subcategoria para Freelancer */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="category">Categoria Principal *</Label>
                      <Select 
                        value={selectedCategory} 
                        onValueChange={(value) => {
                          setSelectedCategory(value);
                          setSelectedSubcategory(""); // Reset subcategoria
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione sua área principal" />
                        </SelectTrigger>
                        <SelectContent>
                          {getCategories().map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedCategory && (
                      <div>
                        <Label htmlFor="subcategory">Especialização *</Label>
                        <Select 
                          value={selectedSubcategory} 
                          onValueChange={setSelectedSubcategory}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione sua especialização" />
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

                  {/* Campos para Freelancer */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="specialization">Especialização</Label>
                      <Input
                        id="specialization"
                        value={profile.specialization || ''}
                        onChange={(e) => setProfile(prev => ({ ...prev, specialization: e.target.value }))}
                        placeholder="Ex: Desenvolvedor Full Stack"
                      />
                    </div>

                    <div>
                      <Label htmlFor="hourlyRate">Valor por Hora (R$)</Label>
                      <Input
                        id="hourlyRate"
                        type="number"
                        value={profile.hourlyRate || ''}
                        onChange={(e) => setProfile(prev => ({ ...prev, hourlyRate: Number(e.target.value) }))}
                        placeholder="50"
                      />
                    </div>

                    <div>
                      <Label htmlFor="experience">Nível de Experiência</Label>
                      <Select 
                        value={profile.experience || 'iniciante'} 
                        onValueChange={(value) => setProfile(prev => ({ ...prev, experience: value as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="iniciante">Iniciante</SelectItem>
                          <SelectItem value="intermediario">Intermediário</SelectItem>
                          <SelectItem value="avancado">Avançado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="availability">Disponibilidade</Label>
                      <Select 
                        value={profile.availability || 'disponivel'} 
                        onValueChange={(value) => setProfile(prev => ({ ...prev, availability: value as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="disponivel">Disponível</SelectItem>
                          <SelectItem value="ocupado">Ocupado</SelectItem>
                          <SelectItem value="indisponivel">Indisponível</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Habilidades */}
                  <div>
                    <Label>Habilidades</Label>
                    <div className="flex gap-2 mt-2 mb-3">
                      <Input
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        placeholder="Digite uma habilidade"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                      />
                      <Button type="button" onClick={handleAddSkill}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(profile.skills) && profile.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-sm">
                          {skill}
                          <button
                            onClick={() => handleRemoveSkill(skill)}
                            className="ml-2 text-gray-500 hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Campos para Cliente */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="companyName">Nome da Empresa</Label>
                      <Input
                        id="companyName"
                        value={profile.companyName || ''}
                        onChange={(e) => setProfile(prev => ({ ...prev, companyName: e.target.value }))}
                        placeholder="Sua empresa"
                      />
                    </div>

                    <div>
                      <Label htmlFor="industry">Setor</Label>
                      <Input
                        id="industry"
                        value={profile.industry || ''}
                        onChange={(e) => setProfile(prev => ({ ...prev, industry: e.target.value }))}
                        placeholder="Tecnologia, Marketing, etc."
                      />
                    </div>

                    <div>
                      <Label htmlFor="companySize">Tamanho da Empresa</Label>
                      <Select 
                        value={profile.companySize || 'startup'} 
                        onValueChange={(value) => setProfile(prev => ({ ...prev, companySize: value as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="startup">Startup</SelectItem>
                          <SelectItem value="pequena">Pequena (1-50 funcionários)</SelectItem>
                          <SelectItem value="media">Média (51-500 funcionários)</SelectItem>
                          <SelectItem value="grande">Grande (500+ funcionários)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Endereço para Checkout PIX */}
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-4">Endereço para Pagamento PIX</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="cep">CEP</Label>
                        <Input
                          id="cep"
                          value={profile.cep || ''}
                          onChange={(e) => setProfile(prev => ({ ...prev, cep: e.target.value }))}
                          placeholder="00000-000"
                          maxLength={9}
                        />
                      </div>

                      <div>
                        <Label htmlFor="state">Estado</Label>
                        <Input
                          id="state"
                          value={profile.state || ''}
                          onChange={(e) => setProfile(prev => ({ ...prev, state: e.target.value }))}
                          placeholder="SP"
                          maxLength={2}
                        />
                      </div>

                      <div>
                        <Label htmlFor="city">Cidade</Label>
                        <Input
                          id="city"
                          value={profile.city || ''}
                          onChange={(e) => setProfile(prev => ({ ...prev, city: e.target.value }))}
                          placeholder="São Paulo"
                        />
                      </div>

                      <div>
                        <Label htmlFor="street">Rua</Label>
                        <Input
                          id="street"
                          value={profile.street || ''}
                          onChange={(e) => setProfile(prev => ({ ...prev, street: e.target.value }))}
                          placeholder="Rua Exemplo"
                        />
                      </div>

                      <div>
                        <Label htmlFor="number">Número</Label>
                        <Input
                          id="number"
                          value={profile.number || ''}
                          onChange={(e) => setProfile(prev => ({ ...prev, number: e.target.value }))}
                          placeholder="123"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Portfólio & Certificações - Apenas para Freelancers */}
            {userProfile.role === 'freelancer' && (
              <TabsContent value="portfolio" className="space-y-4 sm:space-y-6">
                <>
                  {/* Portfólio */}
                  <div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 mb-3 sm:mb-4">
                      <h3 className="text-lg font-medium">Portfólio</h3>
                      <Dialog open={showPortfolioModal} onOpenChange={(open) => {
                        setShowPortfolioModal(open);
                        if (!open) {
                          setNewPortfolioItem({
                            title: '',
                            description: '',
                            images: [],
                            technologies: [],
                            completedAt: new Date(),
                            projectUrl: '',
                            value: 0,
                            coverImage: undefined,
                            documents: []
                          });
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="w-4 h-4 mr-1" />
                            Adicionar Item
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[100dvw] h-[100dvh] max-w-none max-h-none md:w-[95dvw] md:max-w-2xl md:max-h-[90dvh] md:rounded-lg p-0 flex flex-col">
                          <div className="flex-shrink-0 p-4 md:p-6 border-b">
                            <DialogHeader>
                              <DialogTitle className="text-base sm:text-lg">Adicionar Item ao Portfólio</DialogTitle>
                            </DialogHeader>
                          </div>
                          <div className="flex-1 overflow-y-auto p-4 md:p-6">
                            <div className="space-y-3 sm:space-y-4">
                            <div>
                              <Label htmlFor="portfolio-title">Título do Projeto *</Label>
                              <Input
                                id="portfolio-title"
                                value={newPortfolioItem.title || ''}
                                onChange={(e) => setNewPortfolioItem(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Nome do projeto"
                              />
                            </div>
                            <div>
                              <Label htmlFor="portfolio-description">Descrição *</Label>
                              <Textarea
                                id="portfolio-description"
                                value={newPortfolioItem.description || ''}
                                onChange={(e) => setNewPortfolioItem(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Descreva o projeto, desafios e soluções..."
                                rows={3}
                              />
                            </div>
                            
                            <div>
                              <DocumentUpload
                                userId={userProfile.uid}
                                documents={newPortfolioItem.documents || []}
                                onDocumentsChange={(documents) => setNewPortfolioItem(prev => ({ ...prev, documents }))}
                                maxFiles={3}
                                disabled={loading}
                              />
                            </div>

                            {/* Upload de Imagens */}
                            <div>
                              <Label>Imagens do Projeto</Label>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="portfolio-images" className="cursor-pointer">
                                    <div className="flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
                                      {uploadingPortfolioImages ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                      ) : (
                                        <ImageIcon className="w-5 h-5 text-gray-500" />
                                      )}
                                      <span className="text-gray-600">
                                        {uploadingPortfolioImages ? 'Enviando imagens...' : 'Clique para adicionar imagens'}
                                      </span>
                                    </div>
                                    <Input
                                      id="portfolio-images"
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      onChange={handlePortfolioImageUpload}
                                      className="hidden"
                                      disabled={uploadingPortfolioImages}
                                    />
                                  </Label>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Múltiplas imagens • Máximo 5MB cada • JPG, PNG ou GIF
                                  </p>
                                </div>

                                {/* Preview das imagens */}
                                {newPortfolioItem.images && newPortfolioItem.images.length > 0 && (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                                    {newPortfolioItem.images.map((imageUrl, index) => (
                                      <div key={index} className="relative group">
                                        <img
                                          src={imageUrl}
                                          alt={`Preview ${index + 1}`}
                                          className="w-full h-24 object-cover rounded-lg border"
                                        />
                                        
                                        {/* Botão de capa */}
                                        <button
                                          type="button"
                                          onClick={() => handleSetCoverImage(imageUrl)}
                                          className={`absolute top-1 left-1 p-1 rounded-full text-xs ${
                                            newPortfolioItem.coverImage === imageUrl 
                                              ? 'bg-yellow-500 text-white' 
                                              : 'bg-white text-gray-600 opacity-0 group-hover:opacity-100'
                                          } transition-opacity`}
                                          title={newPortfolioItem.coverImage === imageUrl ? 'Imagem de capa' : 'Definir como capa'}
                                        >
                                          <Star className="w-3 h-3" />
                                        </button>

                                        {/* Botão de remover */}
                                        <button
                                          type="button"
                                          onClick={() => handleRemovePortfolioImage(imageUrl)}
                                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                          title="Remover imagem"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Upload de Vídeos */}
                            <div>
                              <Label>Vídeos do Projeto</Label>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="portfolio-videos" className="cursor-pointer">
                                    <div className="flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
                                      {uploadingPortfolioVideos ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                      ) : (
                                        <Video className="w-5 h-5 text-gray-500" />
                                      )}
                                      <span className="text-gray-600">
                                        {uploadingPortfolioVideos ? 'Enviando vídeos...' : 'Clique para adicionar vídeos'}
                                      </span>
                                    </div>
                                    <Input
                                      id="portfolio-videos"
                                      type="file"
                                      accept="video/*"
                                      multiple
                                      onChange={handlePortfolioVideoUpload}
                                      className="hidden"
                                      disabled={uploadingPortfolioVideos}
                                    />
                                  </Label>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Múltiplos vídeos • Máximo 50MB cada • MP4, MOV ou AVI
                                  </p>
                                </div>

                                {/* Preview dos vídeos */}
                                {newPortfolioItem.videos && newPortfolioItem.videos.length > 0 && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                    {newPortfolioItem.videos.map((videoUrl, index) => (
                                      <div key={index} className="relative group">
                                        <div className="relative">
                                          <video
                                            src={videoUrl}
                                            className="w-full h-32 object-cover rounded-lg border"
                                            controls={false}
                                          />
                                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
                                            <Play className="w-8 h-8 text-white" />
                                          </div>
                                        </div>
                                        
                                        {/* Botão de capa de vídeo */}
                                        <button
                                          type="button"
                                          onClick={() => handleSetCoverVideo(videoUrl)}
                                          className={`absolute top-1 left-1 p-1 rounded-full text-xs ${
                                            newPortfolioItem.coverVideo === videoUrl 
                                              ? 'bg-yellow-500 text-white' 
                                              : 'bg-white text-gray-600 opacity-0 group-hover:opacity-100'
                                          } transition-opacity`}
                                          title={newPortfolioItem.coverVideo === videoUrl ? 'Vídeo de capa' : 'Definir como capa'}
                                        >
                                          <Star className="w-3 h-3" />
                                        </button>

                                        {/* Botão de remover */}
                                        <button
                                          type="button"
                                          onClick={() => handleRemovePortfolioVideo(videoUrl)}
                                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                          title="Remover vídeo"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="portfolio-url">URL do Projeto</Label>
                              <Input
                                id="portfolio-url"
                                value={newPortfolioItem.projectUrl || ''}
                                onChange={(e) => setNewPortfolioItem(prev => ({ ...prev, projectUrl: e.target.value }))}
                                placeholder="https://..."
                              />
                            </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 p-4 md:p-6 border-t bg-white">
                            <div className="flex flex-col sm:flex-row gap-2 justify-end">
                              <Button variant="outline" onClick={() => setShowPortfolioModal(false)}>
                                Cancelar
                              </Button>
                              <Button onClick={handleAddPortfolioItem}>
                                Adicionar
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {userProfile.portfolio && Array.isArray(userProfile.portfolio) && userProfile.portfolio.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                        {userProfile.portfolio.map((item) => (
                          <Card key={item.id} className="relative overflow-hidden">
                            <button
                              onClick={() => handleRemovePortfolioItem(item)}
                              className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 z-10"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            
                            {/* Imagem/Vídeo de capa */}
                            {(item.coverVideo || item.coverImage || (item.images && item.images.length > 0) || (item.videos && item.videos.length > 0)) && (
                              <div className="relative h-32 bg-gray-200">
                                {item.coverVideo ? (
                                  <div className="relative w-full h-full">
                                    <video
                                      src={item.coverVideo}
                                      className="w-full h-full object-cover"
                                      controls={false}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                                      <Play className="w-8 h-8 text-white" />
                                    </div>
                                  </div>
                                ) : (
                                  <img
                                    src={item.coverImage || item.images?.[0]}
                                    alt={item.title}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                                
                                {/* Contador de mídia */}
                                <div className="absolute bottom-2 right-2 flex gap-1">
                                  {item.images && item.images.length > 1 && (
                                    <div className="px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
                                      +{item.images.length - 1} foto{item.images.length > 2 ? 's' : ''}
                                    </div>
                                  )}
                                  {item.videos && item.videos.length > 1 && (
                                    <div className="px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
                                      +{item.videos.length - 1} vídeo{item.videos.length > 2 ? 's' : ''}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            <CardContent className="p-3 sm:p-4">
                              <h4 className="font-medium mb-2">{item.title}</h4>
                              <p className="text-sm text-gray-600 mb-2" style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}>{item.description}</p>
                              
                              {/* Documentos */}
                              {item.documents && item.documents.length > 0 && (
                                <div className="mb-2">
                                  <div className="flex items-center gap-1 mb-1">
                                    <FileText className="w-3 h-3 text-gray-500" />
                                    <span className="text-xs text-gray-500 font-medium">Documentos</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {item.documents.map((doc, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {doc.name.length > 15 ? `${doc.name.substring(0, 15)}...` : doc.name}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Indicadores de mídia */}
                              <div className="flex items-center gap-2 mb-2">
                                {item.images && item.images.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <ImageIcon className="w-3 h-3 text-gray-500" />
                                    <span className="text-xs text-gray-500">{item.images.length}</span>
                                  </div>
                                )}
                                {item.videos && item.videos.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Video className="w-3 h-3 text-gray-500" />
                                    <span className="text-xs text-gray-500">{item.videos.length}</span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="text-xs text-gray-500">
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
                                {item.value && ` • R$ ${item.value.toLocaleString()}`}
                              </div>
                              {item.projectUrl && (
                                <a
                                  href={item.projectUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline block mt-2"
                                >
                                  Ver projeto →
                                </a>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        Nenhum item no portfólio ainda. Adicione seus melhores trabalhos!
                      </p>
                    )}
                  </div>

                  {/* Certificações */}
                  <div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 mb-3 sm:mb-4">
                      <h3 className="text-lg font-medium">Certificações</h3>
                      <Dialog open={showCertificationModal} onOpenChange={(open) => {
                        setShowCertificationModal(open);
                        if (!open) {
                          setNewCertification({
                            name: '',
                            issuer: '',
                            dateIssued: new Date(),
                            credentialUrl: '',
                            imageUrl: undefined
                          });
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="w-4 h-4 mr-1" />
                            Adicionar Certificação
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[100dvw] h-[100dvh] max-w-none max-h-none md:w-[95dvw] md:max-w-lg md:max-h-[90dvh] md:rounded-lg overflow-y-auto p-4 md:p-6">
                          <DialogHeader>
                            <DialogTitle>Adicionar Certificação</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="cert-name">Nome da Certificação *</Label>
                              <Input
                                id="cert-name"
                                value={newCertification.name || ''}
                                onChange={(e) => setNewCertification(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Ex: AWS Certified Developer"
                              />
                            </div>
                            <div>
                              <Label htmlFor="cert-issuer">Emissor *</Label>
                              <Input
                                id="cert-issuer"
                                value={newCertification.issuer || ''}
                                onChange={(e) => setNewCertification(prev => ({ ...prev, issuer: e.target.value }))}
                                placeholder="Ex: Amazon Web Services"
                              />
                            </div>
                            <div>
                              <Label htmlFor="cert-url">URL da Credencial</Label>
                              <Input
                                id="cert-url"
                                value={newCertification.credentialUrl || ''}
                                onChange={(e) => setNewCertification(prev => ({ ...prev, credentialUrl: e.target.value }))}
                                placeholder="https://..."
                              />
                            </div>

                            {/* Upload de Imagem da Certificação */}
                            <div>
                              <Label>Imagem da Certificação</Label>
                              <div className="space-y-3">
                                {newCertification.imageUrl ? (
                                  <div className="relative inline-block">
                                    <img
                                      src={newCertification.imageUrl}
                                      alt="Preview da certificação"
                                      className="w-32 h-24 object-cover rounded-lg border"
                                    />
                                    <button
                                      type="button"
                                      onClick={handleRemoveCertificationImage}
                                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                      title="Remover imagem"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div>
                                    <Label htmlFor="cert-image" className="cursor-pointer">
                                      <div className="flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
                                        {uploadingCertificationImage ? (
                                          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                        ) : (
                                          <ImageIcon className="w-5 h-5 text-gray-500" />
                                        )}
                                        <span className="text-gray-600">
                                          {uploadingCertificationImage ? 'Enviando...' : 'Clique para adicionar imagem da certificação'}
                                        </span>
                                      </div>
                                      <Input
                                        id="cert-image"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleCertificationImageUpload}
                                        className="hidden"
                                        disabled={uploadingCertificationImage}
                                      />
                                    </Label>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Opcional • Máximo 5MB • JPG, PNG ou GIF
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" onClick={() => setShowCertificationModal(false)}>
                                Cancelar
                              </Button>
                              <Button onClick={handleAddCertification}>
                                Adicionar
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {userProfile.certifications && Array.isArray(userProfile.certifications) && userProfile.certifications.length > 0 ? (
                      <div className="space-y-2 sm:space-y-3">
                        {userProfile.certifications.map((cert) => (
                          <Card key={cert.id} className="relative">
                            <button
                              onClick={() => handleRemoveCertification(cert)}
                              className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 z-10"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            <CardContent className="p-3 sm:p-4">
                              <div className="flex gap-4">
                                {cert.imageUrl && (
                                  <div className="flex-shrink-0">
                                    <img
                                      src={cert.imageUrl}
                                      alt={cert.name}
                                      className="w-16 h-12 object-cover rounded border"
                                    />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <h4 className="font-medium">{cert.name}</h4>
                                  <p className="text-sm text-gray-600">{cert.issuer}</p>
                                  <div className="text-xs text-gray-500 mt-1">
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
                                  </div>
                                  {cert.credentialUrl && (
                                    <a
                                      href={cert.credentialUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 hover:underline block mt-1"
                                    >
                                      Ver credencial →
                                    </a>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        Nenhuma certificação cadastrada ainda.
                      </p>
                    )}
                  </div>
                </>
              </TabsContent>
            )}
          </Tabs>

          {/* Botão Salvar */}
          <div className="flex justify-end pt-6 border-t">
            <Button 
              onClick={handleSaveProfile} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal para alteração de email */}
      <Dialog open={showEmailModal} onOpenChange={(open) => {
        console.log('Modal onOpenChange chamado:', open);
        setShowEmailModal(open);
      }}>
        <DialogContent className="w-[100dvw] h-[100dvh] max-w-none max-h-none md:w-[95dvw] md:max-w-md md:max-h-[90dvh] md:rounded-lg overflow-y-auto p-4 md:p-6">
          <DialogHeader>
            <DialogTitle>Alterar Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="current-email">Email Atual</Label>
              <Input
                id="current-email"
                value={userProfile.email}
                disabled
                className="bg-gray-50"
              />
            </div>
            
            <div>
              <Label htmlFor="new-email">Novo Email *</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Digite o novo email"
              />
            </div>
            
            <div>
              <Label htmlFor="current-password">Senha Atual *</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Digite sua senha atual"
              />
            </div>
            
            <div className="text-sm text-gray-600">
              <p>⚠️ Por segurança, você precisará confirmar sua senha atual para alterar o email.</p>
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEmailModal(false);
                  setNewEmail('');
                  setCurrentPassword('');
                }}
                disabled={updatingEmail}
              >
                Cancelar
              </Button>
              <Button 
                onClick={() => {
                  console.log('=== BOTÃO ATUALIZAR EMAIL CLICADO ===');
                  console.log('newEmail:', newEmail);
                  console.log('currentPassword:', currentPassword ? '***preenchida***' : 'VAZIA');
                  console.log('updatingEmail:', updatingEmail);
                  console.log('userProfile.email:', userProfile.email);
                  handleUpdateEmail();
                }}
                disabled={updatingEmail || !newEmail || !currentPassword}
              >
                {updatingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Atualizando...
                  </>
                ) : (
                  'Atualizar Email'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};