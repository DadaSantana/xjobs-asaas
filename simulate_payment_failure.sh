#!/bin/bash

# Script para simular webhook de falha de pagamento
# Baseado nos logs reais do Pagar.me

echo "Simulando webhook de falha de pagamento..."

curl -X POST https://pagarmewebhook-bo5fg4zxxq-uc.a.run.app \
  -H "Content-Type: application/json" \
  -H "User-Agent: PagarMe-Hookshot/1.0" \
  -d '{
    "id": "hook_test_failure",
    "type": "payment.failed",
    "data": {
      "id": "tran_test_failure",
      "amount": 275,
      "status": "failed",
      "order": {
        "code": "N6YPU0RC2R",
        "status": "failed"
      },
      "gateway_response": {
        "message": "Transação negada pelo banco emissor"
      }
    }
  }'

echo ""
echo "Webhook de falha enviado!"
echo "Verifique os logs da função e o status do projeto no Firestore."