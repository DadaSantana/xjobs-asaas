# Documentação - Sistema de Pagamento com Split

## Visão Geral

Este sistema implementa um gateway de pagamento com split automático usando a API do Pagar.me. O sistema permite criar links de pagamento onde o valor é automaticamente dividido entre a plataforma (taxa de 10%) e o freelancer (90% do valor proposto).

## Endpoints Principais

### 1. Gerar Link de Pagamento Externo

**Endpoint:** `POST /generateExternalPaymentLink`

**URL:** `https://us-central1-xjobs-a43d2.cloudfunctions.net/generateExternalPaymentLink`

**Autenticação:** Bearer Token (Firebase Auth)

#### Objeto de Requisição

```json
{
  "projectId": "string",
  "projectTitle": "string", 
  "amount": "number",
  "clientId": "string",
  "clientName": "string",
  "clientEmail": "string"
}
```

#### Campos Obrigatórios

- `projectId`: ID único do projeto
- `projectTitle`: Título do projeto
- `amount`: Valor total a ser pago (incluindo taxa de 10%)
- `clientId`: ID do cliente (Firebase UID)
- `clientName`: Nome do cliente
- `clientEmail`: Email do cliente

#### Resposta de Sucesso

```json
{
  "success": true,
  "paymentLinkId": "plink_xxxxxxxxxxxxx",
  "paymentUrl": "https://checkout.pagar.me/xxxxxxxxxxxxx",
  "message": "Link de pagamento gerado com sucesso"
}
```

#### Resposta de Erro

```json
{
  "error": "string",
  "details": "string"
}
```

### 2. Webhook de Pagamento

**Endpoint:** `POST /pagarmeWebhook`

**URL:** `https://us-central1-xjobs-a43d2.cloudfunctions.net/pagarmeWebhook`

**Autenticação:** Não requerida (webhook do Pagar.me)

## Estrutura do Split

### Configuração do Split

O sistema utiliza um split automático com as seguintes configurações:

```json
{
  "split": [
    {
      "recipient_id": "re_cmb9mudkk5wxd0l9t53q9nm8w",
      "amount": "number",
      "type": "flat",
      "options": {
        "charge_processing_fee": false,
        "liable": false
      }
    }
  ]
}
```

### Cálculo de Valores

1. **Valor Total**: Valor enviado pelo frontend (inclui taxa de 10%)
2. **Valor Proposto**: Valor da proposta do freelancer (90% do total)
3. **Taxa da Plataforma**: 10% do valor total
4. **Valor do Freelancer**: 90% do valor total

### Exemplo de Cálculo

```javascript
// Se o valor total for R$ 1.100,00
const totalCents = 110000; // R$ 1.100,00 em centavos
const proposedCents = 100000; // R$ 1.000,00 em centavos (90%)
const feeCents = 10000; // R$ 100,00 em centavos (10%)
```

## Configuração do Payment Link

### Estrutura do Payment Link

```json
{
  "is_building": false,
  "payment_settings": {
    "credit_card_settings": {
      "installments_setup": {
        "interest_type": "simple",
        "interest_rate": 0,
        "max_installments": 12,
        "amount": "totalCents"
      },
      "operation_type": "auth_and_capture",
      "delay_to_capture": 60
    },
    "pix_settings": {
      "expires_in": 3600
    },
    "accepted_payment_methods": [
      "pix",
      "credit_card"
    ]
  },
  "cart_settings": {
    "items": [
      {
        "name": "Garantia - {projectTitle}",
        "amount": "totalCents",
        "default_quantity": 1
      }
    ]
  },
  "metadata": {
    "projectId": "string",
    "projectTitle": "string",
    "clientId": "string",
    "clientName": "string",
    "clientEmail": "string",
    "selectedFreelancerId": "string",
    "freelancerRecipientId": "string",
    "proposedCents": "number",
    "feeCents": "number",
    "totalCents": "number",
    "source": "xjobs:paymentlink"
  },
  "type": "order"
}
```

## Processamento de Webhooks

### Eventos Suportados

- `payment.paid`: Pagamento aprovado
- `payment.failed`: Pagamento falhou
- `payment.not_authorized`: Pagamento não autorizado
- `payment.refused`: Pagamento recusado
- `payment.canceled`: Pagamento cancelado
- `payment.refunded`: Pagamento estornado
- `payment.chargeback`: Chargeback

### Estrutura do Webhook

```json
{
  "type": "payment.paid",
  "data": {
    "id": "pay_xxxxxxxxxxxxx",
    "amount": "number",
    "payment_method": "pix|credit_card|debit_card|boleto",
    "payment_link": {
      "id": "plink_xxxxxxxxxxxxx"
    },
    "status": "paid"
  }
}
```

## Fluxo de Pagamento

### 1. Criação do Link

1. Cliente solicita pagamento
2. Sistema calcula valores (total, proposta, taxa)
3. Cria payment link no Pagar.me
4. Salva dados no Firestore
5. Retorna URL do pagamento

### 2. Processamento do Pagamento

1. Cliente realiza pagamento
2. Pagar.me envia webhook
3. Sistema processa webhook
4. Cria registro de pagamento
5. Atualiza status do projeto

### 3. Gestão de Fundos

1. Valor fica retido (escrow)
2. Cliente aprova liberação
3. Sistema transfere para freelancer
4. Taxa fica com a plataforma

## Estruturas de Dados

### Payment Link (Firestore)

```json
{
  "paymentLinkId": "string",
  "projectId": "string",
  "projectTitle": "string",
  "amount": "number",
  "clientId": "string",
  "clientName": "string",
  "clientEmail": "string",
  "selectedFreelancerId": "string",
  "freelancerRecipientId": "string",
  "proposedCents": "number",
  "feeCents": "number",
  "totalCents": "number",
  "paymentUrl": "string",
  "status": "pending|paid|failed",
  "paymentMethods": ["pix", "credit_card"],
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Project Payment (Firestore)

```json
{
  "paymentLinkId": "string",
  "projectId": "string",
  "projectTitle": "string",
  "amount": "number",
  "clientId": "string",
  "clientName": "string",
  "clientEmail": "string",
  "freelancerId": "string",
  "freelancerName": "string",
  "paymentStatus": "paid",
  "escrowStatus": "held|released",
  "paymentMethod": "string",
  "gatewayId": "string",
  "totalPaid": "number",
  "totalHeld": "number",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## Configurações Importantes

### Recipient ID da Plataforma

- **ID**: `re_cmb9mudkk5wxd0l9t53q9nm8w`
- **Tipo**: Recipient da plataforma XJobs
- **Configuração**: Recebe 100% do valor inicialmente

### Configurações de Pagamento

- **PIX**: Expira em 1 hora (3600 segundos)
- **Cartão de Crédito**: Até 12 parcelas sem juros
- **Operação**: Autorização e captura
- **Delay de Captura**: 60 segundos

### Metadados

Todos os payment links incluem metadados para rastreamento:
- IDs do projeto, cliente e freelancer
- Valores calculados (total, proposta, taxa)
- Fonte: `xjobs:paymentlink`

## Tratamento de Erros

### Códigos de Erro Comuns

- `400`: Dados inválidos ou campos obrigatórios ausentes
- `401`: Token de autenticação inválido ou ausente
- `405`: Método HTTP não permitido
- `500`: Erro interno do servidor

### Logs e Monitoramento

- Todos os webhooks são salvos no Firestore
- Logs detalhados de todas as operações
- Rastreamento de pagamentos por metadados

## Segurança

### Autenticação

- Firebase Auth para endpoints de criação
- Webhooks do Pagar.me (sem autenticação)
- Validação de tokens em todas as operações

### Validações

- Verificação de propriedade do projeto
- Validação de dados do cliente
- Verificação de recipient do freelancer
- Validação de valores e cálculos

## Exemplo de Uso

### Frontend (React)

```javascript
const generatePaymentLink = async () => {
  const token = await auth.currentUser.getIdToken();
  
  const requestData = {
    projectId: "proj_123",
    projectTitle: "Desenvolvimento de App",
    amount: 1100, // R$ 1.100,00 (inclui taxa)
    clientId: user.uid,
    clientName: "João Silva",
    clientEmail: "joao@email.com"
  };

  const response = await fetch(
    'https://us-central1-xjobs-a43d2.cloudfunctions.net/generateExternalPaymentLink',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestData)
    }
  );

  const result = await response.json();
  
  if (result.success) {
    window.open(result.paymentUrl, '_blank');
  }
};
```

### Backend (Node.js)

```javascript
// Exemplo de webhook handler
app.post('/webhook', async (req, res) => {
  const { type, data } = req.body;
  
  if (type === 'payment.paid') {
    // Processar pagamento aprovado
    await processPayment(data);
  }
  
  res.status(200).json({ success: true });
});
```

## Considerações Técnicas

### Performance

- Uso de Firestore para persistência
- Processamento assíncrono de webhooks
- Cache de dados de recipients

### Escalabilidade

- Funções serverless (Firebase Functions)
- Processamento em lote de webhooks
- Estrutura de dados otimizada

### Manutenibilidade

- Código modular e bem documentado
- Logs detalhados para debugging
- Estrutura de dados consistente

---

**Versão:** 1.0  
**Última Atualização:** Dezembro 2024  
**Autor:** Sistema XJobs

