# 🚀 Como Simular Antecipação (Adiantamento)

## 📋 Pré-requisitos

Para testar a simulação de antecipação, você precisa:

1. ✅ **Pagamento em Cartão de Crédito** - A antecipação só funciona para pagamentos feitos com cartão
2. ✅ **Valor Liberado** - O cliente precisa ter liberado o pagamento para o freelancer
3. ✅ **Bloqueio de 35 dias** - O pagamento deve ter `availableAt` no futuro (35 dias)
4. ✅ **asaasPaymentId** - O pagamento deve ter sido processado pelo Asaas e ter um ID válido

## 🎬 Passo a Passo para Testar

### 1. Criar Pagamento com Cartão de Crédito

```bash
# Cliente faz um pagamento de projeto usando CARTÃO DE CRÉDITO
# Certifique-se que o método de pagamento é "CREDIT_CARD"
```

**No código, o pagamento deve ter:**
```javascript
{
  paymentMethod: 'CREDIT_CARD',
  asaasPaymentId: 'pay_xxxxxx', // ID do Asaas
  availableAt: Timestamp(now + 35 dias), // 35 dias no futuro
  status: 'confirmed'
}
```

### 2. Cliente Libera o Valor para o Freelancer

No chat do projeto, o cliente deve:
- Clicar em "Liberar Pagamento"
- Confirmar a liberação

**Isso cria um registro em `fundReleases` com status `released`**

### 3. Freelancer Acessa "Minhas Finanças"

O freelancer vai em:
```
/freelancer/minhas-financas
```

Deve ver:
- 💚 **Saldo Disponível**: R$ 0,00 (se não houver outros valores)
- 💙 **Total Liberado**: R$ 0,00
- 💛 **Processando**: R$ 0,00
- 🧡 **Pendente (Cartão 35 dias)**: R$ XXX,XX ← **O valor do pagamento aparece aqui!**

### 4. Clicar em "⚡ Adiantar Agora"

Quando o freelancer clica no botão de adiantamento, o sistema:

1. **Abre o Dialog de Adiantamento**
2. **Verifica Elegibilidade** (se o pagamento é elegível)
3. **🎯 SIMULA COM O ASAAS** ← **Aqui acontece a mágica!**

### 5. O Que Acontece na Simulação

**Backend (Firebase Function):**

A função `simulateAdvanceRequest` é chamada:

```bash
POST https://simulateadvancerequest-bo5fg4zxxq-uc.a.run.app
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body:
  { "projectId": "..." }
```

**A função faz:**

1. Busca o pagamento em `projectPayments`
2. Valida se é cartão de crédito e está bloqueado
3. Pega o `asaasPaymentId`
4. **Chama a API do Asaas:**
   ```bash
   POST https://api.asaas.com/v3/anticipations/simulate
   Body: { "payment": "pay_xxxxxx" }
   ```

5. **Recebe a resposta do Asaas:**
   ```json
   {
     "value": 1000.00,           // Valor total
     "netValue": 979.00,          // Valor líquido após taxa
     "fee": 21.00,                // Taxa exata do Asaas
     "anticipationDays": 35,      // Dias antecipados
     "isDocumentationRequired": false
   }
   ```

6. Retorna para o frontend

### 6. O Que o Freelancer Vê no Dialog

**Card Verde (Simulação Confirmada):**
```
✅ Simulação Asaas confirmada
━━━━━━━━━━━━━━━━━━━━━━━━━━
Valor disponível:        R$ 1.000,00
Taxa Asaas (2.10%):     - R$ 21,00
━━━━━━━━━━━━━━━━━━━━━━━━━━
Você receberá:           R$ 979,00
```

**Card Azul (Informações):**
```
💳 Adiantamento de valores bloqueados
━━━━━━━━━━━━━━━━━━━━━━━━━━
Valor bloqueado disponível:     R$ 1.000,00
Valor máximo p/ adiantamento:   R$ 1.000,00
Adiantamentos este mês:         0/5
```

**Aviso Importante:**
```
⚠️ Importante: O adiantamento será processado pelo Asaas.
Taxa confirmada: 2.10%

✓ Aprovação automática (até R$ 500)
  OU
⚠ Requer aprovação manual (acima de R$ 500)
```

### 7. Freelancer Confirma o Adiantamento

Ao confirmar:
1. Sistema chama `processAdvanceRequest`
2. Cria antecipação no Asaas: `POST /v3/anticipations`
3. Salva em `advanceRequests`
4. Aguarda webhook do Asaas confirmar

## 🧪 Testando em Sandbox do Asaas

Para testar sem pagamentos reais, use o ambiente **sandbox do Asaas**:

### 1. Criar Pagamento de Teste

```bash
POST https://api-sandbox.asaas.com/v3/payments
Headers:
  access_token: $asaas-api-key
Body:
{
  "customer": "cus_xxx",
  "billingType": "CREDIT_CARD",
  "value": 1000.00,
  "dueDate": "2025-12-01"
}
```

**Resposta:**
```json
{
  "id": "pay_1234567890",
  "status": "PENDING",
  ...
}
```

### 2. Confirmar Pagamento (Simular Aprovação)

```bash
POST https://api-sandbox.asaas.com/v3/payments/pay_1234567890/receiveInCash
```

Isso simula que o pagamento foi confirmado.

### 3. Simular Antecipação

```bash
POST https://api-sandbox.asaas.com/v3/anticipations/simulate
Body:
{
  "payment": "pay_1234567890"
}
```

**Resposta:**
```json
{
  "value": 1000.00,
  "netValue": 979.00,
  "fee": 21.00,
  "anticipationDays": 35,
  "isDocumentationRequired": false
}
```

### 4. Solicitar Antecipação

```bash
POST https://api-sandbox.asaas.com/v3/anticipations
Body:
{
  "payment": "pay_1234567890"
}
```

**Resposta:**
```json
{
  "id": "ant_1234567890",
  "status": "PENDING",
  "value": 1000.00,
  "netValue": 979.00,
  "fee": 21.00,
  "requestDate": "2025-11-06",
  "anticipationDate": "2025-11-06"
}
```

## 📊 Logs para Acompanhar

### Frontend (Console do Navegador)

```bash
[Simulação Asaas] {
  value: 1000,
  netValue: 979,
  fee: 21,
  feePercentage: "2.10",
  isDocumentationRequired: false
}
```

### Backend (Firebase Functions Logs)

```bash
[Simulate Advance] Iniciando simulação para projectId: xxx
[Simulate Advance] Payment encontrado: pay_1234567890
[Simulate Advance] Simulação Asaas: value=1000, netValue=979, fee=21
[Simulate Advance] Retornando simulação com sucesso
```

## ⚠️ Erros Comuns

### "Pagamento não encontrado"
- Verifique se o projeto tem um pagamento em `projectPayments`
- Verifique se o pagamento tem `asaasPaymentId`

### "Adiantamento disponível apenas para valores bloqueados"
- O pagamento não é cartão de crédito, OU
- O `availableAt` já passou (não está mais bloqueado)

### "Erro ao simular antecipação"
- O `asaasPaymentId` não existe no Asaas
- O pagamento não está confirmado
- O pagamento já foi antecipado

### "Simulação não aparece"
- Verifique se a função está deployada:
  ```bash
  firebase deploy --only functions:simulateAdvanceRequest
  ```
- Verifique os logs da função

## 🎯 Checklist de Validação

- [ ] Pagamento feito com **cartão de crédito**
- [ ] Pagamento tem **asaasPaymentId** válido
- [ ] Pagamento tem **availableAt** no futuro
- [ ] Status do pagamento é **confirmed**
- [ ] Cliente **liberou** o valor para o freelancer
- [ ] Valor aparece em "Pendente (Cartão 35 dias)"
- [ ] Botão "⚡ Adiantar Agora" está visível
- [ ] Dialog abre ao clicar no botão
- [ ] **Card verde de simulação aparece**
- [ ] Taxa exata do Asaas é exibida
- [ ] Valor líquido está correto

## 💡 Dica: Como Testar Rápido

### Script de Teste Rápido

```javascript
// No console do Firebase (ou em um script)
const projectId = 'seu_projeto_id';
const freelancerId = 'seu_freelancer_id';

// 1. Criar pagamento fake
await db.collection('projectPayments').add({
  projectId,
  freelancerId,
  paymentMethod: 'CREDIT_CARD',
  asaasPaymentId: 'pay_test123', // Colocar um ID real do sandbox
  status: 'confirmed',
  availableAt: firebase.firestore.Timestamp.fromDate(
    new Date(Date.now() + 35 * 24 * 60 * 60 * 1000) // +35 dias
  ),
  amount: 1000.00,
  createdAt: firebase.firestore.FieldValue.serverTimestamp()
});

// 2. Liberar para o freelancer
await db.collection('fundReleases').add({
  projectId,
  freelancerId,
  amount: 1000.00,
  status: 'released',
  createdAt: firebase.firestore.FieldValue.serverTimestamp()
});

// Agora vá em /freelancer/minhas-financas e teste!
```

---

**Data**: 2025-11-06  
**Versão**: 1.0  
**Status**: ✅ Implementado e funcional

