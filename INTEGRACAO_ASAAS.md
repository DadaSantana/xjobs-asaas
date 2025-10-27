# 🔧 Integração Asaas - Sistema de Pagamento de Projetos

## 📋 Visão Geral

Este documento descreve a implementação do sistema de pagamento usando Asaas como gateway alternativo ao Pagarme. O sistema utiliza split próprio (10% plataforma, 90% freelancer) e transferências via API do Asaas.

## 🏗️ Arquitetura

### Componentes Principais

1. **Firebase Functions (Backend)**
   - `createAsaasCheckout` - Cria checkout de pagamento
   - `asaasWebhook` - Processa notificações do Asaas
   - `checkAsaasPaymentStatus` - Verifica status de pagamento
   - `transferToFreelancerAsaas` - Realiza transferências para freelancers

2. **Frontend (React/TypeScript)**
   - `AsaasCheckout.tsx` - Componente de checkout com PIX/Cartão
   - `BankAccountSetupModal.tsx` - Cadastro simplificado de dados bancários
   - `splitService.ts` - Cálculos de split e taxas

3. **Firestore (Banco de Dados)**
   - `projectPayments` - Pagamentos de projetos
   - `fundHolds` - Fundos retidos (escrow)
   - `fundReleases` - Liberações de pagamento
   - `fundTransactions` - Histórico de transações
   - `users/{uid}.bankAccount` - Dados bancários dos freelancers

## 🔑 Configuração

### Chave API Asaas (Sandbox)

```typescript
// functions/src/config/asaas.ts
export const ASAAS_CONFIG = {
  apiKey: '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjIwMjE5ZWVjLWI3OTUtNDNhYy1hMTIxLTc5MTAzOTUwNjFmMDo6JGFhY2hfYWIzMzc2OGQtZGZhMi00NDIzLTgwYjgtZmY2NjMyMTFlMWZk',
  apiUrl: 'https://api-sandbox.asaas.com/v3',
  split: {
    platformFeePercentage: 10,
    freelancerPercentage: 90,
  },
};
```

### Webhook Asaas

Configurar no painel do Asaas:
- **URL:** `https://us-central1-xjobs-a43d2.cloudfunctions.net/asaasWebhook`
- **Eventos:** 
  - `PAYMENT_CONFIRMED`
  - `PAYMENT_RECEIVED`

## 💰 Fluxo de Pagamento

### 1. Cliente Aceita Proposta

```typescript
// Frontend chama createAsaasCheckout
const response = await fetch('/createAsaasCheckout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    projectId: 'proj_123',
    projectTitle: 'Desenvolvimento de App',
    amount: 1000, // Valor do freelancer (90%)
    clientData: {
      name: 'João Silva',
      email: 'joao@email.com',
      cpf: '12345678900',
      phone: '11999999999',
    },
    freelancerData: {
      freelancerId: 'freelancer_123',
      freelancerName: 'Maria Santos',
    },
  }),
});
```

### 2. Backend Calcula Split

```typescript
// Sistema calcula automaticamente
const freelancerAmount = 1000; // 90%
const totalAmount = freelancerAmount / 0.9; // 1111.11 (100%)
const platformFee = totalAmount - freelancerAmount; // 111.11 (10%)
```

### 3. Asaas Cria Cobrança

- Cliente no Asaas é criado/atualizado
- Cobrança é gerada com PIX + Cartão disponíveis
- Dados salvos no Firestore com valores separados

### 4. Cliente Realiza Pagamento

- PIX: QR Code exibido no componente `AsaasCheckout`
- Cartão: Redirecionamento para página do Asaas
- Sistema faz polling a cada 5s para verificar status

### 5. Webhook Confirma Pagamento

```typescript
// asaasWebhook processa confirmação
await db.collection('projectPayments').doc(paymentId).update({
  paymentStatus: 'paid',
  escrowStatus: 'held',
  totalHeld: freelancerAmount, // Apenas 90% fica retido
});

// Projeto atualizado para 'executando'
await db.collection('projects').doc(projectId).update({
  status: 'executando',
});

// FundHold criado com 90% do valor
await db.collection('fundHolds').add({
  projectValue: freelancerAmount,
  totalHeld: freelancerAmount,
  availableForRelease: freelancerAmount,
});
```

## 💸 Fluxo de Liberação

### 1. Cliente Aprova Liberação

```typescript
// FundReleaseModal calcula sobre freelancerAmount (90%)
const releaseAmount = (freelancerAmount * percentage) / 100;

// Criar liberação
await FundsService.requestFundRelease({
  projectId,
  percentage: 50, // Liberar 50% do valor líquido
  // ...
});
```

### 2. Trigger Processa Liberação

```typescript
// onFundReleaseCreate (Firebase Trigger)
// Busca dados bancários do freelancer
const bankData = await db.collection('users')
  .doc(freelancerId)
  .get()
  .then(doc => doc.data()?.bankAccount);

// Chama transferToFreelancerAsaas
await transferToFreelancerAsaas({
  releaseId,
  freelancerId,
  amount: releaseAmount,
  bankData,
});
```

### 3. Asaas Realiza Transferência PIX

```typescript
// transferToFreelancerAsaas cria transferência
const transfer = await createTransfer({
  value: releaseAmount,
  bankAccount: {
    bank: { code: bankData.bank },
    accountName: bankData.holderName,
    cpfCnpj: bankData.holderDocument,
    agency: bankData.agency,
    account: bankData.account,
    accountDigit: bankData.accountDigit,
  },
  operationType: 'PIX',
});

// Atualiza release
await db.collection('fundReleases').doc(releaseId).update({
  status: 'released',
  asaasTransferId: transfer.id,
});
```

## 📊 Estrutura de Dados

### ProjectPayment

```typescript
{
  projectId: string,
  gateway: 'asaas',
  asaasPaymentId: string,
  asaasCustomerId: string,
  
  // Valores de split
  totalAmount: number, // 1111.11 (100%)
  platformFee: number, // 111.11 (10%)
  freelancerAmount: number, // 1000.00 (90%)
  
  // Status
  paymentStatus: 'paid',
  escrowStatus: 'held',
  totalHeld: 1000.00, // Apenas 90% retido
  totalReleased: 0,
}
```

### BankAccount (users/{uid}.bankAccount)

```typescript
{
  bank: '260', // Código do banco
  bankName: 'Nubank',
  agency: '0001',
  account: '5389697',
  accountDigit: '1',
  accountType: 'checking' | 'savings',
  holderName: 'MARIA SANTOS',
  holderDocument: '12345678900', // CPF sem formatação
  createdAt: Date,
  updatedAt: Date,
}
```

## 🎨 Componentes Frontend

### AsaasCheckout

```tsx
<AsaasCheckout
  paymentId={payment.id}
  totalAmount={1111.11}
  platformFee={111.11}
  freelancerAmount={1000.00}
  pixQrCode={payment.pixQrCode}
  pixPayload={payment.pixPayload}
  onPaymentConfirmed={() => navigate('/success')}
/>
```

### BankAccountSetupModal

```tsx
<BankAccountSetupModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onSubmit={async (data) => {
    // Salva em users/{uid}.bankAccount
    await updateDoc(userRef, { bankAccount: data });
  }}
  loading={saving}
/>
```

## 🧪 Testes

### Testar Pagamento

1. Criar projeto e aceitar proposta
2. Sistema gera checkout com valores calculados
3. Pagar com PIX usando app de sandbox do Asaas
4. Verificar webhook confirmando pagamento
5. Projeto deve ir para status 'executando'

### Testar Transferência

1. Cliente libera percentual do valor
2. Sistema cria `fundRelease`
3. Trigger chama `transferToFreelancerAsaas`
4. Verificar transferência PIX no Asaas
5. Saldo do freelancer atualizado

### Cartões de Teste (Sandbox)

- **Aprovado:** 5162306219378829
- **Recusado:** 5162308800158211
- CVV: qualquer
- Validade: qualquer data futura

## 📦 Deploy

### Firebase Functions

```bash
cd functions
npm install
npm run deploy
```

### Configurar Webhook

1. Acesse painel Asaas Sandbox
2. Configurações > Webhooks
3. Adicione URL da função `asaasWebhook`
4. Selecione eventos de pagamento

## 🔄 Migração Pagarme → Asaas

### Compatibilidade

- ✅ Funções antigas do Pagarme mantidas
- ✅ Sistema funciona com ambos gateways
- ✅ Identificado por campo `gateway: 'asaas' | 'pagarme'`

### Dados Bancários

- ❌ Não usar recipient do Pagarme
- ✅ Usar `users/{uid}.bankAccount` (simplificado)
- ✅ Sem necessidade de KYC complexo

## 🚀 Próximos Passos

1. ✅ Implementação básica completa
2. ⏳ Testes end-to-end em sandbox
3. ⏳ Migração gradual de projetos
4. ⏳ Deploy em produção
5. ⏳ Monitoramento e ajustes

## 📞 Suporte

- **Documentação Asaas:** https://docs.asaas.com
- **API Reference:** https://docs.asaas.com/reference
- **Suporte Técnico:** suporte@asaas.com

---

**Versão:** 1.0  
**Data:** Outubro 2025  
**Autor:** Equipe XJobs

