#!/bin/bash

echo "🔍 Testando Payment Link Types"
echo "=============================="

# Credenciais
PAGARME_SECRET="sk_d6c3531584364d8598899c2f470ae421"
PAGARME_AUTH=$(echo -n "${PAGARME_SECRET}:" | base64)

test_payload() {
    local name="$1"
    local payload="$2"
    
    echo -e "\n🧪 Testando: $name"
    
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
    
    if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ]; then
        echo "✅ SUCESSO! Este payload funciona!"
        echo "$payload" > /tmp/working_payload.json
        echo "$RESPONSE_BODY" | jq .
        return 0
    else
        echo "❌ Falhou - Erro:"
        echo "$RESPONSE_BODY" | jq '.errors' 2>/dev/null || echo "$RESPONSE_BODY"
        return 1
    fi
}

# Teste com diferentes tipos
for type in "order" "subscription" "payment" "checkout" "simple" "default"; do
    PAYLOAD="{
      \"amount\": 100,
      \"payment_link_type\": \"$type\",
      \"cart_settings\": {
        \"enabled\": true
      },
      \"payment_settings\": {
        \"accepted_payment_methods\": [\"credit_card\"],
        \"credit_card_settings\": {
          \"operation_type\": \"auth_and_capture\",
          \"statement_descriptor\": \"XJOBS PLANO\"
        }
      },
      \"customer\": {
        \"name\": \"DEVANA TECNOLOGIA LTDA\",
        \"email\": \"contato@devana.com.br\",
        \"type\": \"individual\"
      },
      \"items\": [
        {
          \"amount\": 100,
          \"description\": \"Assinatura Plano Teste\",
          \"quantity\": 1
        }
      ]
    }"
    
    test_payload "Type: $type" "$PAYLOAD" && exit 0
done

# Teste sem payment_link_type mas com type no nível raiz
PAYLOAD_NO_TYPE='{
  "amount": 100,
  "type": "order",
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

test_payload "Com type no nível raiz" "$PAYLOAD_NO_TYPE"

echo -e "\n❌ Nenhum tipo funcionou!"
