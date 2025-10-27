
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Mail, Phone, MessageCircle, HelpCircle, Clock, Users, MapPin } from 'lucide-react';
import { EmailService } from '@/services/emailService';
import { useAppSelector } from '@/hooks/redux';

const Suporte = () => {
  const { user, userProfile } = useAppSelector(state => state.auth);
  const [formData, setFormData] = useState({
    nome: userProfile?.name || '',
    email: userProfile?.email || user?.email || '',
    assunto: '',
    mensagem: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    if (!formData.nome || !formData.email || !formData.assunto || !formData.mensagem) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Por favor, insira um e-mail válido.");
      return;
    }

    setIsLoading(true);
    
    try {
      // Enviar mensagem para a equipe de suporte
      await EmailService.sendSupportMessage(
        formData.nome,
        formData.email,
        formData.assunto,
        formData.mensagem
      );
      
      // Enviar confirmação para o usuário
      await EmailService.sendSupportConfirmation(
        formData.email,
        formData.nome,
        formData.assunto,
        formData.mensagem
      );
      
      toast.success("Mensagem enviada com sucesso! Você receberá uma confirmação por e-mail e nossa equipe entrará em contato em breve.");
      
      // Limpar formulário
      setFormData({
        nome: userProfile?.name || '',
        email: userProfile?.email || user?.email || '',
        assunto: '',
        mensagem: ''
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem de suporte:', error);
      toast.error("Ocorreu um erro ao enviar sua mensagem. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Suporte</h1>
        <p className="text-gray-600">Precisa de ajuda? Entre em contato conosco</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário de Contato */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                Envie uma Mensagem
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo</Label>
                    <Input
                      id="nome"
                      name="nome"
                      value={formData.nome}
                      placeholder="Seu nome completo"
                      required
                      readOnly
                      className="bg-gray-50 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      placeholder="seu@email.com"
                      required
                      readOnly
                      className="bg-gray-50 cursor-not-allowed"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="assunto">Assunto</Label>
                  <Input
                    id="assunto"
                    name="assunto"
                    value={formData.assunto}
                    onChange={handleInputChange}
                    placeholder="Descreva brevemente o assunto"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mensagem">Mensagem</Label>
                  <Textarea
                    id="mensagem"
                    name="mensagem"
                    value={formData.mensagem}
                    onChange={handleInputChange}
                    placeholder="Descreva detalhadamente sua dúvida ou problema..."
                    rows={6}
                    required
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Enviar Mensagem
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Informações de Contato */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações de Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">E-mail</p>
                  <p className="text-gray-600 text-sm">xjobsfreelancer@yahoo.com</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">CNPJ</p>
                  <p className="text-gray-600 text-sm">36.477.658/0001-36</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Localização</p>
                  <p className="text-gray-600 text-sm">São Paulo, SP</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Horário de Atendimento</p>
                  <p className="text-gray-600 text-sm">Segunda a Sexta</p>
                  <p className="text-gray-600 text-sm">9h às 18h</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Perguntas Frequentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium text-gray-900 text-sm">Como publico um projeto?</p>
                <p className="text-gray-600 text-xs mt-1">Acesse "Publicar Projeto" no menu lateral e preencha os detalhes do seu projeto.</p>
              </div>
              
              <div>
                <p className="font-medium text-gray-900 text-sm">Como escolho um freelancer?</p>
                <p className="text-gray-600 text-xs mt-1">Analise as propostas recebidas, verifique os portfólios e entre em contato com o profissional de sua preferência.</p>
              </div>
              
              <div>
                <p className="font-medium text-gray-900 text-sm">Como funciona o pagamento?</p>
                <p className="text-gray-600 text-xs mt-1">Os pagamentos são processados de forma segura através da plataforma após a conclusão do projeto.</p>
              </div>
              
              <div>
                <p className="font-medium text-gray-900 text-sm">Posso cancelar um projeto?</p>
                <p className="text-gray-600 text-xs mt-1">Entre em contato conosco para avaliar a situação do projeto e as possibilidades de cancelamento.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Suporte;
