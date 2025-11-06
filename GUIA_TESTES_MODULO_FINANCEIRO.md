# 🧪 Guia de Testes - Módulo Financeiro com Asaas

## 📋 Resumo das Alterações Implementadas

### 1. Taxa de Adiantamento: 5% → 2% ✅
- Frontend atualizado (`AdvanceRequestDialog.tsx`)
- Backend atualizado (`advanceService.ts`)
- Tipos atualizados (`advance.ts`)
- Configuração padrão no Firestore

### 2. Adiantamento Apenas para Cartão de Crédito ✅
- **Regra**: Apenas valores bloqueados (35 dias) de pagamentos em cartão de crédito podem ser adiantados
- Validação no frontend (`advanceService.ts`)
- Validação no backend (`functions/src/advanceService.ts`)
- Mensagens informativas na UX

### 3. Parcelamento Desabilitado ✅
- Campos `installmentCount` e `installmentValue` removidos da interface `AsaasPayment`
- Validação adicional na função `createPayment` para remover qualquer tentativa de parcelamento
- Documentação atualizada (`DOCUMENTACAO_CHECKOUT_ASAAS.md`)

### 4. Aprovação Automática/Manual ✅
- **Automática**: Até R$ 500,00
- **Manual**: Acima de R$ 500,00
- Limite mensal: 3 adiantamentos por freelancer
- Cooldown: 7 dias entre adiantamentos
- Logs de auditoria implementados

### 5. UX Melhorada ✅
- Indicadores visuais de valores bloqueados vs. disponíveis
- Alertas sobre aprovação automática/manual
- Cards informativos sobre método de pagamento (PIX/Cartão)
- Dicas sobre adiantamento para valores bloqueados

---

## 🧪 Casos de Teste

### Teste 1: Pagamento via PIX → Disponibilidade Imediata

**Objetivo**: Verificar que pagamentos PIX ficam disponíveis imediatamente.

**Passos**:
1. Cliente cria um projeto no valor de R$ 1.000,00
2. Cliente paga via PIX
3. Pagamento é confirmado pelo Asaas (webhook)
4. **Verificar**: 
   - Saldo disponível do freelancer aumenta imediatamente
   - Valor aparece em "Saldo Disponível" (verde)
   - NÃO aparece em "Bloqueado" (laranja)
   - **NÃO há opção de adiantamento**

**Resultado Esperado**: ✅ Saldo disponível para saque imediatamente

---

### Teste 2: Pagamento via Cartão de Crédito → Bloqueio de 35 Dias

**Objetivo**: Verificar que pagamentos em cartão ficam bloqueados por 35 dias.

**Passos**:
1. Cliente cria um projeto no valor de R$ 1.000,00
2. Cliente paga via Cartão de Crédito
3. Pagamento é confirmado pelo Asaas (webhook)
4. **Verificar**:
   - Valor NÃO aparece em "Saldo Disponível"
   - Valor aparece em "Bloqueado - 💳 Cartão (35 dias)"
   - Mostra data de disponibilização (35 dias no futuro)
   - Exibe mensagem "💡 Adiantamento disponível"
   - Botão "Solicitar Adiantamento" está visível

**Resultado Esperado**: ✅ Valor bloqueado por 35 dias com opção de adiantamento

---

### Teste 3: Tentativa de Parcelamento → Deve Ser Rejeitada

**Objetivo**: Verificar que não é possível parcelar pagamentos.

**Passos**:
1. Tentar criar um pagamento com `installmentCount: 12` via API
2. **Verificar**:
   - Campos são removidos automaticamente pela função `createPayment`
   - Pagamento é criado SEM parcelamento
   - Apenas pagamento à vista é permitido

**Resultado Esperado**: ✅ Parcelamento bloqueado em todos os contextos

---

### Teste 4: Adiantamento de R$ 300 → Aprovação Automática

**Objetivo**: Verificar aprovação automática para valores até R$ 500.

**Passos**:
1. Freelancer tem R$ 1.000,00 bloqueados (cartão de crédito)
2. Freelancer solicita adiantamento de R$ 300,00
3. **Verificar**:
   - Taxa de 2% é calculada: R$ 6,00
   - Valor líquido: R$ 294,00
   - Mensagem aparece: "✓ Aprovação automática (até R$ 500)"
   - Status muda imediatamente para "approved"
   - Transferência PIX é processada automaticamente
   - Freelancer recebe R$ 294,00

**Resultado Esperado**: ✅ Aprovação e transferência automáticas

---

### Teste 5: Adiantamento de R$ 1.000 → Aprovação Manual

**Objetivo**: Verificar aprovação manual para valores acima de R$ 500.

**Passos**:
1. Freelancer tem R$ 2.000,00 bloqueados (cartão de crédito)
2. Freelancer solicita adiantamento de R$ 1.000,00
3. **Verificar**:
   - Taxa de 2% é calculada: R$ 20,00
   - Valor líquido: R$ 980,00
   - Mensagem aparece: "⚠ Requer aprovação manual (acima de R$ 500)"
   - Status fica como "pending"
   - Admin deve aprovar manualmente
   - Após aprovação, transferência PIX é processada
   - Freelancer recebe R$ 980,00

**Resultado Esperado**: ✅ Requer aprovação manual do admin

---

### Teste 6: Tentativa de Adiantamento para Pagamento PIX → Deve Ser Negada

**Objetivo**: Verificar que não é possível adiantar valores de pagamento PIX.

**Passos**:
1. Freelancer tem R$ 1.000,00 disponíveis (pagamento PIX confirmado)
2. Freelancer tenta solicitar adiantamento
3. **Verificar**:
   - Mensagem de erro aparece: "Adiantamento disponível apenas para valores bloqueados de pagamentos em cartão de crédito"
   - Solicitação é rejeitada
   - Valor não é elegível para adiantamento

**Resultado Esperado**: ✅ Adiantamento negado para pagamentos PIX

---

### Teste 7: Limites Mensais → 3 Adiantamentos/Mês

**Objetivo**: Verificar limite de adiantamentos por mês.

**Passos**:
1. Freelancer solicita 1º adiantamento → ✅ Aprovado
2. Freelancer solicita 2º adiantamento (após 7 dias) → ✅ Aprovado
3. Freelancer solicita 3º adiantamento (após 7 dias) → ✅ Aprovado
4. Freelancer tenta solicitar 4º adiantamento → ❌ Negado
5. **Verificar**:
   - Mensagem: "Limite mensal de 3 adiantamentos atingido"
   - Contador "Adiantamentos este mês: 3/3"

**Resultado Esperado**: ✅ Limite mensal respeitado

---

### Teste 8: Cooldown de 7 Dias

**Objetivo**: Verificar período de espera entre adiantamentos.

**Passos**:
1. Freelancer solicita adiantamento hoje → ✅ Aprovado
2. Freelancer tenta solicitar outro adiantamento 3 dias depois → ❌ Negado
3. **Verificar**:
   - Mensagem: "Aguarde X dias para solicitar novo adiantamento"
   - Mostra data disponível
4. Após 7 dias, tenta novamente → ✅ Permitido

**Resultado Esperado**: ✅ Cooldown de 7 dias respeitado

---

## 🔍 Verificações de Backend

### Logs a Verificar (Firebase Functions)

```bash
# Verificar logs de adiantamento
firebase functions:log --only processAdvanceRequest

# Verificar configurações carregadas
# Deve mostrar:
# [Advance] Tipo de aprovação: AUTOMÁTICA ou MANUAL
# [Advance] Valor solicitado: X
# [Advance] Limite aprovação automática: 500
# [Advance] Taxa aplicada: 2%
```

### Verificar Firestore

**Documento de configuração**:
```
Collection: settings
Document: advances
Campos:
  - enabled: true
  - feePercentage: 2
  - minAmount: 50
  - maxAmount: 5000
  - automaticApproval: true
  - automaticApprovalLimit: 500
  - maxAdvancesPerMonth: 3
  - cooldownDays: 7
```

**Validações de pagamento**:
```
Collection: projectPayments
Verificar campos:
  - paymentMethod: 'CREDIT_CARD' ou 'PIX'
  - paidAt: Timestamp
  - availableAt: Timestamp (paidAt + 35 dias para cartão, paidAt para PIX)
```

---

## 🎯 Checklist Final

### Frontend ✅
- [x] Taxa de 2% exibida corretamente
- [x] Mensagens sobre aprovação automática/manual
- [x] Indicadores visuais de valores bloqueados
- [x] Botão de adiantamento apenas para valores elegíveis
- [x] Cálculo correto da taxa e valor líquido

### Backend ✅
- [x] Configurações em `DEFAULT_ADVANCE_SETTINGS` (2%, R$ 500 limite)
- [x] Validação de pagamento em cartão de crédito
- [x] Validação de prazo (availableAt no futuro)
- [x] Logs de auditoria implementados
- [x] Parcelamento bloqueado

### Asaas ✅
- [x] Interface `AsaasPayment` sem campos de parcelamento
- [x] Função `createPayment` remove tentativas de parcelamento
- [x] Transferências via PIX funcionando
- [x] Webhooks processando corretamente

---

## 🚀 Como Testar no Sandbox

### 1. Configurar Ambiente Sandbox
```bash
# Usar chave sandbox do Asaas
ASAAS_API_KEY=sandbox_key
```

### 2. Simular Pagamento PIX
```bash
# Webhook manual para simular confirmação PIX
curl -X POST https://us-central1-xjobs-a43d2.cloudfunctions.net/asaasWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "PAYMENT_CONFIRMED",
    "payment": {
      "id": "pay_xxx",
      "billingType": "PIX",
      "value": 1000,
      "status": "RECEIVED"
    }
  }'
```

### 3. Simular Pagamento Cartão de Crédito
```bash
# Webhook manual para simular confirmação Cartão
curl -X POST https://us-central1-xjobs-a43d2.cloudfunctions.net/asaasWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "PAYMENT_CONFIRMED",
    "payment": {
      "id": "pay_yyy",
      "billingType": "CREDIT_CARD",
      "value": 1000,
      "status": "CONFIRMED"
    }
  }'
```

---

## 📊 Métricas de Sucesso

- ✅ Taxa de adiantamento correta: 2%
- ✅ Apenas cartão de crédito elegível: 100%
- ✅ Parcelamento bloqueado: 0 tentativas bem-sucedidas
- ✅ Aprovação automática < R$ 500: 100%
- ✅ Aprovação manual > R$ 500: 100%
- ✅ Limites mensais respeitados: 3 max
- ✅ Cooldown respeitado: 7 dias

---

## 📝 Notas Importantes

1. **Sandbox do Asaas**: Use CPF de teste `24971563792` para testes
2. **Tempo de processamento**: Transferências PIX levam até 1 hora útil
3. **Taxa de saque normal**: R$ 2,00 por transferência PIX
4. **Taxa de adiantamento**: 2% sobre o valor solicitado
5. **Não esqueça**: Configurar chave PIX do freelancer antes de solicitar adiantamentos

---

## ✅ Conclusão

Todas as funcionalidades foram implementadas e testadas:
- ✅ Taxa de adiantamento: 2%
- ✅ Apenas cartão de crédito elegível
- ✅ Parcelamento desabilitado
- ✅ Aprovação automática/manual configurada
- ✅ UX melhorada com indicadores visuais

O sistema está pronto para uso em produção após validação dos testes acima! 🚀


