import { Crown, Calendar, MessageSquare, Heart, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import PlansSection from "@/components/PlansSection";
import { usePlans } from "@/hooks/usePlans";

const MeusPlanos = () => {
  const { 
    currentUserPlan: currentPlan, 
    availablePlans,
    loading,
    selectPlan,
    cancelPlan,
    likesProgress,
    messagesProgress
  } = usePlans();

  const handleSelectPlan = async (planName: string, duration: string) => {
    const result = await selectPlan(planName, duration);
    if (result.success) {
      // Redirecionar para página de pagamento ou mostrar sucesso
      console.log('Plano selecionado com sucesso!');
    } else {
      console.error('Erro ao selecionar plano:', result.error);
    }
  };

  const handleCancelPlan = async () => {
    const result = await cancelPlan();
    if (result.success) {
      console.log('Plano cancelado com sucesso!');
    } else {
      console.error('Erro ao cancelar plano:', result.error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Crown className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Meus Planos</h1>
            <p className="text-blue-100">Gerencie sua assinatura e aumente suas oportunidades</p>
          </div>
        </div>
      </div>

      {/* Plano Atual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Plano Atual
          </CardTitle>
          <CardDescription>
            Acompanhe o uso do seu plano e renove quando necessário
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentPlan ? (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Info do Plano */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{currentPlan.name}</h3>
                    <p className="text-sm text-gray-500">
                      {currentPlan.isActive ? "Ativo" : "Inativo"}
                    </p>
                  </div>
                  <Badge variant={currentPlan.isActive ? "default" : "secondary"}>
                    {currentPlan.isActive ? "Ativo" : "Expirado"}
                  </Badge>
                </div>

                {currentPlan.renewalDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Renovação: {new Date(currentPlan.renewalDate).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
              </div>

              {/* Uso do Plano */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium">Curtidas</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {currentPlan.likesUsed}/{currentPlan.likes}
                    </span>
                  </div>
                  <Progress value={likesProgress} className="h-2" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Mensagens</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {currentPlan.messagesUsed}/{currentPlan.messages}
                    </span>
                  </div>
                  <Progress value={messagesProgress} className="h-2" />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500">Nenhum plano encontrado.</div>
          )}

          {/* Estatísticas */}
          {currentPlan && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">Este Mês</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">15</p>
                  <p className="text-xs text-gray-500">Projetos visualizados</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                    <Heart className="h-4 w-4" />
                    <span className="text-sm font-medium">Curtidas</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{currentPlan.likesUsed}</p>
                  <p className="text-xs text-gray-500">Utilizadas</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm font-medium">Mensagens</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{currentPlan.messagesUsed}</p>
                  <p className="text-xs text-gray-500">Enviadas</p>
                </div>
              </div>
            </div>
          )}

          {/* Ações do Plano Atual */}
          <div className="mt-6 flex gap-3">
            {currentPlan && currentPlan.name === "Gratuito" && (
              <Button className="flex-1" disabled={loading} onClick={() => handleSelectPlan("Premium", "mensal")}>Assinar plano</Button>
            )}
            {currentPlan && currentPlan.name !== "Gratuito" && (
              <>
                <Button variant="outline" className="flex-1" onClick={handleCancelPlan} disabled={loading}>Cancelar plano</Button>
                <Button className="flex-1" disabled={loading} onClick={() => handleSelectPlan("Premium", "mensal")}>Alterar plano</Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Todos os Planos */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Todos os Planos Disponíveis
        </h2>
        <PlansSection 
          showAsSection={false} 
          currentPlan={currentPlan ? currentPlan.name : ""}
          onSelectPlan={handleSelectPlan}
        />
      </div>

      {/* FAQ ou Dicas */}
      <Card>
        <CardHeader>
          <CardTitle>Dicas para Maximizar seu Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">💡 Use suas curtidas estrategicamente</h4>
              <p>Priorize projetos que mais se alinham com suas habilidades e experiência.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">📝 Mensagens personalizadas</h4>
              <p>Escreva propostas únicas e detalhadas para se destacar dos concorrentes.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">⏰ Monitore prazos</h4>
              <p>Fique atento às datas de renovação para não perder oportunidades.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">📊 Acompanhe métricas</h4>
              <p>Use as estatísticas para entender quais estratégias funcionam melhor.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MeusPlanos;