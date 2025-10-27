#!/bin/bash

echo "🏆 TESTE DEFINITIVO - VICTORY!"
echo "=============================="

# Credenciais
PAGARME_SECRET="sk_d6c3531584364d8598899c2f470ae421"
PAGARME_AUTH=$(echo -n "${PAGARME_SECRET}:" | base64)

# Payload corrigido final
VICTORY_PAYLOAD='{
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
      "installments_setup": {
        "max_installments": 1,
        "free_installments": 1
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
      "amount": 1000,
      "description": "Assinatura Plano Teste",
      "quantity": 1
    }
  ]
}'

echo "📤 Payload Final (sem interest_rate, amount=1000):"
echo "$VICTORY_PAYLOAD" | jq .

echo -e "\n🚀 Fazendo requisição..."

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "accept: application/json" \
  -H "content-type: application/json" \
  -H "authorization: Basic ${PAGARME_AUTH}" \
  -d "$VICTORY_PAYLOAD" \
  https://api.pagar.me/core/v5/paymentlinks)

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

echo "📥 Status: $HTTP_STATUS"
echo "📥 Resposta:"
echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ]; then
    echo -e "\n🎉🎉🎉 SUCESSO TOTAL! PAYMENT LINK CRIADO! 🎉🎉🎉"
    echo "$VICTORY_PAYLOAD" > working_payload_final.json
    echo "✅ Payload funcional salvo em working_payload_final.json"
    
    # Extrair URL do payment link
    URL=$(echo "$RESPONSE_BODY" | jq -r '.url // .payment_url // .link // .checkout_url // empty')
    if [ ! -z "$URL" ] && [ "$URL" != "null" ]; then
        echo "🔗 URL do Payment Link: $URL"
    fi
    
    echo -e "\n📋 RESUMO DO PAYLOAD FUNCIONAL:"
    echo "- amount: valor em centavos (1000 = R$ 10,00)"
    echo "- type: 'order'"
    echo "- cart_settings.enabled: true"
    echo "- cart_settings.items: array com itens"
    echo "- payment_settings.accepted_payment_methods: ['credit_card']"
    echo "- credit_card_settings.operation_type: 'auth_and_capture'"
    echo "- installments_setup.max_installments: 1"
    echo "- installments_setup.free_installments: 1"
    echo "- SEM interest_rate"
    
else
    echo -e "\n💀 FALHOU NOVAMENTE!"
    echo "Erro detalhado:"
    echo "$RESPONSE_BODY" | jq '.errors' 2>/dev/null || echo "$RESPONSE_BODY"
fi
