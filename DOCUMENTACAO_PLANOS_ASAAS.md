# Documentação - Sistema de Planos Asaas

## Visão Geral

Sistema completo de gerenciamento de planos de assinatura integrado com o gateway de pagamento Asaas. Permite criar, editar, excluir e personalizar planos com checkout integrado.

## Arquitetura

### Frontend

#### Tipos (`src/types/plan.ts`)
- **Plan**: Interface principal do plano com todos os campos
- **PlanFeature**: Recursos customizáveis do plano
- **PlanCardStyle**: Personalização visual dos cards
- **CreatePlanInput**: Dados para criar novo plano
- **UpdatePlanInput**: Dados para atualizar plano
- **Subscription**: Dados de assinatura ativa

#### Serviços (`src/services/planService.ts`)
- `getActivePlans()`: Busca planos ativos
- `getAllPlans()`: Busca todos os planos (admin)
- `getPlanById(planId)`: Busca plano específico
- `createPlan(planData)`: Cria novo plano
- `updatePlan(planData)`: Atualiza plano existente
- `deletePlan(planId)`: Deleta plano
- `createSubscription(planId)`: Cria assinatura e retorna URL de checkout
- `getPlansByCategory(category)`: Busca planos por categoria

#### Componentes

**ManagerPlansAsaas** (`src/pages/manager/ManagerPlansAsaas.tsx`)
- Página de gerenciamento completo de planos
- Interface administrativa com abas por categoria
- Integração com CRUD completo

**PlanFormDialog** (`src/components/manager/PlanFormDialog.tsx`)
- Formulário modal para criar/editar planos
- Suporta personalização de:
  - Informações básicas (nome, descrição, preço, ciclo)
  - Limites (mensagens, curtidas)
  - Features customizáveis
  - Estilo do card (destaque, badge)

**PlanCard** (`src/components/manager/PlanCard.tsx`)
- Card visual do plano
- Mostra todas as informações e recursos
- Ações de editar/excluir para admin

**PlansSection** (`src/components/PlansSection.tsx`)
- Seção pública de exibição de planos
- Integrado com checkout
- Suporte a plano gratuito

**CheckoutDialog** (`src/components/CheckoutDialog.tsx`)
- Modal de confirmação e checkout
- Abre janela de pagamento Asaas
- Mostra resumo do plano e informações importantes

### Backend

#### Cloud Functions (`functions/src/asaasPlansManagement.ts`)

**createAsaasPlan**
- URL: `https://us-central1-xjobs-a43d2.cloudfunctions.net/createAsaasPlan`
- Método: POST
- Auth: Bearer token (admin)
- Body:
```json
{
  "name": "Plano Premium",
  "description": "Plano completo para profissionais",
  "price": 9990,
  "category": 1,
  "messageLimit": null,
  "likeLimit": 100,
  "features": [
    { "id": "1", "label": "Feature 1", "enabled": true }
  ],
  "cardStyle": {
    "highlighted": true,
    "badge": { "text": "POPULAR", "bgColor": "#10b981", "textColor": "#ffffff" }
  }
}
```

**updateAsaasPlan**
- URL: `https://us-central1-xjobs-a43d2.cloudfunctions.net/updateAsaasPlan`
- Método: PUT
- Auth: Bearer token (admin)
- Body: Mesmos campos do create + `id` do plano

**deleteAsaasPlan**
- URL: `https://us-central1-xjobs-a43d2.cloudfunctions.net/deleteAsaasPlan`
- Método: DELETE
- Auth: Bearer token (admin)
- Body: `{ "planId": "plan_id_here" }`

**listAsaasPlans**
- URL: `https://us-central1-xjobs-a43d2.cloudfunctions.net/listAsaasPlans`
- Método: GET
- Auth: Bearer token (opcional)
- Query params: `?activeOnly=true` (para listar apenas ativos)

## Estrutura de Dados Firestore

### Collection: `plans`

```javascript
{
  name: "Plano Premium",
  description: "Descrição do plano",
  price: 9990, // em centavos
  category: 1, // 1=Mensal, 3=Trimestral, 6=Semestral, 12=Anual
  cycle: "MONTHLY", // MONTHLY, QUARTERLY, SEMIANNUALLY, YEARLY
  messageLimit: 100, // null = ilimitado
  likeLimit: 500, // null = ilimitado
  features: [
    {
      id: "1",
      label: "Suporte prioritário",
      enabled: true
    }
  ],
  cardStyle: {
    highlighted: true,
    badge: {
      text: "MAIS POPULAR",
      bgColor: "#10b981",
      textColor: "#ffffff"
    }
  },
  status: "active", // active | inactive
  gateway: "asaas",
  subscribers: 0,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Collection: `activeSubscriptions`

```javascript
{
  userId: "user_id",
  planId: "plan_id",
  planName: "Plano Premium",
  price: 99.90,
  category: 1,
  likeLimit: 500,
  messageLimit: 100,
  gateway: "asaas",
  asaasSubscriptionId: "sub_xxx",
  asaasCustomerId: "cus_xxx",
  status: "active", // active | inactive | cancelled | pending
  nextDueDate: "2025-11-27",
  cycle: "MONTHLY",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Document: `settings/plans`

```javascript
{
  status: true // true = sistema de planos ativo, false = mostrar apenas plano gratuito
}
```

## Fluxo de Uso

### 1. Criar Plano (Admin)

1. Acessar `/manager/plans`
2. Clicar em "Criar Novo Plano"
3. Preencher formulário:
   - Nome e descrição
   - Preço e ciclo de cobrança
   - Limites (deixar vazio para ilimitado)
   - Adicionar features customizadas
   - Configurar personalização visual
4. Salvar

### 2. Editar Plano (Admin)

1. Acessar `/manager/plans`
2. Clicar em "Editar" no card do plano
3. Modificar campos desejados
4. Salvar alterações

### 3. Excluir Plano (Admin)

1. Acessar `/manager/plans`
2. Clicar em "Excluir" no card do plano
3. Confirmar exclusão (não permitido se houver assinaturas ativas)

### 4. Assinar Plano (Usuário)

1. Visualizar planos na landing page ou em `/freelancer/meus-planos`
2. Clicar em "Assinar Agora"
3. Se não estiver logado, será redirecionado para login
4. Após login, modal de checkout é aberto
5. Confirmar assinatura
6. Janela de pagamento Asaas abre
7. Completar pagamento via PIX ou Cartão
8. Assinatura ativada automaticamente via webhook

## Personalização de Cards

### Campos de Estilo

- **highlighted**: `boolean` - Card em destaque (borda azul)
- **badge**: Objeto com badge superior
  - **text**: Texto do badge (ex: "MAIS POPULAR")
  - **bgColor**: Cor de fundo (hex)
  - **textColor**: Cor do texto (hex)

### Features Customizáveis

Adicione quantos recursos quiser no array `features`:

```javascript
{
  id: "unique_id",
  label: "Descrição do recurso",
  enabled: true // false = não mostrar
}
```

## Categorias (Ciclos de Cobrança)

- **1**: Mensal (MONTHLY)
- **3**: Trimestral (QUARTERLY)
- **6**: Semestral (SEMIANNUALLY)
- **12**: Anual (YEARLY)

## Limites

- **messageLimit**: Número de mensagens por projeto
  - `null` = ilimitado
  - `> 0` = quantidade específica

- **likeLimit**: Número de curtidas por mês
  - `null` = ilimitado
  - `> 0` = quantidade específica

## Integração com Asaas

### Criação de Assinatura

Quando um usuário assina um plano:

1. Sistema chama `createAsaasSubscription` (função existente)
2. Asaas cria assinatura e retorna URL de checkout
3. Usuário é redirecionado para pagamento
4. Após pagamento, webhook atualiza status
5. Plano é ativado automaticamente

### Webhook

O webhook existente (`asaasWebhook`) já gerencia:
- Confirmação de pagamento
- Ativação de assinatura
- Renovações automáticas
- Cancelamentos

## Segurança

### Permissões

- **Criar/Editar/Excluir planos**: Apenas admins
- **Listar planos ativos**: Qualquer usuário
- **Assinar plano**: Usuário autenticado
- **Listar todos os planos**: Apenas admins

### Validações

- Preço deve ser > 0
- Nome é obrigatório
- Categoria deve ser 1, 3, 6 ou 12
- Não permite excluir plano com assinaturas ativas
- Token de autenticação obrigatório para operações

## Deploy

### Frontend
```bash
npm run build
```

### Backend (Cloud Functions)
```bash
cd functions
npm run build
firebase deploy --only functions:createAsaasPlan,functions:updateAsaasPlan,functions:deleteAsaasPlan,functions:listAsaasPlans
```

## Testes

### Criar Plano de Teste

```bash
curl -X POST https://us-central1-xjobs-a43d2.cloudfunctions.net/createAsaasPlan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "Plano Teste",
    "description": "Plano para testes",
    "price": 1990,
    "category": 1,
    "messageLimit": 10,
    "likeLimit": 50
  }'
```

### Listar Planos

```bash
curl https://us-central1-xjobs-a43d2.cloudfunctions.net/listAsaasPlans?activeOnly=true
```

## Troubleshooting

### Planos não aparecem

1. Verificar se `settings/plans.status` está `true`
2. Verificar se planos têm `status: 'active'`
3. Verificar se planos têm `gateway: 'asaas'`

### Erro ao criar assinatura

1. Verificar se usuário está autenticado
2. Verificar se plano existe e está ativo
3. Verificar logs do Firebase Functions
4. Verificar credenciais Asaas

### Card não personalizado

1. Verificar se `cardStyle` está preenchido
2. Verificar se `features` estão com `enabled: true`
3. Limpar cache do navegador

## Próximos Passos

- [ ] Implementar descontos por tempo limitado
- [ ] Adicionar período de teste gratuito
- [ ] Implementar cupons de desconto
- [ ] Dashboard de análise de assinaturas
- [ ] Relatórios de receita
- [ ] Notificações de renovação

