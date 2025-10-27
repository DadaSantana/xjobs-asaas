#!/bin/bash

echo "🔍 Testando Payload Final Correto"
echo "================================="

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
        echo "$payload" > working_payload.json
        echo "Payload salvo em working_payload.json"
        return 0
    else
        echo "❌ Falhou"
        return 1
    fi
}

# Payload final com todas as correções
FINAL_PAYLOAD='{
  "amount": 100,
  "type": "order",
  "cart_settings": {
    "enabled": true,
    "items": [
      {
        "id": "1",
        "name": "Assinatura Plano Teste",
        "amount": 100,
        "quantity": 1
      }
    ]
  },
  "payment_settings": {
    "accepted_payment_methods": ["credit_card"],
    "credit_card_settings": {
      "operation_type": "auth_and_capture",
      "statement_descriptor": "XJOBS PLANO",
      "installments": {
        "enabled": true,
        "number": 1
      }
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

test_payload "Payload Final Completo" "$FINAL_PAYLOAD" && exit 0

# Versão alternativa com installments_setup
ALTERNATIVE_PAYLOAD='{
  "amount": 100,
  "type": "order",
  "cart_settings": {
    "enabled": true,
    "items": [
      {
        "id": "1",
        "name": "Assinatura Plano Teste",
        "amount": 100,
        "quantity": 1
      }
    ]
  },
  "payment_settings": {
    "accepted_payment_methods": ["credit_card"],
    "credit_card_settings": {
      "operation_type": "auth_and_capture",
      "statement_descriptor": "XJOBS PLANO",
      "installments_setup": {
        "max_installments": 1,
        "free_installments": 1,
        "interest_rate": 0
      }
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

test_payload "Payload com installments_setup" "$ALTERNATIVE_PAYLOAD"

echo -e "\n❌ Ainda não funcionou!"
