# Webhook Pagar.me - Documentação

## 📡 **Função Webhook Criada**

A função `pagarmeWebhook` foi criada para receber todas as notificações do Pagar.me de forma robusta e organizada.

### 🔗 **URL da Função**
```
https://us-central1-xjobs-a43d2.cloudfunctions.net/pagarmeWebhook
```

## 🎯 **Funcionalidades**

### ✅ **O que a função faz atualmente:**
1. **Recebe webhooks**: Aceita apenas requisições POST do Pagar.me
2. **Log detalhado**: Registra todos os dados recebidos no console
3. **Salva no Firestore**: Armazena cada webhook na coleção `pagarmeWebhooks`
4. **Tratamento de erros**: Salva erros na coleção `pagarmeWebhookErrors`
5. **Resposta adequada**: Retorna status 200 para confirmar recebimento

### 📊 **Dados capturados:**
- **Headers importantes**: `x-hub-signature`, `user-agent`, `content-type`
- **Corpo completo**: Todos os dados enviados pelo Pagar.me
- **Timestamp**: Data/hora do recebimento
- **Tipo de evento**: Extraído do campo `type` do webhook
- **ID do evento**: Extraído do campo `id` do webhook

## 🗄️ **Estrutura no Firestore**

### Coleção: `pagarmeWebhooks`
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "headers": {
    "x-hub-signature": "sha256=...",
    "user-agent": "PagarMe-Webhook/1.0",
    "content-type": "application/json"
  },
  "body": {
    "type": "order.paid",
    "id": "hook_123456",
    "data": { ... }
  },
  "type": "order.paid",
  "eventId": "hook_123456",
  "processed": false,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

### Coleção: `pagarmeWebhookErrors`
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "error": "Mensagem do erro",
  "body": { ... },
  "headers": { ... },
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

## 🔧 **Configuração no Pagar.me**

Para configurar o webhook no painel do Pagar.me:

1. Acesse o painel do Pagar.me
2. Vá em **Configurações** > **Webhooks**
3. Adicione a URL: `https://us-central1-xjobs-a43d2.cloudfunctions.net/pagarmeWebhook`
4. Selecione os eventos que deseja receber

## 📋 **Próximos Passos**

Com a função básica funcionando, você pode:

1. **Analisar os webhooks recebidos** no Firestore
2. **Identificar os tipos de eventos** mais importantes
3. **Implementar lógica específica** para cada tipo de evento
4. **Adicionar validação de assinatura** para segurança
5. **Processar automaticamente** os eventos relevantes

## 🔍 **Monitoramento**

Para monitorar os webhooks:
- Verifique os logs no Firebase Console
- Consulte a coleção `pagarmeWebhooks` no Firestore
- Monitore erros na coleção `pagarmeWebhookErrors`

## 🚀 **Status**
✅ **Função criada e deployada com sucesso**  
✅ **Pronta para receber webhooks do Pagar.me**  
✅ **Logs e armazenamento funcionando**  
🔄 **Aguardando implementação de lógica específica**