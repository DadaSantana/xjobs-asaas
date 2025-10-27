# ✅ Configuração do Webhook para Planos

## 🔗 Webhook Configurado
```
https://us-central1-xjobs-a43d2.cloudfunctions.net/pagarmeWebhook
```

## 📋 Eventos Necessários no Pagar.me

Para que os pagamentos de planos sejam processados automaticamente, certifique-se de que estes eventos estão marcados no painel do Pagar.me:

### ✅ Eventos Obrigatórios:
- **`order.paid`** - Quando um pedido é pago (PRINCIPAL para payment links)
- **`charge.paid`** - Quando uma cobrança é paga
- **`payment.paid`** - Quando um pagamento é confirmado

### ⚠️ Eventos Recomendados (para tratamento de erros):
- `order.payment_failed` - Falha no pagamento
- `charge.refunded` - Estorno de cobrança
- `order.canceled` - Pedido cancelado

## 🔄 Fluxo Completo do Pagamento de Plano

```
1. Usuário clica em "Assinar Plano"
   ↓
2. Frontend chama: createPlanPaymentLink
   ↓
3. Payment link é criado com metadata:
   {
     planId: "plan_xxx",
     planName: "Plano 50",
     userId: "xxx",
     type: "plan_subscription"  ← IDENTIFICA QUE É PLANO
   }
   ↓
4. Usuário faz pagamento no Pagar.me
   ↓
5. Pagar.me envia webhook "order.paid"
   ↓
6. pagarmeWebhook recebe e processa
   ↓
7. processPaymentWebhook identifica o tipo
   ↓
8. handleOrderOrChargePaidWebhook busca payment link
   ↓
9. Vê que type === "plan_subscription"
   ↓
10. handlePlanSubscriptionPayment é chamado
   ↓
11. Sistema atualiza:
    ✅ /paymentLinks/{id} → status: "paid"
    ✅ /planPayments/{id} → cria registro
    ✅ /users/{userId}.currentPlan → ativa plano
    ✅ /activeSubscriptions/{userId} → cria assinatura
```

## 🧪 Como Testar

### 1. Fazer um pagamento de teste
- Use a aplicação normalmente
- Escolha um plano e pague
- Use cartão de teste do Pagar.me

### 2. Verificar logs do webhook
```bash
cd /Volumes/SSD\ 1/Galvant/xjobs
firebase functions:log --only pagarmeWebhook --lines 50
```

### 3. Verificar no Firestore
Após o pagamento, verifique:

**Coleção `pagarmeWebhooks`:**
```javascript
{
  type: "order.paid",
  body: {
    data: {
      // dados do pedido
    }
  },
  processed: true
}
```

**Coleção `planPayments`:**
```javascript
{
  paymentLinkId: "pl_xxx",
  userId: "xxx",
  planId: "plan_xxx",
  planName: "Plano 50",
  amount: 9.9,
  paymentStatus: "paid"
}
```

**Documento `users/{userId}`:**
```javascript
{
  currentPlan: {
    planId: "plan_xxx",
    planName: "Plano 50",
    planFeatures: { likeLimit: 50, messageLimit: 50 },
    planLimits: { likeLimit: 50, messageLimit: 50 },
    status: "active",
    activatedAt: Timestamp,
    paymentLinkId: "pl_xxx"
  }
}
```

**Documento `activeSubscriptions/{userId}`:**
```javascript
{
  userId: "xxx",
  planId: "plan_xxx",
  planName: "Plano 50",
  status: "active",
  activatedAt: Timestamp
}
```

## 🎯 Status Atual

✅ **Webhook configurado**: `pagarmeWebhook`
✅ **Função deployada e funcional**
✅ **Lógica de processamento de planos implementada**
✅ **Atualização automática do usuário funcionando**

## 🔍 Monitoramento

Para monitorar se os webhooks estão chegando:

```bash
# Ver últimos webhooks recebidos
firebase functions:log --only pagarmeWebhook --lines 20

# Ver logs em tempo real
firebase functions:log --only pagarmeWebhook
```

## ⚠️ Importante

Se um pagamento não ativar o plano automaticamente, verifique:

1. ✅ Webhook está cadastrado no Pagar.me?
2. ✅ Eventos `order.paid` e `charge.paid` estão marcados?
3. ✅ Logs mostram que o webhook foi recebido?
4. ✅ PaymentLink foi criado com `type: "plan_subscription"`?
5. ✅ Não há erros nos logs do Firebase?

## 📞 Suporte

Se precisar debugar um pagamento específico:
1. Pegue o `paymentLinkId` do frontend
2. Busque na coleção `pagarmeWebhooks` por esse ID
3. Verifique os logs da função no timestamp do webhook
4. Veja se o documento em `users/{userId}` foi atualizado

