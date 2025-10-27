#!/bin/bash

echo "🎯 TESTE FINAL - DEVE FUNCIONAR!"
echo "================================"

# Credenciais
PAGARME_SECRET="sk_d6c3531584364d8598899c2f470ae421"
PAGARME_AUTH=$(echo -n "${PAGARME_SECRET}:" | base64)

# Payload corrigido com default_quantity
WORKING_PAYLOAD='{
  "amount": 100,
  "type": "order",
  "cart_settings": {
    "enabled": true,
    "items": [
      {
        "id": "1",
        "name": "Assinatura Plano Teste",
        "amount": 100,
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

echo "📤 Payload Final:"
echo "$WORKING_PAYLOAD" | jq .

echo -e "\n🚀 Fazendo requisição..."

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "accept: application/json" \
  -H "content-type: application/json" \
  -H "authorization: Basic ${PAGARME_AUTH}" \
  -d "$WORKING_PAYLOAD" \
  https://api.pagar.me/core/v5/paymentlinks)

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

echo "📥 Status: $HTTP_STATUS"
echo "📥 Resposta:"
echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ]; then
    echo -e "\n🎉 SUCESSO! PAYMENT LINK CRIADO!"
    echo "$WORKING_PAYLOAD" > working_payload_final.json
    echo "Payload funcional salvo em working_payload_final.json"
    
    # Extrair URL do payment link
    URL=$(echo "$RESPONSE_BODY" | jq -r '.url // .payment_url // .link // empty')
    if [ ! -z "$URL" ]; then
        echo "🔗 URL do Payment Link: $URL"
    fi
else
    echo -e "\n❌ AINDA FALHOU!"
    echo "Vou tentar uma última variação..."
    
    # Última tentativa - estrutura mais simples
    SIMPLE_PAYLOAD='{
      "amount": 100,
      "type": "order",
      "cart_settings": {
        "enabled": true
      },
      "payment_settings": {
        "accepted_payment_methods": ["credit_card"],
        "credit_card_settings": {
          "operation_type": "auth_and_capture",
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
    
    echo -e "\n🔄 Tentativa final com estrutura simplificada..."
    
    RESPONSE2=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
      -X POST \
      -H "accept: application/json" \
      -H "content-type: application/json" \
      -H "authorization: Basic ${PAGARME_AUTH}" \
      -d "$SIMPLE_PAYLOAD" \
      https://api.pagar.me/core/v5/paymentlinks)
    
    HTTP_STATUS2=$(echo "$RESPONSE2" | grep "HTTP_STATUS:" | cut -d: -f2)
    RESPONSE_BODY2=$(echo "$RESPONSE2" | sed '/HTTP_STATUS:/d')
    
    echo "📥 Status: $HTTP_STATUS2"
    echo "📥 Resposta:"
    echo "$RESPONSE_BODY2" | jq . 2>/dev/null || echo "$RESPONSE_BODY2"
    
    if [ "$HTTP_STATUS2" = "200" ] || [ "$HTTP_STATUS2" = "201" ]; then
        echo -e "\n🎉 SUCESSO COM ESTRUTURA SIMPLES!"
        echo "$SIMPLE_PAYLOAD" > working_payload_final.json
    fi
fi
