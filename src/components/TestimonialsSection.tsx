import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const TestimonialsSection = () => {
  const testimonials = [
    {
      id: 1,
      name: "Maria Silva",
      role: "CEO, TechStart",
      avatar: "/lovable-uploads/testimonial-1.jpg",
      rating: 5,
      text: "Encontrei o freelancer perfeito para meu projeto em apenas 2 dias. A plataforma é intuitiva e o sistema de pagamento é muito seguro.",
      project: "Desenvolvimento de App Mobile"
    },
    {
      id: 2,
      name: "João Santos",
      role: "Freelancer Designer",
      avatar: "/lovable-uploads/testimonial-2.jpg",
      rating: 5,
      text: "Como freelancer, essa plataforma mudou minha vida profissional. Consigo encontrar projetos de qualidade e receber pagamentos garantidos.",
      project: "Design de Identidade Visual"
    },
    {
      id: 3,
      name: "Ana Costa",
      role: "Diretora de Marketing",
      avatar: "/lovable-uploads/testimonial-3.jpg",
      rating: 5,
      text: "A mediação inteligente da plataforma resolveu um conflito que tive de forma muito profissional. Recomendo para todos!",
      project: "Campanha de Marketing Digital"
    },
    {
      id: 4,
      name: "Carlos Oliveira",
      role: "Freelancer Desenvolvedor",
      avatar: "/lovable-uploads/testimonial-4.jpg",
      rating: 5,
      text: "Excelente plataforma! Os clientes são sérios e os pagamentos sempre chegam no prazo. Já fiz mais de 50 projetos aqui.",
      project: "Desenvolvimento Web"
    },
    {
      id: 5,
      name: "Lucia Ferreira",
      role: "Empreendedora",
      avatar: "/lovable-uploads/testimonial-5.jpg",
      rating: 5,
      text: "Consegui lançar minha startup graças aos freelancers que encontrei aqui. A qualidade dos profissionais é excepcional.",
      project: "Desenvolvimento de E-commerce"
    },
    {
      id: 6,
      name: "Pedro Almeida",
      role: "Freelancer Copywriter",
      avatar: "/lovable-uploads/testimonial-6.jpg",
      rating: 5,
      text: "Interface limpa, processos claros e suporte excelente. É a melhor plataforma de freelance que já usei.",
      project: "Redação de Conteúdo"
    }
  ];

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            O que nossos usuários dizem
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Milhares de clientes e freelancers já transformaram seus negócios conosco. 
            Veja alguns depoimentos reais de nossa comunidade.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-white border-0 shadow-lg">
              <CardContent className="p-6">
                {/* Quote Icon */}
                <div className="mb-4">
                  <Quote className="w-8 h-8 text-blue-600 opacity-60" />
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1 mb-4">
                  {renderStars(testimonial.rating)}
                </div>

                {/* Testimonial Text */}
                <p className="text-gray-700 mb-6 leading-relaxed">
                  "{testimonial.text}"
                </p>

                {/* Project Type */}
                <div className="mb-4">
                  <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    {testimonial.project}
                  </span>
                </div>

                {/* User Info */}
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">10,000+</div>
            <div className="text-gray-600">Projetos Concluídos</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">5,000+</div>
            <div className="text-gray-600">Freelancers Ativos</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">98%</div>
            <div className="text-gray-600">Satisfação dos Clientes</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">24h</div>
            <div className="text-gray-600">Tempo Médio de Resposta</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;