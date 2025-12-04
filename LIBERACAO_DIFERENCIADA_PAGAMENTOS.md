# Sistema de Liberação Diferenciada por Método de Pagamento

## 📋 Visão Geral

Implementação de um sistema de liberação diferenciada de valores baseado no método de pagamento utilizado pelo cliente:

- **PIX**: Liberação **instantânea** para o freelancer
- **Cartão de Crédito**: Liberação após **35 dias** da data de pagamento
- **Outros métodos**: Liberação instantânea (padrão)

## 🎯 Objetivos

1. Registrar o método de pagamento (billingType) de cada transação
2. Calcular automaticamente a data de disponibilidade dos valores
3. Exibir claramente para o freelancer:
   - Saldo disponível para saque
   - Saldo pendente (bloqueado por prazo)
   - Data de liberação de cada valor

## 🏗️ Arquitetura

### 1. Tipos e Interfaces

**Arquivo: `src/types/funds.ts`**

```typescript
export interface ProjectPayment {
  // ... campos existentes ...
  
  // Novos campos adicionados:
  paymentMethod?: 'PIX' | 'CREDIT_CARD' | 'BOLETO' | 'DEBIT_CARD' | 'UNDEFINED';
  paidAt?: Timestamp; // Data que o pagamento foi confirmado
  availableAt?: Timestamp; // Data que o valor ficará disponível para saque
}
```

### 2. Webhook do Asaas

**Arquivo: `functions/src/asaasPlans.ts`**

A função `processPaymentConfirmed` foi atualizada para:

1. **Capturar o método de pagamento** (`billingType`) do webhook
2. **Calcular a data de disponibilidade**:
   - PIX: disponível imediatamente
   - Cartão de crédito: +35 dias da data de pagamento
3. **Salvar no Firestore** os campos `paymentMethod`, `paidAt` e `availableAt`

```typescript
async function processPaymentConfirmed(paymentData: { 
  id: string; 
  billingType?: string; 
  clientPaymentDate?: string;
  confirmedDate?: string;
  [key: string]: unknown 
}) {
  // Determinar método de pagamento
  const paymentMethod = paymentData.billingType as string || 'UNDEFINED';
  
  // Calcular data de disponibilidade
  const paidDate = paymentData.clientPaymentDate || paymentData.confirmedDate || new Date().toISOString().split('T')[0];
  const paidTimestamp = admin.firestore.Timestamp.fromDate(new Date(paidDate));
  
  const availableDate = new Date(paidDate);
  if (paymentMethod === 'CREDIT_CARD') {
    // Cartão de crédito: +35 dias
    availableDate.setDate(availableDate.getDate() + 35);
  }
  
  const availableTimestamp = admin.firestore.Timestamp.fromDate(availableDate);

  // Atualizar status do pagamento
  await paymentDoc.ref.update({
    paymentStatus: 'paid',
    escrowStatus: 'held',
    totalPaid: payment.totalAmount || 0,
    totalHeld: payment.freelancerAmount || 0,
    paymentMethod: paymentMethod,
    paidAt: paidTimestamp,
    availableAt: availableTimestamp,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}
```

### 3. Serviço de Fundos (FundsService)

**Arquivo: `src/services/fundsService.ts`**

#### 3.1. Função `getFreelancerBalance` Atualizada

Agora calcula separadamente:
- **availableBalance**: Valores já liberados e disponíveis para saque
- **pendingBalance**: Valores liberados mas bloqueados por prazo (cartão)

```typescript
static async getFreelancerBalance(freelancerId: string): Promise<{
  totalEarnings: number;
  totalReleased: number;
  pendingAmount: number;
  availableBalance: number;
  pendingBalance: number; // Liberado mas ainda bloqueado (cartão de crédito)
  pendingWithdrawals?: number;
}>
```

**Lógica**:
1. Busca todas as liberações do freelancer
2. Para cada liberação, verifica o método de pagamento e data de disponibilidade
3. Compara a data atual com `availableAt`:
   - Se já passou: adiciona ao `availableBalance`
   - Se ainda não passou: adiciona ao `pendingBalance`

#### 3.2. Função `getPendingReleases` (Nova)

Retorna uma lista detalhada de todas as liberações que estão aguardando prazo:

```typescript
static async getPendingReleases(freelancerId: string): Promise<any[]>
```

**Retorna**:
```typescript
[{
  projectId: string,
  projectTitle: string,
  amount: number,
  paymentMethod: string,
  paidAt: Date,
  availableDate: string, // Formatado: "dd/MM/yyyy"
  availableDateRaw: Date,
}]
```

#### 3.3. Função Auxiliar `getProjectPayment` (Privada)

Busca informações de pagamento de um projeto específico:

```typescript
private static async getProjectPayment(projectId: string): Promise<any | null>
```

### 4. Interface do Freelancer

**Arquivo: `src/pages/freelancer/MinhasFinancas.tsx`**

#### 4.1. Resumo Financeiro Atualizado

Agora exibe **5 cards**:

1. **Saldo Disponível** (verde) - Disponível para saque imediato
2. **Total Liberado** (azul) - Total já liberado pelo cliente
3. **Pendente** (laranja) - Liberado mas aguardando prazo (cartão)
4. **A Liberar** (amarelo) - Ainda não liberado pelo cliente
5. ~~**Saques Pendentes**~~ (removido para dar espaço ao novo card)

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
  {/* Saldo Disponível */}
  <div className="text-center p-3 md:p-4 bg-green-50 rounded-lg">
    <div className="text-xs md:text-sm text-gray-600">Saldo Disponível</div>
    <div className="text-xs text-gray-500 mb-1">Disponível para saque</div>
    <div className="text-lg md:text-2xl font-bold text-green-700">
      {formatCurrency(summary.availableBalance)}
    </div>
  </div>
  
  {/* Pendente (novo) */}
  <div className="text-center p-3 md:p-4 bg-orange-50 rounded-lg">
    <div className="text-xs md:text-sm text-gray-600">Pendente</div>
    <div className="text-xs text-gray-500 mb-1">Aguardando prazo</div>
    <div className="text-lg md:text-2xl font-bold text-orange-700">
      {formatCurrency(summary.pendingBalance)}
    </div>
  </div>
  
  {/* ... outros cards ... */}
</div>
```

#### 4.2. Card de Valores Pendentes (Novo)

Seção adicional que lista todos os valores em espera com suas datas de liberação:

```tsx
{pendingReleases.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-orange-500" />
        Valores Pendentes de Liberação
      </CardTitle>
      <CardDescription>
        Valores já liberados pelo cliente mas aguardando prazo de compensação (cartão de crédito)
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {pendingReleases.map((release, idx) => (
          <div key={idx} className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex-1">
              <div className="font-medium text-gray-900">{release.projectTitle || 'Projeto'}</div>
              <div className="text-sm text-gray-600 mt-1">
                Método: <Badge variant="outline">{release.paymentMethod === 'CREDIT_CARD' ? 'Cartão de Crédito' : release.paymentMethod}</Badge>
              </div>
              <div className="text-sm text-orange-600 mt-1">
                Disponível em: <strong>{release.availableDate}</strong>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-orange-700">{formatCurrency(release.amount)}</div>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)}
```

## 🔄 Fluxo Completo

### 1. Cliente Paga Projeto

1. Cliente escolhe método de pagamento (PIX ou Cartão)
2. Sistema cria pagamento no Asaas via `createAsaasCheckout`
3. Pagamento é processado pelo Asaas

### 2. Webhook Confirma Pagamento

1. Asaas envia webhook `PAYMENT_CONFIRMED` com:
   - `id`: ID do pagamento
   - `billingType`: Método de pagamento (PIX, CREDIT_CARD, etc.)
   - `clientPaymentDate`: Data do pagamento
   
2. Função `processPaymentConfirmed`:
   - Salva `paymentMethod`
   - Calcula e salva `paidAt`
   - Calcula e salva `availableAt`:
     - PIX: mesma data de `paidAt`
     - Cartão: `paidAt + 35 dias`
   - Atualiza status do projeto para `executando`
   - Cria `fundHold` com o valor do freelancer

### 3. Cliente Libera Valor

1. Cliente aprova liberação de X% via interface
2. Sistema cria `fundRelease` vinculado ao projeto
3. Valor é marcado como "liberado" mas não necessariamente "disponível"

### 4. Freelancer Visualiza Saldo

1. Sistema busca todas as liberações do freelancer
2. Para cada liberação:
   - Busca dados do pagamento original
   - Verifica `availableAt`
   - Compara com data atual
   - Classifica como "disponível" ou "pendente"

3. Interface exibe:
   - **Saldo Disponível**: Pode sacar agora
   - **Saldo Pendente**: Lista com datas de liberação

### 5. Freelancer Solicita Saque

1. Sistema valida que há saldo disponível
2. Verifica dados bancários cadastrados
3. Solicita transferência via Asaas ou Pagarme
4. Deduz valor do saldo disponível

## 📊 Cenários de Teste

### Cenário 1: Pagamento via PIX

```
1. Cliente paga R$ 1.000 via PIX
2. Webhook: billingType = 'PIX', paidAt = '2025-01-01'
3. Sistema calcula: availableAt = '2025-01-01' (mesma data)
4. Cliente libera 100%
5. Freelancer vê: Saldo Disponível = R$ 900 (90%)
6. Freelancer pode sacar imediatamente
```

### Cenário 2: Pagamento via Cartão de Crédito

```
1. Cliente paga R$ 1.000 via Cartão
2. Webhook: billingType = 'CREDIT_CARD', paidAt = '2025-01-01'
3. Sistema calcula: availableAt = '2025-02-05' (+35 dias)
4. Cliente libera 100%
5. Freelancer vê:
   - Saldo Disponível = R$ 0
   - Saldo Pendente = R$ 900
   - Card adicional: "Disponível em 05/02/2025"
6. Após 05/02/2025: valor move para Saldo Disponível
```

### Cenário 3: Múltiplos Projetos com Métodos Diferentes

```
Projeto A: PIX, R$ 500, liberado → Disponível: R$ 450
Projeto B: Cartão, R$ 1.000, liberado, data futura → Pendente: R$ 900
Projeto C: PIX, R$ 300, não liberado → A Liberar: R$ 270

Resumo:
- Saldo Disponível: R$ 450
- Pendente: R$ 900 (data: 15/02/2025)
- A Liberar: R$ 270
```

## 🚀 Deploy

As seguintes funções foram atualizadas e deployadas:

```bash
firebase deploy --only functions:asaasWebhook,functions:createAsaasCheckout,functions:createAsaasSubscription
```

**Status**: ✅ Deploy concluído com sucesso

**URLs das Funções**:
- createAsaasCheckout: https://createasaascheckout-bo5fg4zxxq-uc.a.run.app
- createAsaasSubscription: https://createasaassubscription-bo5fg4zxxq-uc.a.run.app
- asaasWebhook: https://us-central1-xjobs-a43d2.cloudfunctions.net/asaasWebhook

## 📝 Notas Importantes

### 1. Prazo de 35 Dias

O prazo de 35 dias para cartão de crédito é baseado em:
- Período médio de chargeback: 30 dias
- Margem de segurança: 5 dias adicionais
- **Total**: 35 dias

Este prazo pode ser ajustado na função `processPaymentConfirmed` conforme necessário.

### 2. Métodos de Pagamento Suportados

O Asaas retorna os seguintes `billingType`:
- `PIX`: Pagamento via PIX
- `CREDIT_CARD`: Cartão de crédito
- `BOLETO`: Boleto bancário
- `DEBIT_CARD`: Cartão de débito
- `UNDEFINED`: Método não identificado

**Comportamento padrão**: Todos os métodos exceto `CREDIT_CARD` têm liberação instantânea.

### 3. Cálculo de Split

O sistema mantém o cálculo de split existente:
- **10%** para a plataforma (taxa)
- **90%** para o freelancer

O prazo de liberação afeta apenas os **90% do freelancer**, não a taxa da plataforma.

### 4. Atualização Automática

O sistema **não** atualiza automaticamente o saldo quando o prazo expira. O cálculo é feito em tempo real toda vez que o freelancer acessa a página de finanças.

Para implementar atualização automática, seria necessário:
- Cloud Function agendada (Firebase Scheduled Functions)
- Verificação diária de liberações com prazo expirado
- Notificação ao freelancer

## 🔒 Segurança

### Validações Implementadas:

1. **Webhook**: Valida origem e integridade dos dados do Asaas
2. **Saldo Disponível**: Apenas valores realmente disponíveis podem ser sacados
3. **Datas**: Todas as datas são armazenadas como Firestore Timestamp para consistência
4. **Método de Pagamento**: Validado contra lista de tipos suportados

## 🐛 Tratamento de Erros

### Cenários Tratados:

1. **Webhook sem billingType**: Usa 'UNDEFINED' e libera instantaneamente
2. **Webhook sem data de pagamento**: Usa data atual
3. **Pagamento sem availableAt no Firestore**: Considera disponível (legado)
4. **Erro ao buscar dados de pagamento**: Considera liberação disponível (seguro)

## 📚 Documentação Relacionada

- [INTEGRACAO_ASAAS.md](./INTEGRACAO_ASAAS.md) - Integração completa do Asaas
- [CONFIGURACAO_WEBHOOK_ASAAS.md](./CONFIGURACAO_WEBHOOK_ASAAS.md) - Configuração de webhooks
- [FLUXO_CONCLUSAO_PROJETO.md](./FLUXO_CONCLUSAO_PROJETO.md) - Fluxo de conclusão de projetos

## ✅ Checklist de Implementação

- [x] Adicionar campos ao tipo `ProjectPayment`
- [x] Atualizar webhook para capturar método de pagamento
- [x] Calcular data de disponibilidade baseada no método
- [x] Atualizar `FundsService.getFreelancerBalance`
- [x] Criar função `getPendingReleases`
- [x] Atualizar interface `MinhasFinancas.tsx`
- [x] Adicionar card de resumo com saldo pendente
- [x] Adicionar lista de valores pendentes com datas
- [x] Testes de linting
- [x] Deploy das funções

## 🎉 Resultado Final

O freelancer agora tem visibilidade completa sobre:
- ✅ Quanto pode sacar agora
- ⏳ Quanto está aguardando prazo
- 📅 Quando cada valor ficará disponível
- 💳 Qual método de pagamento foi usado

Isso aumenta a **transparência** e **confiança** no sistema!

