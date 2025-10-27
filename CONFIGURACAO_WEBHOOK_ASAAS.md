# 🔗 Configuração do Webhook Asaas

## ✅ URL do Webhook (COPIE ESTA URL)

```
https://us-central1-xjobs-a43d2.cloudfunctions.net/asaasWebhook
```

---

## 📋 Passo a Passo - Configurar no Asaas Sandbox

### 1. Acesse o Painel Asaas Sandbox
```
https://sandbox.asaas.com/
```

### 2. Navegue até Webhooks
1. Faça login na sua conta Asaas Sandbox
2. Clique em **"Configurações"** no menu lateral
3. Clique em **"Webhooks"** ou **"Integrações"**

### 3. Adicionar Novo Webhook

Clique em **"Adicionar Webhook"** ou **"Novo Webhook"**

### 4. Configure o Webhook

Preencha os campos:

#### **URL do Webhook:**
```
https://us-central1-xjobs-a43d2.cloudfunctions.net/asaasWebhook
```

#### **Eventos a Selecionar (IMPORTANTE):**

**🔴 OBRIGATÓRIOS - Pagamentos de Projetos:**
- ✅ `PAYMENT_CONFIRMED` - Quando um pagamento é confirmado
- ✅ `PAYMENT_RECEIVED` - Quando um pagamento é recebido

**🔴 OBRIGATÓRIOS - Assinaturas de Planos:**
- ✅ `SUBSCRIPTION_CREATED` - Assinatura criada
- ✅ `SUBSCRIPTION_UPDATED` - Assinatura atualizada
- ✅ `SUBSCRIPTION_INACTIVATED` - Assinatura inativada
- ✅ `SUBSCRIPTION_DELETED` - Assinatura removida

**⚪ Opcionais (para monitoramento e casos especiais):**
- `PAYMENT_OVERDUE` - Pagamento vencido
- `PAYMENT_DELETED` - Pagamento deletado
- `PAYMENT_REFUNDED` - Pagamento estornado
- `SUBSCRIPTION_SPLIT_DISABLED` - Split da assinatura desativado
- `SUBSCRIPTION_SPLIT_DIVERGENCE_BLOCK` - Assinatura bloqueada por divergência

#### **Formato:**
- Selecione: **JSON**

#### **Autenticação:**
- Deixe em branco (não é necessário para este webhook)

### 5. Salvar

Clique em **"Salvar"** ou **"Criar Webhook"**

---

## 🧪 Como Testar o Webhook

### Opção 1: Pelo Painel Asaas

1. No painel de Webhooks
2. Encontre o webhook que você criou
3. Clique em **"Testar"** ou **"Enviar Teste"**
4. Selecione evento `PAYMENT_CONFIRMED`
5. Clique em enviar

### Opção 2: Fazer um Pagamento Real (Sandbox)

1. Acesse a página de teste: `/test-asaas`
2. Crie um checkout de teste
3. Pague com PIX ou cartão de teste
4. O webhook será chamado automaticamente

### Opção 3: Via cURL (Manual)

```bash
curl -X POST https://us-central1-xjobs-a43d2.cloudfunctions.net/asaasWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "PAYMENT_CONFIRMED",
    "payment": {
      "id": "pay_test_123",
      "value": 100.00,
      "status": "RECEIVED"
    }
  }'
```

---

## 📊 O Que o Webhook Faz Automaticamente

### Para Pagamentos de Projetos (PAYMENT_CONFIRMED)

1. ✅ Busca o pagamento no Firestore pelo ID
2. ✅ Atualiza `projectPayments`:
   - `paymentStatus: 'paid'`
   - `escrowStatus: 'held'`
   - `totalPaid: totalAmount`
   - `totalHeld: freelancerAmount` (90%)
3. ✅ Cria `fundHold` com valor do freelancer
4. ✅ Atualiza projeto para status **'executando'**
5. ✅ Salva log do webhook em `asaasWebhooks` (auditoria)

### Para Assinaturas de Planos (SUBSCRIPTION_PAYMENT_CONFIRMED)

1. ✅ Busca assinatura no Firestore
2. ✅ Atualiza status para 'active'
3. ✅ Registra pagamento em `planPayments`
4. ✅ Atualiza limites de curtidas e mensagens do usuário
5. ✅ Salva log do webhook

---

## 🔍 Verificar se Está Funcionando

### Ver Logs do Webhook

```bash
firebase functions:log --only asaasWebhook --lines 50
```

### Verificar Webhooks Recebidos (Firestore)

1. Acesse o Firebase Console
2. Vá em Firestore Database
3. Procure a coleção `asaasWebhooks`
4. Cada webhook recebido será salvo lá para auditoria

### Estrutura do Log (asaasWebhooks)

```javascript
{
  event: "PAYMENT_CONFIRMED",
  data: { /* dados completos do webhook */ },
  receivedAt: Timestamp
}
```

---

## 🎯 Eventos e Suas Ações

### Pagamentos de Projetos

| Evento | Quando Acontece | Ação do Sistema |
|--------|-----------------|-----------------|
| `PAYMENT_CONFIRMED` | Pagamento confirmado | ✅ Atualiza status para 'paid'<br>✅ Cria fundHold<br>✅ Muda projeto para 'executando' |
| `PAYMENT_RECEIVED` | Pagamento recebido | ✅ Atualiza status do pagamento |

### Assinaturas de Planos

| Evento | Quando Acontece | Ação do Sistema |
|--------|-----------------|-----------------|
| `SUBSCRIPTION_CREATED` | Assinatura criada | ✅ Marca status como 'pending' |
| `PAYMENT_CONFIRMED` (da assinatura) | Mensalidade paga | ✅ Registra em planPayments<br>✅ Atualiza limites<br>✅ Ativa plano |
| `SUBSCRIPTION_UPDATED` | Assinatura alterada | ✅ Sincroniza dados no Firestore |
| `SUBSCRIPTION_INACTIVATED` | Assinatura cancelada | ✅ Remove plano do usuário<br>✅ Desativa limites |
| `SUBSCRIPTION_DELETED` | Assinatura deletada | ✅ Remove plano do usuário |

---

## 🔒 Segurança

O webhook:
- ✅ Aceita apenas POST
- ✅ Salva todos os eventos para auditoria
- ✅ Valida dados antes de processar
- ✅ Trata erros graciosamente
- ✅ Retorna status 200 para o Asaas

---

## 📞 Suporte

Se o webhook não estiver funcionando:

1. Verifique os logs: `firebase functions:log --only asaasWebhook`
2. Verifique se a URL está correta no Asaas
3. Teste manualmente com cURL
4. Verifique a coleção `asaasWebhooks` no Firestore

---

## 🎉 URL Para Cadastrar no Asaas

# **COPIE E CADASTRE ESTA URL:**

```
https://us-central1-xjobs-a43d2.cloudfunctions.net/asaasWebhook
```

**Ambiente:** Sandbox (Homologação)  
**Formato:** JSON  
**Método:** POST

---

**Pronto! Após configurar, faça um teste de pagamento para validar!** ✨

