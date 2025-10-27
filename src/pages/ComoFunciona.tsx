import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
  UserPlus, 
  FileText, 
  Heart, 
  UserCheck, 
  MessageCircle, 
  Shield,
  Play,
  CreditCard,
  Users,
  CheckCircle
} from 'lucide-react';

const ComoFunciona = () => {
  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-x-hidden">
      <Navbar />
      <main className="w-full py-12 pt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Como Funciona a Xjobs
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Conectamos clientes e freelancers de forma segura e eficiente
          </p>
        </div>

        {/* Segurança dos Pagamentos */}
        <div className="mb-12">

          {/* Dois Cards de Vídeos */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="border-blue-200 bg-blue-50 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-4 text-center">
                  Como encontrar freelancers
                </h3>
                <video 
                  controls 
                  preload="metadata"
                  className="w-full rounded-lg shadow-md aspect-video"
                >
                  <source src="/movies/como-funciona.mp4#t=1" type="video/mp4" />
                  Seu navegador não suporta o elemento de vídeo.
                </video>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-4 text-center">
                  Sou freelancer, como me inscrever na plataforma?
                </h3>
                <video 
                  controls 
                  preload="metadata"
                  className="w-full rounded-lg shadow-md aspect-video"
                >
                  <source src="/movies/como-funciona-part-2.mp4#t=1" type="video/mp4" />
                  Seu navegador não suporta o elemento de vídeo.
                </video>
              </CardContent>
            </Card>
          </div>

          {/* Textos Explicativos */}
          <div className="space-y-4">
            <Card className="border-gray-200 bg-gray-50 shadow-sm">
              <CardContent className="p-6 text-center">
                <p className="text-lg font-semibold text-gray-800">
                  OS PAGAMENTOS DOS PROJETOS SÃO FEITOS À PAGAR-ME E RETIDOS DURANTE A REALIZAÇÃO DO TRABALHO.
                </p>
              </CardContent>
            </Card>

            <Card className="border-gray-200 bg-gray-50 shadow-sm">
              <CardContent className="p-6 text-center">
                <p className="text-lg font-semibold text-gray-800">
                  O VALOR É LIBERADO SOMENTE APÓS A SUA CONCLUSÃO.
                </p>
              </CardContent>
            </Card>

            <Card className="border-gray-200 bg-gray-50 shadow-sm">
              <CardContent className="p-6 text-center">
                <p className="text-lg font-semibold text-gray-800">
                  EM CASOS DE DISPUTA, A PAGAR-ME TAMBÉM RETÉM O VALOR, REPASSADO À PARTE LESADA, SOMENTE AO FINAL.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Passos */}
        <div className="grid gap-8">
          {/* Passo 1 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <UserPlus className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <Badge variant="outline" className="mb-2">Passo 1</Badge>
                  <CardTitle className="text-xl">Cadastro</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                Os clientes e freelancers podem se cadastrar, facilmente, na plataforma, por meio de e-mail ou conta do Google e Facebook. 
                Durante o cadastro, ambos criam o seu perfil, adicionando informações relevantes, como nome completo, etc. 
                Já os freelancers têm a opção de incluir detalhes sobre as suas habilidades, experiências, portfólio, entre outros.
              </p>
            </CardContent>
          </Card>

          {/* Passo 2 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <Badge variant="outline" className="mb-2">Passo 2</Badge>
                  <CardTitle className="text-xl">Publicação de Projetos</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                Os trabalhos são publicados na página de projetos da Xjobs, para que os freelancers encontrem oportunidades que sejam adequadas 
                às suas habilidades. Os clientes podem visualizar os seus projetos publicados e escolher o profissional para realizar o trabalho.
              </p>
            </CardContent>
          </Card>

          {/* Passo 3 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="bg-purple-100 p-3 rounded-full">
                  <Heart className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <Badge variant="outline" className="mb-2">Passo 3</Badge>
                  <CardTitle className="text-xl">Inscrição em Projetos</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                Os freelancers podem se inscrever nos projetos que lhes interessar, ao "curti-los". Isso abrirá, automaticamente, uma área para a 
                proposta, abaixo do projeto, com um link direcionando o cliente para o perfil do freelancer. O cliente, então, clica no link da proposta e 
                visita o perfil do freelancer, para conferir seus trabalhos. Caso haja interesse, basta que o cliente entre em contato com o profissional, 
                clicando no botão "entrar em contato", disponibilizado no perfil.
              </p>
            </CardContent>
          </Card>

          {/* Passo 4 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="bg-orange-100 p-3 rounded-full">
                  <UserCheck className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <Badge variant="outline" className="mb-2">Passo 4</Badge>
                  <CardTitle className="text-xl">Seleção de Freelancer</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-gray-700 leading-relaxed">
                  Para escolher um freelancer, o cliente clica em "Aceitar Proposta", sendo direcionado para efetuar o pagamento, de acordo com a 
                  forma que preferir, pela Pagar-me. Esse procedimento garante que o pagamento seja processado de forma segura e eficiente, sendo 
                  liberado, somente, ao final do trabalho.
                </p>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-orange-600" />
                    <span className="font-semibold text-orange-800">A Xjobs cobra uma comissão de 10% por projeto.</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Passo 5 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="bg-indigo-100 p-3 rounded-full">
                  <MessageCircle className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <Badge variant="outline" className="mb-2">Passo 5</Badge>
                  <CardTitle className="text-xl">Comunicação e Negociação</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                Os clientes podem entrar em contato com os freelancers, por meio do chat ou área de membros, para discutir detalhes do projeto. 
                Já os freelancers podem enviar uma mensagem por projeto curtido.
              </p>
            </CardContent>
          </Card>

          {/* Passo 6 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="bg-red-100 p-3 rounded-full">
                  <Shield className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <Badge variant="outline" className="mb-2">Passo 6</Badge>
                  <CardTitle className="text-xl">Pagamento e Mediação</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                A plataforma oferece segurança nos pagamentos e mediação, em casos de disputa, garantindo que tanto os clientes, quanto os 
                freelancers sejam protegidos. Isso ajuda a construir confiança e promove uma experiência de trabalho positiva. Caso haja 
                discordância entre os envolvidos no projeto, ambos poderão colocá-lo em disputa.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <Card className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="text-center py-8">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-blue-900 mb-4">
              Ainda tem dúvidas?
            </h3>
            <p className="text-blue-800 text-lg mb-6">
              Assista ao vídeo ou mande uma mensagem para nós!
            </p>
            <div className="flex justify-center items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <span className="text-blue-700 font-medium">Estamos aqui para ajudar!</span>
            </div>
          </CardContent>
        </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ComoFunciona;