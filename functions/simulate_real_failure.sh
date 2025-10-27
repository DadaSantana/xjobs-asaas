#!/bin/bash

# Simular webhook de falha de pagamento com dados reais
curl -X POST https://pagarmewebhook-bo5fg4zxxq-uc.a.run.app \
  -H "Content-Type: application/json" \
  -H "User-Agent: PagarMe-Hookshot/1.0" \
  -d '{
    "type": "payment.failed",
    "data": {
      "id": "tran_real_failure_test",
      "amount": 275,
      "status": "failed",
      "order": {
        "code": "or_Qv35YLS2OiPDjwVb"
      },
      "gateway_response": {
        "message": "Transação negada pelo banco emissor"
      }
    }
  }'

echo ""
echo "Webhook de falha enviado com orderId: or_Qv35YLS2OiPDjwVb"