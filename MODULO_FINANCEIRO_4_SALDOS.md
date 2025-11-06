# Módulo Financeiro - Sistema de 4 Saldos

## 📋 Visão Geral

O módulo financeiro foi completamente reestruturado para gerenciar corretamente o fluxo de fundos através do **Asaas**, garantindo que todos os status sejam rastreados via webhooks e refletidos em tempo real.

## 💰 Os 4 Saldos

### 1. **Saldo Disponível (Para Saque)**
- **Cor**: Verde
- **Descrição**: Valor que o freelancer pode sacar imediatamente
- **Cálculo**: Liberações disponíveis - Saques completados - Saques em processamento
- **Ação**: Botão "💰 Solicitar Saque"
- **Taxa**: R$ 2,00 por transação PIX

### 2. **Total Liberado (Confirmado pelo Asaas)**
- **Cor**: Azul
- **Descrição**: Total de valores já transferidos e confirmados pelo Asaas
- **Cálculo**: Soma de todos os saques com status `completed`
- **Origem**: Atualizado via webhook quando `TRANSFER_DONE`

### 3. **Processando (Saque Solicitado)**
- **Cor**: Amarelo
- **Descrição**: Valores de saques em processamento pelo Asaas
- **Cálculo**: Soma de saques com status `processing` ou `pending`
- **Origem**: Criado ao solicitar saque, atualizado via webhook

### 4. **Pendente (Bloqueado - Cartão 35 dias)**
- **Cor**: Laranja
- **Descrição**: Valores liberados pelo cliente mas bloqueados aguardando 35 dias (cartão de crédito)
- **Cálculo**: Liberações com `availableAt` no futuro
- **Ação**: Botão "⚡ Adiantar Agora" (se > R$ 50,00)
- **Taxa de Adiantamento**: 2% (via Asaas Anticipation API)

## 🔄 Fluxo de Saque

### 1. Freelancer solicita saque
```
Status: pending → processing
Action: Criar registro em `withdrawals`
Action: Chamar Asaas Transfer API
Action: Salvar `asaasTransferId`
```

### 2. Webhook recebe `TRANSFER_PENDING` ou `TRANSFER_BANK_PROCESSING`
```
Status: processing
Action: Atualizar registro em `withdrawals`
Action: Valor aparece em "Processando"
```

### 3. Webhook recebe `TRANSFER_DONE`
```
Status: completed
Action: Atualizar registro em `withdrawals`
Action: Criar transação `withdrawal_released` em `fundTransactions`
Action: Valor aparece em "Total Liberado"
Action: Remover de "Processando"
```

### 4. Webhook recebe `TRANSFER_FAILED` ou `TRANSFER_CANCELLED`
```
Status: failed/cancelled
Action: Atualizar registro em `withdrawals`
Action: Criar transação `withdrawal_reversal` em `fundTransactions`
Action: Estornar valor para "Saldo Disponível"
```

## ⚡ Fluxo de Adiantamento

### 1. Freelancer solicita adiantamento
```
Action: Buscar pagamento bloqueado (cartão de crédito)
Action: Verificar `asaasPaymentId`
Action: Chamar simulação Asaas `/anticipations/simulate`
Action: Mostrar valor líquido e taxa exata
```

### 2. Freelancer confirma
```
Action: Chamar Asaas `/anticipations`
Action: Criar registro em `advanceRequests`
Action: Salvar `asaasAnticipationId`
Status: 
  - Se valor ≤ R$ 500,00 → approved (automático)
  - Se valor > R$ 500,00 → pending (aprovação manual)
```

### 3. Webhook recebe `ANTICIPATION_APPROVED`
```
Status: completed
Action: Atualizar registro em `advanceRequests`
Action: Valor é liberado imediatamente pelo Asaas
Action: Remove de "Pendente"
Action: Adiciona ao "Saldo Disponível"
```

## 🔗 Webhooks Configurados

### Webhook de Transferências (Saques)
**URL**: `https://asaaswebhook-bo5fg4zxxq-uc.a.run.app`

**Eventos:**
- `TRANSFER_CREATED`
- `TRANSFER_PENDING`
- `TRANSFER_BANK_PROCESSING`
- `TRANSFER_DONE`
- `TRANSFER_FAILED`
- `TRANSFER_CANCELLED`

### Webhook de Antecipações (Adiantamentos)
**URL**: `https://asaaswebhook-bo5fg4zxxq-uc.a.run.app` (mesmo endpoint)

**Eventos:**
- `ANTICIPATION_PENDING`
- `ANTICIPATION_APPROVED`
- `ANTICIPATION_DENIED`

## 📊 Estrutura de Dados

### Collection: `withdrawals`
```typescript
{
  id: string;
  freelancerId: string;
  amount: number;
  netAmount: number; // amount - taxa
  fee: number; // R$ 2,00
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  asaasTransferId: string;
  asaasStatus: string;
  transferStatus: string;
  statusMessage: string;
  lastWebhookEvent: string;
  lastWebhookData: object;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}
```

### Collection: `advanceRequests`
```typescript
{
  id: string;
  freelancerId: string;
  projectId: string;
  amount: number;
  netAmount: number; // Calculado pelo Asaas
  fee: number; // Calculado pelo Asaas (taxa exata)
  feePercentage: number; // Aproximadamente 2%
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  approvalType: 'automatic' | 'manual';
  asaasPaymentId: string;
  asaasAnticipationId: string;
  anticipationStatus: string;
  asaasValue: number;
  asaasNetValue: number;
  asaasFee: number;
  isDocumentationRequired: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}
```

### Collection: `fundTransactions`
```typescript
{
  id: string;
  type: 'release' | 'withdraw' | 'withdrawal_released' | 'withdrawal_reversal' | 'anticipation_payment' | 'anticipation_fee';
  freelancerId: string;
  amount: number;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  gateway: 'asaas';
  asaasTransferId?: string;
  asaasAnticipationId?: string;
  withdrawalId?: string;
  processedAt: Timestamp;
  createdAt: Timestamp;
}
```

## 🎯 Pontos de Atenção

### 1. Webhook do Asaas
- **IMPORTANTE**: Configure o webhook no painel do Asaas apontando para `https://asaaswebhook-bo5fg4zxxq-uc.a.run.app`
- Habilite os eventos de `TRANSFER_*` e `ANTICIPATION_*`

### 2. Sincronização de Status
- Todos os status devem ser atualizados APENAS via webhook
- Nunca assumir que uma transferência foi concluída sem confirmação do webhook

### 3. Estornos Automáticos
- Se um saque falhar, o valor é automaticamente estornado para o saldo disponível
- Uma transação do tipo `withdrawal_reversal` é criada para rastreabilidade

### 4. Adiantamentos
- Só permitir adiantamento de pagamentos em **cartão de crédito**
- Verificar sempre se `availableAt` está no futuro
- Usar API de simulação ANTES de confirmar (mostra taxa exata)
- Valores até R$ 500,00 são aprovados automaticamente
- Valores acima de R$ 500,00 requerem aprovação manual

## 🧪 Testes

### Testar Fluxo de Saque
1. Liberar valor para freelancer (pagamento PIX - disponível imediatamente)
2. Ir em "Minhas Finanças"
3. Verificar "Saldo Disponível" > R$ 2,00
4. Clicar em "💰 Solicitar Saque"
5. Verificar que valor move para "Processando"
6. Aguardar webhook do Asaas
7. Verificar que valor move para "Total Liberado"

### Testar Fluxo de Adiantamento
1. Cliente paga projeto com **cartão de crédito**
2. Liberar valor para freelancer
3. Verificar que valor aparece em "Pendente (Cartão 35 dias)"
4. Clicar em "⚡ Adiantar Agora"
5. Ver simulação com taxa exata
6. Confirmar adiantamento
7. Se ≤ R$ 500,00: aprovação automática
8. Se > R$ 500,00: aguardar aprovação manual
9. Verificar que valor é antecipado pelo Asaas

## 📱 Interface do Usuário

### Página: `/freelancer/minhas-financas`

**4 Cards Principais:**
1. **Verde**: Saldo Disponível (para saque)
2. **Azul**: Total Liberado (confirmado)
3. **Amarelo**: Processando (saques em andamento)
4. **Laranja**: Pendente (cartão 35 dias) - com botão de adiantamento

**Seção "Valores Bloqueados":**
- Lista todos os pagamentos bloqueados (cartão de crédito)
- Mostra data prevista de liberação
- Botão "⚡ Solicitar Adiantamento" em cada item

## 🔧 Arquivos Modificados

### Backend (Functions)
- `functions/src/asaasWebhook.ts` - Webhook unificado para transfers e anticipations
- `functions/src/asaasService.ts` - Novas funções de anticipation API
- `functions/src/advanceService.ts` - Lógica de adiantamento refatorada
- `functions/src/index.ts` - Export da função `simulateAdvanceRequest`

### Frontend
- `src/services/fundsService.ts` - Cálculo dos 4 saldos
- `src/pages/freelancer/MinhasFinancas.tsx` - Interface com 4 cards
- `src/components/advance/AdvanceRequestDialog.tsx` - Dialog de adiantamento

## ✅ Status Atual

- ✅ Webhook de transferências implementado
- ✅ Webhook de antecipações implementado
- ✅ Cálculo dos 4 saldos implementado
- ✅ Interface com 4 cards atualizada
- ✅ Botões de adiantamento visíveis
- ✅ Dialog de adiantamento funcional
- ✅ Deploy realizado

## 🧪 Como Testar a Simulação de Antecipação

### Passo 1: Preparar Dados

1. **Cliente faz pagamento com CARTÃO DE CRÉDITO**
2. **Cliente libera o valor para o freelancer**
3. **Valor aparece em "Pendente (Cartão 35 dias)"**

### Passo 2: Simular no Frontend

1. Acesse `/freelancer/minhas-financas`
2. Veja o valor em "Pendente"
3. Clique em **"⚡ Adiantar Agora"** ou **"⚡ Solicitar Adiantamento"**
4. **Aguarde a simulação automática com o Asaas** (1-2 segundos)
5. Veja o **card verde** com:
   - ✅ Simulação Asaas confirmada
   - Valor disponível
   - **Taxa exata calculada pelo Asaas**
   - Valor líquido que receberá

### Passo 3: Confirmar Antecipação

1. Revise os valores
2. Clique em "Solicitar Adiantamento"
3. Sistema processa via Asaas
4. Aguarde webhook de confirmação

### 📝 O Que Acontece na Simulação

**1. Frontend chama:**
```
POST https://simulateadvancerequest-bo5fg4zxxq-uc.a.run.app
Body: { projectId: "xxx" }
```

**2. Backend (Firebase Function):**
- Busca o `asaasPaymentId` do pagamento
- Chama Asaas: `POST /v3/anticipations/simulate`
- Retorna taxa REAL calculada pelo Asaas

**3. Frontend exibe:**
- Valor bruto
- Taxa exata (ex: 2.10%)
- Valor líquido
- Aviso se requer documentação

**📚 Guia Completo:**
Veja o arquivo `COMO_SIMULAR_ANTECIPACAO.md` para instruções detalhadas.

## 🚀 Próximos Passos

1. ✅ Configurar webhook no painel do Asaas
2. ✅ Testar simulação em sandbox
3. ✅ Testar em produção com pagamento real
4. ✅ Monitorar logs dos webhooks
5. ✅ Ajustar se necessário

---

**Data de Atualização**: 2025-11-06
**Versão**: 2.1
**Novidade**: Simulação real do Asaas implementada

