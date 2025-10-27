import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Award } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FeaturedFreelancersService } from "@/services/featuredFreelancersService";
import { UserProfile } from "@/types/user";

const FeaturedFreelancersSection = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("Redação");
  const [freelancersByCategory, setFreelancersByCategory] = useState<{ [key: string]: UserProfile[] }>({});
  const [categoryCounts, setCategoryCounts] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);

  const categories = [
    "Redação",
    "Design",
    "Programação",
    "Marketing",
    "Tradução",
    "Locução"
  ];

  useEffect(() => {
    loadFreelancers();
  }, []);

  const loadFreelancers = async () => {
    try {
      setLoading(true);

      // Buscar freelancers selecionados pelo gestor
      const freelancersBySkill: { [key: string]: UserProfile[] } = {};
      const skillCounts: { [key: string]: number } = {};

      // Inicializar categorias
      categories.forEach(category => {
        freelancersBySkill[category] = [];
        skillCounts[category] = 0;
      });

      // Buscar freelancers por categoria
      for (const category of categories) {
        try {
          const categoryFreelancers = await FeaturedFreelancersService.getFeaturedFreelancersByCategory(category);
          freelancersBySkill[category] = categoryFreelancers;
          skillCounts[category] = categoryFreelancers.length;
        } catch (error) {
          console.error(`Erro ao carregar freelancers da categoria ${category}:`, error);
          freelancersBySkill[category] = [];
          skillCounts[category] = 0;
        }
      }

      setFreelancersByCategory(freelancersBySkill);
      setCategoryCounts(skillCounts);

    } catch (error) {
      console.error('Erro ao carregar freelancers:', error);
      // Em caso de erro, manter as categorias vazias
      const emptyCategories: { [key: string]: UserProfile[] } = {};
      const emptyCounts: { [key: string]: number } = {};
      categories.forEach(category => {
        emptyCategories[category] = [];
        emptyCounts[category] = 0;
      });
      setFreelancersByCategory(emptyCategories);
      setCategoryCounts(emptyCounts);
    } finally {
      setLoading(false);
    }
  };

  const currentFreelancers = freelancersByCategory[activeCategory] || [];

  const getBadge = (freelancer: UserProfile) => {
    if (freelancer.rating >= 4.8) return { text: "Top Rated", color: "bg-yellow-500" };
    if (freelancer.rating >= 4.5) return { text: "Pro", color: "bg-blue-600" };
    return { text: "Verified", color: "bg-green-600" };
  };

  const getPrice = (freelancer: UserProfile) => {
    // Se o freelancer tiver um hourlyRate definido, usar isso
    if (freelancer.hourlyRate) {
      return `R$ ${freelancer.hourlyRate}/hora`;
    }

    // Caso contrário, estimar baseado na categoria e rating
    const baseRates: { [key: string]: number } = {
      "Redação": 45,
      "Design": 65,
      "Programação": 95,
      "Marketing": 60,
      "Tradução": 55,
      "Locução": 80
    };

    const baseRate = baseRates[activeCategory] || 50;
    const ratingMultiplier = freelancer.rating > 4.5 ? 1.2 : 1.0;
    const finalRate = Math.round(baseRate * ratingMultiplier);

    return `R$ ${finalRate}/hora`;
  };

  if (loading) {
    return (
      <section id="featured-freelancers" className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando freelancers...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="featured-freelancers" className="py-20 bg-gray-50">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Encontre Freelancers
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Busque designers, escritores, tradutores, programadores, etc, com
            portfólio completo, para você ganhar tempo.
          </p>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {categories.map((category, index) => (
              <Button
                key={index}
                variant={activeCategory === category ? "default" : "outline"}
                onClick={() => setActiveCategory(category)}
                className={`${activeCategory === category
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  } px-6 py-2 rounded-full font-medium transition-all duration-300 cursor-pointer`}
              >
                {category} ({categoryCounts[category] || 0})
              </Button>
            ))}
          </div>
        </div>

        {/* Freelancers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-16">
          {currentFreelancers.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-gray-400 mb-4">
                <Star className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-medium text-gray-600 mb-2">
                Nenhum freelancer encontrado
              </h3>
              <p className="text-gray-500">
                Não há freelancers cadastrados nesta categoria ainda.
              </p>
            </div>
          ) : (
            currentFreelancers.slice(0, 8).map((freelancer) => {
              const badge = getBadge(freelancer);
              const price = getPrice(freelancer);

              return (
                <Card
                  key={freelancer.uid}
                  className="group bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 overflow-hidden"
                >
                  <CardContent className="p-0">
                    {/* Profile Image */}
                    <div className="relative">
                      <div className="aspect-square overflow-hidden">
                        <Avatar className="w-full h-full rounded-none">
                          {freelancer.profileImage && (
                            <AvatarImage
                              src={freelancer.profileImage}
                              alt={freelancer.name}
                              className="object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          )}
                          <AvatarFallback className="w-full h-full rounded-none text-2xl font-bold bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                            {freelancer.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      {/* Badge */}
                      <div className="absolute top-3 left-3">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold text-white ${badge.color}`}>
                          <Award className="w-3 h-3" />
                          {badge.text}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full">
                        <span className="text-sm font-bold text-gray-900">{price}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <div className="mb-3">
                        <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors duration-300">
                          {freelancer.name}
                        </h3>
                        <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                          {activeCategory}
                        </span>
                      </div>

                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {freelancer.bio || freelancer.skills || "Profissional experiente e qualificado"}
                      </p>

                      {/* Rating */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-bold text-gray-900">
                            {freelancer.rating > 0 ? freelancer.rating.toFixed(1) : "5.0"}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          ({freelancer.ratingCount || 0} avaliações)
                        </span>
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-1 text-gray-500 text-sm mb-4">
                        <MapPin className="w-4 h-4" />
                        <span>{freelancer.location || "Brasil"}</span>
                      </div>

                      {/* Action Button */}
                      <Button 
                        onClick={() => navigate(`/portfolio/${freelancer.uid}`)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-all duration-300 group-hover:bg-blue-700"
                      >
                        Ver Perfil
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 text-center">
          A plataforma que conecta os melhores freelancers, com projetos
          incríveis. Transforme suas ideias em realidade.
        </p>
        {/* CTA */}
        <div className="text-center">
          <Button
            size="lg"
            className="bg-gray-900 hover:bg-gray-800 text-white px-12 py-4 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            Ver Todos os Freelancers
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedFreelancersSection;
