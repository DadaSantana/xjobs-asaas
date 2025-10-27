#!/bin/bash

echo "=============================================="
echo "🔍 Monitorando logs de createPlanPaymentLink"
echo "=============================================="
echo ""
echo "Pressione Ctrl+C para parar"
echo ""

# Monitorar logs da função createPlanPaymentLink
firebase functions:log --only createPlanPaymentLink --lines 100

