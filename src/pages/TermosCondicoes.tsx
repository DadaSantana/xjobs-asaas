import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
  FileText, 
  Shield, 
  Users, 
  CreditCard, 
  Scale, 
  AlertTriangle,
  CheckCircle,
  UserCheck,
  MessageCircle,
  Gavel
} from 'lucide-react';

const TermosCondicoes = () => {
  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-x-hidden">
      <Navbar />
      <main className="w-full py-12 pt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Termos e Condições de Uso
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Última Atualização: 01/09/25
            </p>
            <p className="text-lg text-gray-600 mt-4">
              Bem-vindo à Xjobs! Ao acessar e utilizar nossos serviços, você concorda com os seguintes Termos e Condições.
            </p>
          </div>

          {/* Seções dos Termos */}
          <div className="space-y-8">
            
            {/* 1. Definições */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-2">Seção 1</Badge>
                    <CardTitle className="text-xl">Definições</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-800">1.1 Plataforma:</p>
                  <p className="text-gray-700">Refere-se ao site e/ou aplicativo da Xjobs que conecta freelancers a clientes para a realização de projetos.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">1.2 Freelancer:</p>
                  <p className="text-gray-700">Pessoa física ou jurídica que oferece serviços profissionais por meio da plataforma.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">1.3 Cliente:</p>
                  <p className="text-gray-700">Pessoa física ou jurídica que contrata os serviços de um freelancer por meio da plataforma.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">1.4 Equipe Avaliadora:</p>
                  <p className="text-gray-700">Grupo responsável por analisar disputas entre clientes e freelancers, caso haja.</p>
                </div>
              </CardContent>
            </Card>

            {/* 2. Responsabilidades da Plataforma */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-3 rounded-full">
                    <Shield className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-2">Seção 2</Badge>
                    <CardTitle className="text-xl">Responsabilidades da Plataforma</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-800">2.1 Conectar Clientes e Freelancers:</p>
                  <p className="text-gray-700">A Xjobs tem como principal objetivo facilitar a comunicação entre clientes e freelancers, proporcionando um ambiente seguro e funcional para a realização de projetos.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">2.2 Fornecer Ferramentas:</p>
                  <p className="text-gray-700">A Xjobs disponibiliza ferramentas para a criação e gestão de projetos, comunicação entre as partes, e meios de pagamento.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">2.3 Meio de Pagamento:</p>
                  <p className="text-gray-700">A Xjobs oferece um sistema de pagamento seguro para a realização de transações financeiras entre clientes e freelancers.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">2.4 Esclarecimento de Dúvidas:</p>
                  <p className="text-gray-700">A Xjobs está disponível para fornecer suporte e esclarecer dúvidas gerais sobre o funcionamento do site, uso das ferramentas e procedimentos relacionados.</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-yellow-800">2.5 Não Responsabilidade por Repasses e Valores:</p>
                      <p className="text-yellow-700">A Xjobs não se responsabiliza pelos valores acordados entre clientes e freelancers, nem pela execução ou entrega dos projetos, exceto pelo correto funcionamento das ferramentas fornecidas.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-yellow-800">2.6 Não Responsabilidade por Disputas:</p>
                      <p className="text-yellow-700">Em caso de conflitos entre freelancers e clientes, a Xjobs oferece uma equipe avaliadora para mediar e ajudar a resolver a disputa, mas não se responsabiliza pelos resultados ou pela resolução final da questão.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Responsabilidades dos Clientes */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="bg-purple-100 p-3 rounded-full">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-2">Seção 3</Badge>
                    <CardTitle className="text-xl">Responsabilidades dos Clientes</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-800">3.1 Pagamento:</p>
                  <p className="text-gray-700">O cliente compromete-se a pagar o valor acordado ao freelancer de acordo com o projeto ou tarefa contratada, através da plataforma, conforme os prazos estipulados.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">3.2 Descrição Clara do Projeto:</p>
                  <p className="text-gray-700">O cliente deve fornecer uma descrição clara, detalhada e precisa do trabalho a ser realizado, incluindo os requisitos e expectativas.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">3.3 Avaliação:</p>
                  <p className="text-gray-700">O cliente deve avaliar o trabalho do freelancer de maneira justa e transparente, de acordo com os termos acordados.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">3.4 Cumprimento de Prazos:</p>
                  <p className="text-gray-700">O cliente compromete-se a cumprir os prazos acordados para fornecer feedback, aprovar entregas ou realizar qualquer outro compromisso relacionado ao projeto.</p>
                </div>
              </CardContent>
            </Card>

            {/* 4. Responsabilidades dos Freelancers */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="bg-orange-100 p-3 rounded-full">
                    <UserCheck className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-2">Seção 4</Badge>
                    <CardTitle className="text-xl">Responsabilidades dos Freelancers</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-800">4.1 Execução do Trabalho:</p>
                  <p className="text-gray-700">O freelancer compromete-se a realizar o trabalho acordado com a qualidade e no prazo estabelecido, de acordo com as especificações fornecidas pelo cliente.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">4.2 Comunicação:</p>
                  <p className="text-gray-700">O freelancer deve manter uma comunicação clara e profissional com o cliente, esclarecendo dúvidas e fornecendo atualizações sobre o andamento do projeto.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">4.3 Entrega do Trabalho:</p>
                  <p className="text-gray-700">O freelancer compromete-se a entregar o trabalho no formato e nos termos acordados, garantindo que o projeto esteja completo e de acordo com os requisitos do cliente.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">4.4 Cumprimento de Prazos:</p>
                  <p className="text-gray-700">O freelancer deve cumprir todos os prazos estabelecidos no contrato, salvo em situações de força maior.</p>
                </div>
              </CardContent>
            </Card>

            {/* 5. Pagamentos */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-100 p-3 rounded-full">
                    <CreditCard className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-2">Seção 5</Badge>
                    <CardTitle className="text-xl">Pagamentos</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-800">5.1 Sistema de Pagamento:</p>
                  <p className="text-gray-700">Todos os pagamentos entre clientes e freelancers devem ser realizados por meio do sistema de pagamento da Xjobs, que garantirá a segurança das transações.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">5.2 Taxas:</p>
                  <p className="text-gray-700">A Xjobs poderá cobrar uma taxa sobre cada transação realizada. O percentual exato será informado ao usuário no momento da transação.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">5.3 Repasses e Valores:</p>
                  <p className="text-gray-700">A Xjobs não se responsabiliza pela negociação ou repasses financeiros entre clientes e freelancers, sendo apenas responsável por fornecer o meio de pagamento. A plataforma não interfere no valor acordado entre as partes.</p>
                </div>
              </CardContent>
            </Card>

            {/* 6. Resolução de Disputas */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="bg-red-100 p-3 rounded-full">
                    <Gavel className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-2">Seção 6</Badge>
                    <CardTitle className="text-xl">Resolução de Disputas</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-800">6.1 Equipe Avaliadora:</p>
                  <p className="text-gray-700">Em caso de desacordo ou disputa entre cliente e freelancer, a Xjobs oferece uma equipe avaliadora que ajudará na resolução do conflito, analisando as evidências apresentadas pelas partes envolvidas.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">6.2 Decisão Final:</p>
                  <p className="text-gray-700">A equipe avaliadora poderá sugerir uma solução para a disputa, mas a decisão final será de responsabilidade das partes envolvidas. A Xjobs não garante a resolução satisfatória de todas as disputas.</p>
                </div>
              </CardContent>
            </Card>

            {/* 7. Propriedade Intelectual */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="bg-teal-100 p-3 rounded-full">
                    <Shield className="h-6 w-6 text-teal-600" />
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-2">Seção 7</Badge>
                    <CardTitle className="text-xl">Propriedade Intelectual</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-800">7.1 Propriedade dos Trabalhos:</p>
                  <p className="text-gray-700">Os direitos autorais e de propriedade intelectual sobre o trabalho desenvolvido por freelancers pertencem ao freelancer até que o pagamento integral seja realizado pelo cliente, momento em que a propriedade do trabalho será transferida ao cliente, salvo disposições contrárias acordadas previamente entre as partes.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">7.2 Uso de Conteúdo:</p>
                  <p className="text-gray-700">Os usuários da plataforma não podem utilizar o conteúdo de outros sem a devida autorização, sendo responsável por qualquer violação de direitos autorais.</p>
                </div>
              </CardContent>
            </Card>

            {/* 8. Suspensão e Cancelamento de Conta */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="bg-pink-100 p-3 rounded-full">
                    <AlertTriangle className="h-6 w-6 text-pink-600" />
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-2">Seção 8</Badge>
                    <CardTitle className="text-xl">Suspensão e Cancelamento de Conta</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-800">8.1 Suspensão de Contas:</p>
                  <p className="text-gray-700">A Xjobs reserva-se o direito de suspender ou cancelar a conta de qualquer usuário que viole os Termos e Condições, com ou sem aviso prévio, dependendo da gravidade da infração.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">8.2 Cancelamento de Projetos:</p>
                  <p className="text-gray-700">Caso um cliente ou freelancer decida cancelar um projeto, deve seguir as diretrizes da Xjobs para garantir que todos os procedimentos sejam feitos corretamente, incluindo a devolução de valores ou reembolso, conforme os termos acordados entre as partes.</p>
                </div>
              </CardContent>
            </Card>

            {/* 9. Limitação de Responsabilidade */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="bg-gray-100 p-3 rounded-full">
                    <Scale className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-2">Seção 9</Badge>
                    <CardTitle className="text-xl">Limitação de Responsabilidade</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-800">9.1 Limitação de Responsabilidade da Plataforma:</p>
                  <p className="text-gray-700">A Xjobs não se responsabiliza por quaisquer danos, perdas ou prejuízos resultantes de disputas entre clientes e freelancers, falhas nas entregas, ou erros de comunicação. A Xjobs não assume qualquer responsabilidade quanto à execução do trabalho, prazos ou qualidade final.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">9.2 Força Maior:</p>
                  <p className="text-gray-700">A Xjobs não será responsável por falhas no serviço ou atraso nos pagamentos decorrentes de eventos fora de seu controle, como falhas técnicas, ataques cibernéticos, ou interrupções de serviços de terceiros.</p>
                </div>
              </CardContent>
            </Card>

            {/* 10. Alterações nos Termos */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="bg-cyan-100 p-3 rounded-full">
                    <FileText className="h-6 w-6 text-cyan-600" />
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-2">Seção 10</Badge>
                    <CardTitle className="text-xl">Alterações nos Termos</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">A Xjobs pode, a seu critério, modificar ou atualizar estes Termos e Condições a qualquer momento. Quaisquer mudanças serão publicadas nesta página e entrarão em vigor imediatamente após a publicação. É responsabilidade do usuário revisar periodicamente os Termos.</p>
              </CardContent>
            </Card>

            {/* 11. Disposições Gerais */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-100 p-3 rounded-full">
                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-2">Seção 11</Badge>
                    <CardTitle className="text-xl">Disposições Gerais</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-800">11.1 Legislação Aplicável:</p>
                  <p className="text-gray-700">Estes Termos e Condições são regidos pelas leis do Estado de São Paulo/SP, e qualquer disputa relacionada será resolvida nos tribunais competentes de São Paulo/SP.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">11.2 Aceitação dos Termos:</p>
                  <p className="text-gray-700">Ao se cadastrar e utilizar os serviços da plataforma, o usuário concorda com todos os Termos e Condições descritos acima.</p>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Call to Action */}
          <Card className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="text-center py-8">
              <div className="flex justify-center mb-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <MessageCircle className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-blue-900 mb-4">
                Dúvidas sobre os Termos?
              </h3>
              <p className="text-blue-800 text-lg mb-6">
                Entre em contato conosco através do nosso suporte!
              </p>
              <div className="flex justify-center items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span className="text-blue-700 font-medium">Estamos aqui para esclarecer qualquer dúvida!</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermosCondicoes;