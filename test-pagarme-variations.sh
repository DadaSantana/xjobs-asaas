#!/bin/bash

echo "🔍 Testando Variações do Payload Pagar.me"
echo "=========================================="

# Credenciais
PAGARME_SECRET="sk_d6c3531584364d8598899c2f470ae421"
PAGARME_AUTH=$(echo -n "${PAGARME_SECRET}:" | base64)

test_payload() {
    local name="$1"
    local payload="$2"
    
    echo -e "\n🧪 Testando: $name"
    echo "📤 Payload:"
    echo "$payload" | jq .
    
    RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
      -X POST \
      -H "accept: application/json" \
      -H "content-type: application/json" \
      -H "authorization: Basic ${PAGARME_AUTH}" \
      -d "$payload" \
      https://api.pagar.me/core/v5/paymentlinks)
    
    HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
    RESPONSE_BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')
    
    echo "📥 Status: $HTTP_STATUS"
    echo "📥 Resposta:"
    echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"
    
    if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ]; then
        echo "✅ SUCESSO! Este payload funciona!"
        return 0
    else
        echo "❌ Falhou"
        return 1
    fi
}

# Teste 1: Estrutura mais simples
PAYLOAD1='{
  "amount": 100,
  "currency": "BRL",
  "payment_link_type": "subscription",
  "cart_settings": {
    "enabled": true
  },
  "payment_settings": {
    "accepted_payment_methods": ["credit_card", "boleto"],
    "credit_card_settings": {
      "capture": true,
      "statement_descriptor": "XJOBS PLANO"
    },
    "boleto_settings": {
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
  ]
}'

test_payload "Estrutura com settings corretos" "$PAYLOAD1"

# Teste 2: Sem cart_settings
PAYLOAD2='{
  "amount": 100,
  "currency": "BRL",
  "payment_link_type": "order",
  "payment_settings": {
    "accepted_payment_methods": ["credit_card"],
    "credit_card_settings": {
      "capture": true,
      "statement_descriptor": "XJOBS PLANO"
    }
  },
  "customer": {
    "name": "DEVANA TECNOLOGIA LTDA",
    "email": "contato@devana.com.br",
    "type": "individual"
  },
  "items": [
    {
      "amount": 100,
      "description": "Assinatura Plano Teste",
      "quantity": 1
    }
  ]
}'

test_payload "Estrutura simplificada" "$PAYLOAD2"

# Teste 3: Estrutura mínima
PAYLOAD3='{
  "amount": 100,
  "payment_link_type": "order",
  "payment_settings": {
    "accepted_payment_methods": ["credit_card"],
    "credit_card_settings": {}
  },
  "customer": {
    "name": "DEVANA TECNOLOGIA LTDA",
    "email": "contato@devana.com.br"
  },
  "items": [
    {
      "amount": 100,
      "description": "Assinatura Plano Teste",
      "quantity": 1
    }
  ]
}'

test_payload "Estrutura mínima" "$PAYLOAD3"

echo -e "\n🏁 Testes concluídos!"
