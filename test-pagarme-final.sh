#!/bin/bash

echo "🔍 Testando Payload Final Pagar.me"
echo "=================================="

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
        echo "$payload" > /tmp/working_payload.json
        return 0
    else
        echo "❌ Falhou"
        return 1
    fi
}

# Teste 1: Com operation_type e cart_settings
PAYLOAD1='{
  "amount": 100,
  "currency": "BRL",
  "cart_settings": {
    "enabled": true
  },
  "payment_settings": {
    "accepted_payment_methods": ["credit_card"],
    "credit_card_settings": {
      "operation_type": "auth_and_capture",
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

test_payload "Com operation_type e cart_settings" "$PAYLOAD1" && exit 0

# Teste 2: Sem currency
PAYLOAD2='{
  "amount": 100,
  "cart_settings": {
    "enabled": true
  },
  "payment_settings": {
    "accepted_payment_methods": ["credit_card"],
    "credit_card_settings": {
      "operation_type": "auth_and_capture",
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

test_payload "Sem currency" "$PAYLOAD2" && exit 0

# Teste 3: Com boleto também
PAYLOAD3='{
  "amount": 100,
  "cart_settings": {
    "enabled": true
  },
  "payment_settings": {
    "accepted_payment_methods": ["credit_card", "boleto"],
    "credit_card_settings": {
      "operation_type": "auth_and_capture",
      "statement_descriptor": "XJOBS PLANO"
    },
    "boleto_settings": {
      "bank": "033",
      "instructions": "Pagamento do plano Teste"
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

test_payload "Com boleto sem due_at" "$PAYLOAD3" && exit 0

# Teste 4: Estrutura mais básica
PAYLOAD4='{
  "amount": 100,
  "cart_settings": {},
  "payment_settings": {
    "accepted_payment_methods": ["credit_card"],
    "credit_card_settings": {
      "operation_type": "auth_and_capture"
    }
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

test_payload "Estrutura básica" "$PAYLOAD4" && exit 0

echo -e "\n❌ Nenhum payload funcionou. Vou tentar uma abordagem diferente..."
