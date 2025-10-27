#!/bin/bash

echo "🔍 Testando API Pagar.me Payment Links"
echo "======================================"

# Credenciais
PAGARME_SECRET="sk_d6c3531584364d8598899c2f470ae421"
PAGARME_AUTH=$(echo -n "${PAGARME_SECRET}:" | base64)

echo "🔑 Testando autenticação..."
curl -s -w "\nStatus: %{http_code}\n" \
  -H "accept: application/json" \
  -H "authorization: Basic ${PAGARME_AUTH}" \
  https://api.pagar.me/core/v5/recipients | head -20

echo -e "\n\n🧪 Testando payload atual..."

# Payload atual da função
PAYLOAD='{
  "amount": 100,
  "currency": "BRL",
  "payment_settings": {
    "accepted_payment_methods": [
      "credit_card",
      "boleto"
    ],
    "credit_card": {
      "capture": true,
      "statement_descriptor": "XJOBS PLANO"
    },
    "boleto": {
      "bank": "033",
      "instructions": "Pagamento do plano Teste",
      "due_at": "2025-10-13T20:00:00.000Z"
    }
  },
  "customer": {
    "name": "DEVANA TECNOLOGIA LTDA",
    "email": "contato@devana.com.br",
    "document": "",
    "type": "individual"
  },
  "items": [
    {
      "amount": 100,
      "description": "Assinatura Plano Teste",
      "quantity": 1
    }
  ],
  "metadata": {
    "planId": "test_plan",
    "planName": "Plano Teste",
    "userId": "test_user",
    "type": "plan_subscription"
  }
}'

echo "📤 Enviando payload:"
echo "$PAYLOAD" | jq .

echo -e "\n🚀 Fazendo requisição..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "accept: application/json" \
  -H "content-type: application/json" \
  -H "authorization: Basic ${PAGARME_AUTH}" \
  -d "$PAYLOAD" \
  https://api.pagar.me/core/v5/paymentlinks)

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

echo "📥 Status: $HTTP_STATUS"
echo "📥 Resposta:"
echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ]; then
    echo "✅ SUCESSO! Payment link criado!"
else
    echo "❌ ERRO! Vamos tentar outras variações..."
fi
