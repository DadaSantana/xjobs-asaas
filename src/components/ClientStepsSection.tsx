import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";

const ClientStepsSection = () => {
  const steps = [
    {
      number: "01",
      title: "Cadastre-se",
      description: "Basta clicar em cadastre-se e preencher os campos como nome, e-mail, etc.",
      icon: "👤",
      color: "from-blue-600 to-blue-800"
    },
    {
      number: "02", 
      title: "Propostas",
      description: "Em seguida, é só entrar na página de projetos, selecionar a categoria do trabalho que foi publicado e ver os freelancers que se inscreveram nele.",
      icon: "📋",
      color: "from-blue-700 to-indigo-700"
    },
    {
      number: "03",
      title: "Contato",
      description: "Nos projetos, estarão as propostas dos freelancers, que têm interesse em fazer o trabalho. Clique nos links dos portfólios, que estarão na proposta, visualize-os e entre em contato com o profissional que mais gostar.",
      icon: "🤝",
      color: "from-indigo-600 to-blue-600"
    },
    {
      number: "04",
      title: "Negociação",
      description: "Aí, é só negociar o trabalho pelo chat e pagar o valor, pela plataforma. Os projetos seguintes são postados pelo cliente. Então, basta entrar na página de projetos e postar quantos desejar. Você pode ver, também, os trabalhos dos freelancers, na área de membros.",
      icon: "💰",
      color: "from-blue-800 to-indigo-800"
    }
  ];

  return (
    <section id="client-steps" className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-20 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(59,130,246,0.3),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_75%,rgba(29,78,216,0.3),transparent_50%)]"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-l from-transparent via-blue-500/5 to-transparent transform skew-y-12 translate-y-full animate-pulse"></div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 backdrop-blur-sm rounded-full px-6 py-2 mb-6 border border-blue-500/20">
            <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full animate-pulse"></div>
            <span className="text-blue-100 text-sm font-medium">Você é cliente?</span>
          </div>
          
          <h2 className="text-5xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent leading-tight">
            Encontre o
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
              Freelancer Ideal
            </span>
          </h2>
          
          <p className="text-xl text-blue-100/70 max-w-2xl mx-auto leading-relaxed">
            Conecte-se com profissionais qualificados e transforme suas ideias em realidade
          </p>
        </div>

        {/* Main Grid Layout - Inverted */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start max-w-7xl mx-auto w-full">
          
          {/* Left Columns - Steps Grid */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {steps.map((step, index) => (
              <Card 
                key={index} 
                className="group relative bg-blue-500/5 backdrop-blur-sm border-blue-500/20 hover:bg-blue-500/10 transition-all duration-700 hover:scale-105 hover:-translate-y-2 overflow-hidden"
                style={{
                  animationDelay: `${index * 0.15}s`
                }}
              >
                {/* Animated background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-20 transition-opacity duration-700`}></div>
                
                {/* Glowing edge effect */}
                <div className={`absolute inset-0 bg-gradient-to-r ${step.color} opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-700`}></div>
                
                {/* Border animation */}
                <div className="absolute inset-0 rounded-lg">
                  <div className={`absolute inset-0 bg-gradient-to-r ${step.color} opacity-0 group-hover:opacity-100 transition-opacity duration-700`}></div>
                  <div className="absolute inset-[1px] bg-slate-900/90 rounded-lg"></div>
                </div>

                <CardContent className="relative z-10 p-8 h-full flex flex-col justify-between">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className={`w-14 h-14 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center shadow-lg transform transition-all duration-500 group-hover:rotate-12 group-hover:scale-110`}>
                          <span className="text-2xl">{step.icon}</span>
                        </div>
                        <div className={`absolute -inset-2 bg-gradient-to-r ${step.color} rounded-2xl blur opacity-0 group-hover:opacity-60 transition-opacity duration-500`}></div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-5xl font-black bg-gradient-to-r ${step.color} bg-clip-text text-transparent opacity-30 group-hover:opacity-60 transition-opacity duration-500`}>
                        {step.number}
                      </div>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-white group-hover:text-blue-100 transition-colors duration-500">
                      {step.title}
                    </h3>
                    <p className="text-blue-200/70 text-sm leading-relaxed group-hover:text-blue-100/90 transition-colors duration-500">
                      {step.description}
                    </p>
                  </div>
                  
                  {/* Progress indicator */}
                  <div className="mt-6 pt-4 border-t border-blue-500/10">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        {[...Array(4)].map((_, i) => (
                          <div 
                            key={i}
                            className={`w-2 h-1 rounded-full transition-all duration-500 ${
                              i <= index 
                                ? `bg-gradient-to-r ${step.color}` 
                                : 'bg-blue-500/20'
                            }`}
                          ></div>
                        ))}
                      </div>
                      <div className={`text-xs font-medium bg-gradient-to-r ${step.color} bg-clip-text text-transparent`}>
                        Etapa {step.number}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Right Column - Featured Image */}
          <div className="lg:col-span-1 relative group">
            <div className="relative">
              {/* Glowing border effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-700"></div>
              
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 backdrop-blur-sm border border-blue-500/20 p-1">
                <div className="relative overflow-hidden rounded-2xl">
                  <img 
                    src="/lovable-uploads/910e6544-f6ef-4949-9ce4-ef0b67fbe305.png"
                    alt="Cliente satisfeito"
                    className="w-full h-[500px] object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  
                  {/* Overlay gradients */}
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-900/50 via-transparent to-transparent"></div>
                  <div className="absolute inset-0 bg-gradient-to-l from-blue-600/20 via-transparent to-indigo-600/20"></div>
                  
                  {/* Floating stats */}
                  <div className="absolute top-6 left-6 bg-blue-500/10 backdrop-blur-md rounded-xl px-4 py-3 border border-blue-400/20">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">500+</div>
                      <div className="text-xs text-blue-200/70">projetos</div>
                    </div>
                  </div>
                  
                  <div className="absolute bottom-6 right-6 bg-blue-500/10 backdrop-blur-md rounded-xl px-4 py-3 border border-blue-400/20">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-white text-sm font-medium">Disponível</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <Link to="/login">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full px-8 py-4 hover:scale-105 transition-transform duration-300 cursor-pointer group">
              <span className="text-white font-semibold">Publique Seu Projeto</span>
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform duration-300">
                <span className="text-white text-sm">→</span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ClientStepsSection;
