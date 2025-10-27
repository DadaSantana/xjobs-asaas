
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const FreelancerCTASection = () => {
  const features = [
    {
      title: "Encontre Freelancers",
      description: "Busque designers, escritores, tradutores, programadores, arquitetos e advogados com portfólio completo para você ganhar tempo.",
      icon: "🔍"
    },
    {
      title: "Envie uma mensagem",
      description: "Mande uma mensagem para o profissional e aguarde sua resposta. Nosso chat permite conversas em tempo real.",
      icon: "💬"
    },
    {
      title: "Detalhes do projeto",
      description: "Forneça o máximo de detalhes possível para que o freelancer compreenda o trabalho.",
      icon: "📋"
    },
    {
      title: "Avalie o freelancer",
      description: "Ao final do projeto, não se esqueça de avaliar o profissional. Sua avaliação é muito importante.",
      icon: "⭐"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Você trabalha como freelancer?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Comece a atrair clientes, hoje mesmo! Crie o seu perfil completo na Xjobs!
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="group bg-white border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-300">
                      <span className="text-2xl">{feature.icon}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <Button 
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            Criar Perfil de Freelancer
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FreelancerCTASection;
