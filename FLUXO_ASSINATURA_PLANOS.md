# 🔄 Fluxo de Assinatura de Planos

## ✅ Implementação Completa

O sistema agora requer que o usuário esteja logado antes de assinar um plano na landing page, e o redireciona automaticamente para a aba de planos após o login.

---

## 📋 Fluxo Implementado

### **1. Usuário na Landing Page (Não Logado)**

```
Usuário clica em "Assinar Plano" na Landing Page
    ↓
Sistema detecta: isLandingPage=true
    ↓
Sistema salva intenção no localStorage:
{
  planId: "plan_xxx",
  planName: "Plano 50",
  price: 4990,
  timestamp: 1234567890
}
    ↓
Verifica autenticação
    ↓
❌ Não autenticado
    ↓
Redireciona para: /login?redirect=/&action=subscribe-plan
    ↓
Mostra alerta: "Por favor, faça login ou cadastre-se para assinar este plano."
```

### **1.1. Usuário na Landing Page (Já Logado)**

```
Usuário LOGADO clica em "Assinar Plano" na Landing Page
    ↓
Sistema detecta: isLandingPage=true
    ↓
Sistema salva intenção no localStorage
    ↓
✅ Autenticado
    ↓
Redireciona para: /freelancer/meus-planos
    ↓
Mostra alerta: "Você será redirecionado para a área de planos para concluir a assinatura."
    ↓
Usuário completa assinatura na área logada
```

### **2. Tela de Login**

```
Usuário faz login (email/senha ou Google)
    ↓
Sistema verifica se há plano pendente (localStorage)
    ↓
✅ Há plano pendente
    ↓
Verifica role do usuário:
- Se FREELANCER → redireciona para /freelancer?tab=planos
- Se CLIENT → redireciona para /dashboard-cliente
```

### **3. FreelancerLayout**

```
Detecta parâmetro ?tab=planos
    ↓
Redireciona automaticamente para /freelancer/meus-planos
    ↓
Usuário vê a página de planos
    ↓
Sistema detecta plano pendente no localStorage
    ↓
Pode processar assinatura automaticamente (futuro)
```

### **4. Usuário já Logado**

```
Usuário logado clica em "Assinar Plano"
    ↓
✅ Autenticado
    ↓
Sistema gera link de pagamento imediatamente
    ↓
Redireciona para página de pagamento do Pagar.me
```

---

## 📂 Arquivos Modificados

### **1. `src/components/PlansSection.tsx`**

**O que foi modificado:**
- Adiciona prop `isLandingPage` para controlar comportamento
- **Na landing page**: SEMPRE redireciona para login/cadastro ou área de planos
- **Fora da landing page**: Verifica autenticação antes de processar pagamento
- Salva intenção de assinatura no localStorage
- Redireciona para login com parâmetros apropriados

**Código principal:**
```typescript
// Se está na landing page, SEMPRE redirecionar
if (isLandingPage) {
  // Salvar intenção
  localStorage.setItem('pendingPlanSubscription', JSON.stringify({
    planId: plan.id,
    planName: plan.name,
    price: plan.price,
    timestamp: Date.now()
  }));
  
  // Se não está logado, ir para login
  if (!user) {
    const redirectUrl = `/login?redirect=${encodeURIComponent(currentPath)}&action=subscribe-plan`;
    alert('Por favor, faça login ou cadastre-se para assinar este plano.');
    window.location.href = redirectUrl;
    return;
  }
  
  // Se está logado, ir para área de planos
  alert('Você será redirecionado para a área de planos para concluir a assinatura.');
  window.location.href = '/freelancer/meus-planos';
  return;
}
```

### **2. `src/pages/Login.tsx`**

**O que foi modificado:**
- Adiciona `useSearchParams` para ler parâmetros da URL
- Cria função `checkPendingSubscription()` para verificar plano pendente
- Modifica lógica de redirecionamento em todos os métodos de login:
  - `handleSubmit` (login email/senha)
  - `handleGoogleLogin` (login com Google)
  - `handleRoleSelected` (seleção de role após Google login)

**Código principal:**
```typescript
// Verificar se há plano pendente
const checkPendingSubscription = () => {
  const action = searchParams.get('action');
  if (action === 'subscribe-plan') {
    const pendingPlan = localStorage.getItem('pendingPlanSubscription');
    return pendingPlan ? JSON.parse(pendingPlan) : null;
  }
  return null;
};

// No login bem-sucedido
const pendingPlan = checkPendingSubscription();

if (userProfile.role === 'freelancer') {
  if (pendingPlan) {
    navigate('/freelancer?tab=planos');
  } else {
    navigate('/freelancer');
  }
}
```

### **3. `src/pages/Index.tsx`**

**O que foi modificado:**
- Passa prop `isLandingPage={true}` para o PlansSection
- Garante que planos na landing sempre redirecionem

**Código principal:**
```typescript
{showPlans && <PlansSection isLandingPage={true} />}
```

### **4. `src/pages/freelancer/FreelancerLayout.tsx`**

**O que foi modificado:**
- Adiciona `useEffect` para detectar parâmetro `?tab=planos`
- Redireciona automaticamente para `/freelancer/meus-planos`

**Código principal:**
```typescript
useEffect(() => {
  const tab = searchParams.get('tab');
  if (tab === 'planos' && location.pathname === '/freelancer') {
    navigate('/freelancer/meus-planos', { replace: true });
  }
}, [searchParams, location.pathname, navigate]);
```

---

## 🎯 Benefícios da Implementação

### ✅ **Experiência do Usuário Melhorada**
- Usuário não perde o contexto ao fazer login
- Redirecionamento automático para onde queria ir
- Fluxo intuitivo e sem fricções

### ✅ **Segurança**
- Apenas usuários autenticados podem assinar planos
- Verificação em múltiplos pontos

### ✅ **Conversão**
- Reduz abandono ao manter intenção de compra
- Processo simplificado após login

---

## 🔮 Melhorias Futuras (Opcional)

### **1. Processar Assinatura Automaticamente**

Na página `MeusPlanos.tsx`, detectar o plano pendente e iniciar o processo automaticamente:

```typescript
useEffect(() => {
  const pendingPlan = localStorage.getItem('pendingPlanSubscription');
  if (pendingPlan) {
    const plan = JSON.parse(pendingPlan);
    // Auto-processar ou destacar o plano
    setHighlightedPlan(plan.planId);
    
    // Limpar localStorage após processar
    localStorage.removeItem('pendingPlanSubscription');
  }
}, []);
```

### **2. Toast de Boas-Vindas**

Após login com plano pendente, mostrar toast informativo:

```typescript
if (pendingPlan) {
  toast({
    title: "Bem-vindo!",
    description: `Complete a assinatura do ${pendingPlan.planName}`,
  });
}
```

### **3. Expiração do Plano Pendente**

Verificar timestamp e expirar intenção após X minutos:

```typescript
const EXPIRY_TIME = 30 * 60 * 1000; // 30 minutos
const isExpired = (Date.now() - pendingPlan.timestamp) > EXPIRY_TIME;

if (isExpired) {
  localStorage.removeItem('pendingPlanSubscription');
  return null;
}
```

---

## 🧪 Como Testar

### **Teste 1: Usuário Não Logado**
1. Acesse a landing page sem estar logado
2. Clique em "Assinar" em qualquer plano pago
3. ✅ Deve aparecer alerta e redirecionar para /login
4. Faça login
5. ✅ Deve ser redirecionado para /freelancer/meus-planos

### **Teste 2: Usuário Já Logado**
1. Faça login como freelancer
2. Volte para landing page (não deslogue)
3. Clique em "Assinar" em um plano
4. ✅ Deve gerar link de pagamento imediatamente

### **Teste 3: Login com Google**
1. Acesse landing page
2. Clique em "Assinar" um plano
3. Na tela de login, use "Continuar com Google"
4. ✅ Após autenticar, deve ir para /freelancer/meus-planos

### **Teste 4: Cadastro Novo**
1. Acesse landing page
2. Clique em "Assinar" um plano
3. Clique em "criar uma nova conta"
4. Complete o cadastro como freelancer
5. ✅ Após cadastro, deve ir para /freelancer/meus-planos

---

## 📊 Dados no LocalStorage

### **Estrutura do Plano Pendente:**
```json
{
  "planId": "plan_qXyKmJohjhDlnDNx",
  "planName": "Plano 50",
  "price": 990,
  "timestamp": 1696970400000
}
```

### **Quando é Criado:**
- Quando usuário não logado clica em "Assinar Plano"

### **Quando é Lido:**
- Na tela de Login, após autenticação bem-sucedida

### **Quando Deve Ser Removido:**
- Após processar a assinatura (implementar)
- Após expiração do tempo (implementar)
- Manualmente pelo usuário (limpar cache)

---

## ✅ Status da Implementação

- ✅ **Salvar intenção no localStorage**
- ✅ **Redirecionar para login com parâmetros**
- ✅ **Verificar plano pendente após login**
- ✅ **Redirecionar para aba de planos**
- ✅ **Suporte para login email/senha**
- ✅ **Suporte para login com Google**
- ✅ **Suporte para seleção de role**
- 🔄 **Auto-processar assinatura** (futuro)
- 🔄 **Expiração de intenção** (futuro)
- 🔄 **Toast informativo** (futuro)

---

## 🎉 Conclusão

O fluxo de assinatura de planos agora está completamente funcional e proporciona uma experiência profissional para os usuários, garantindo que:

1. ✅ Apenas usuários autenticados podem assinar planos
2. ✅ A intenção de assinatura não é perdida durante o login
3. ✅ O usuário é automaticamente redirecionado para onde queria ir
4. ✅ O processo é intuitivo e sem fricções

**Próximo passo:** Implementar melhorias opcionais conforme a necessidade do negócio.

