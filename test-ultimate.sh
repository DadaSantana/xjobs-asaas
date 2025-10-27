#!/bin/bash

echo "⚡ TESTE ULTIMATE - ÚLTIMA CHANCE!"
echo "=================================="

# Credenciais
PAGARME_SECRET="sk_d6c3531584364d8598899c2f470ae421"
PAGARME_AUTH=$(echo -n "${PAGARME_SECRET}:" | base64)

# Payload com brand e amount corrigido
ULTIMATE_PAYLOAD='{
  "amount": 1000,
  "type": "order",
  "cart_settings": {
    "enabled": true,
    "items": [
      {
        "id": "1",
        "name": "Assinatura Plano Teste",
        "amount": 1000,
        "quantity": 1,
        "default_quantity": 1
      }
    ]
  },
  "payment_settings": {
    "accepted_payment_methods": ["credit_card"],
    "credit_card_settings": {
      "operation_type": "auth_and_capture",
      "statement_descriptor": "XJOBS PLANO",
      "brand_installments": [
        {
          "brand": "visa",
          "installments": [
            {
              "number": 1,
              "interest_rate": 0
            }
          ]
        }
      ]
    }
  },
  "customer": {
    "name": "DEVANA TECNOLOGIA LTDA",
    "email": "contato@devana.com.br",
    "type": "individual"
  },
  "items": [
    {
      "amount": 1000,
      "description": "Assinatura Plano Teste",
      "quantity": 1
    }
  ]
}'

echo "📤 Payload com brand_installments:"
echo "$ULTIMATE_PAYLOAD" | jq .

echo -e "\n🚀 Fazendo requisição..."

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "accept: application/json" \
  -H "content-type: application/json" \
  -H "authorization: Basic ${PAGARME_AUTH}" \
  -d "$ULTIMATE_PAYLOAD" \
  https://api.pagar.me/core/v5/paymentlinks)

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

echo "📥 Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ]; then
    echo "🎉🎉🎉 FINALMENTE FUNCIONOU! 🎉🎉🎉"
    echo "$RESPONSE_BODY" | jq .
    echo "$ULTIMATE_PAYLOAD" > working_payload_final.json
    echo "✅ Payload salvo em working_payload_final.json"
    
    # Extrair URL
    URL=$(echo "$RESPONSE_BODY" | jq -r '.url // .payment_url // .link // .checkout_url // empty')
    if [ ! -z "$URL" ] && [ "$URL" != "null" ]; then
        echo "🔗 URL: $URL"
    fi
else
    echo "❌ Status: $HTTP_STATUS"
    echo "📥 Resposta:"
    echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"
    
    # Última tentativa - estrutura mais simples sem installments
    echo -e "\n🔄 Tentativa sem installments..."
    
    SIMPLE_FINAL='{
      "amount": 1000,
      "type": "order",
      "cart_settings": {
        "enabled": true,
        "items": [
          {
            "id": "1",
            "name": "Assinatura Plano Teste",
            "amount": 1000,
            "quantity": 1,
            "default_quantity": 1
          }
        ]
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
          "amount": 1000,
          "description": "Assinatura Plano Teste",
          "quantity": 1
        }
      ]
    }'
    
    RESPONSE2=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
      -X POST \
      -H "accept: application/json" \
      -H "content-type: application/json" \
      -H "authorization: Basic ${PAGARME_AUTH}" \
      -d "$SIMPLE_FINAL" \
      https://api.pagar.me/core/v5/paymentlinks)
    
    HTTP_STATUS2=$(echo "$RESPONSE2" | grep "HTTP_STATUS:" | cut -d: -f2)
    RESPONSE_BODY2=$(echo "$RESPONSE2" | sed '/HTTP_STATUS:/d')
    
    echo "📥 Status: $HTTP_STATUS2"
    
    if [ "$HTTP_STATUS2" = "200" ] || [ "$HTTP_STATUS2" = "201" ]; then
        echo "🎉 FUNCIONOU SEM INSTALLMENTS!"
        echo "$RESPONSE_BODY2" | jq .
        echo "$SIMPLE_FINAL" > working_payload_final.json
    else
        echo "❌ Também falhou:"
        echo "$RESPONSE_BODY2" | jq . 2>/dev/null || echo "$RESPONSE_BODY2"
    fi
fi
