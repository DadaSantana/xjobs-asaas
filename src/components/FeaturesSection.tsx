import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Shield, CreditCard, Users } from "lucide-react";
import { Link } from "react-router-dom";

const FeaturesSection = () => {
  const features = [
    {
      icon: <Shield className="w-8 h-8 text-blue-600" />,
      title: "Segurança",
      description: "Garantia da entrega dos projetos e pagamentos aos profissionais."
    },
    {
      icon: <CheckCircle className="w-8 h-8 text-blue-600" />,
      title: "Mediação inteligente",
      description: "Contamos com uma mediação profissional, que lida com a resolução de conflitos em casos de disputas nos projetos."
    },
    {
      icon: <CreditCard className="w-8 h-8 text-blue-600" />,
      title: "Pagamentos garantidos",
      description: "Realizados pelos apps mais conhecidos do mercado ou Pix."
    },
    {
      icon: <Users className="w-8 h-8 text-blue-600" />,
      title: "Clientes e freelancers",
      description: "Nossa plataforma auxilia a comunicação dos membros para que as negociações sejam feitas da melhor forma."
    }
  ];

  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left side - Content */}
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                O futuro do trabalho freelance é na{" "}
                <span className="text-blue-600">XJOBS!</span>
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-8">
                Segurança, mediação inteligente e pagamentos garantidos para
                clientes e freelancers. Em nossa plataforma, você tem a confirmação
                da entrega dos seus pedidos, além do gerenciamento de conflitos, em
                casos de disputa. Os pagamentos são feitos por meio dos apps mais
                conhecidos do mercado ou Pix, sendo possível solicitar a devolução
                do valor investido. Aqui, os clientes encontram uma grande
                diversidade de profissionais.
              </p>
            </div>

            {/* Video placeholder - will be replaced with actual video */}
            <div className="relative bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
              <div className="aspect-video">
                <video
                  className="w-full h-full object-cover"
                  controls
                  preload="metadata"
                  poster="/movies/cadaster-movie-poster.jpg" // Opcional: adicione um poster se tiver
                >
                  <source src="/movies/cadaster-movie.mp4" type="video/mp4" />
                  <div className="flex items-center justify-center h-full text-white text-center">
                    <div>
                      <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <div className="w-0 h-0 border-l-[12px] border-l-white border-y-[8px] border-y-transparent ml-1"></div>
                      </div>
                      <p className="text-sm opacity-80">Seu navegador não suporta vídeos HTML5</p>
                    </div>
                  </div>
                </video>
              </div>
            </div>

            <Link to="/login">
              <Button className="bg-blue-900 hover:bg-blue-800 text-white px-8 py-3 text-lg rounded-lg">
                QUERO ME CADASTRAR
              </Button>
            </Link>
          </div>

          {/* Right side - Features */}
          <div className="space-y-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 p-3 bg-blue-50 rounded-full">
                      {feature.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
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
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
