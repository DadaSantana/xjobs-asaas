# 🔔 Configuração do Webhook Asaas para Transferências

Este documento explica como configurar o webhook do Asaas para receber notificações automáticas sobre o status das transferências PIX.

## 📋 URL do Webhook

```
https://us-central1-xjobs-a43d2.cloudfunctions.net/asaasTransferWebhook
```

## ⚙️ Passos para Configurar

### 1. Acesse o Painel Asaas

1. Faça login em [https://www.asaas.com](https://www.asaas.com)
2. Vá para **Configurações** → **Webhooks** (ou **Integrações** → **Webhooks**)

### 2. Adicione um Novo Webhook

Clique em **"Adicionar Webhook"** ou **"Novo Webhook"**

### 3. Configure o Webhook

Preencha os campos:

- **Nome**: `Transferências XJobs`
- **URL**: `https://us-central1-xjobs-a43d2.cloudfunctions.net/asaasTransferWebhook`
- **Status**: ✅ **Ativo**
- **Autenticação**: Deixe em branco (não é necessário)

### 4. Selecione os Eventos de Transferência

Marque **TODOS** os eventos relacionados a transferências:

- ✅ `TRANSFER_CREATED` - Transferência criada
- ✅ `TRANSFER_PENDING` - Transferência pendente
- ✅ `TRANSFER_BANK_PROCESSING` - Transferência em processamento no banco
- ✅ `TRANSFER_DONE` - Transferência concluída ⭐
- ✅ `TRANSFER_CANCELLED` - Transferência cancelada
- ✅ `TRANSFER_FAILED` - Transferência falhou ⭐

### 5. Salve a Configuração

Clique em **"Salvar"** ou **"Criar Webhook"**

## 🧪 Testar o Webhook

### Opção 1: Teste Manual no Painel Asaas

1. No painel de webhooks, encontre o webhook criado
2. Clique em **"Testar"** ou **"Enviar Teste"**
3. Selecione um evento de transferência (ex: `TRANSFER_DONE`)
4. Envie o teste

### Opção 2: Fazer uma Transferência Real (Ambiente de Sandbox)

1. Faça uma solicitação de saque de teste
2. Acompanhe os logs da função no Firebase Console

## 📊 Verificar se Está Funcionando

### No Firebase Console:

1. Acesse [Firebase Console](https://console.firebase.google.com/project/xjobs-a43d2/functions)
2. Vá em **Functions** → **Logs**
3. Filtre por `asaasTransferWebhook`
4. Você verá logs como:

```
[Asaas Webhook] Evento recebido: TRANSFER_DONE
[Asaas Webhook] Dados da transferência: {...}
[Asaas Webhook] Solicitação de saque encontrada: xxx
[Asaas Webhook] Solicitação atualizada: xxx novo status: completed
```

### No Firestore:

1. Acesse o Firestore
2. Vá para a coleção `withdrawRequests`
3. Encontre a solicitação de saque
4. Verifique se os campos foram atualizados:
   - `status`: deve mudar conforme o evento
   - `transferStatus`: status retornado pelo Asaas
   - `statusMessage`: mensagem amigável
   - `lastWebhookEvent`: último evento recebido
   - `lastWebhookData`: dados completos do evento

## 🔄 Fluxo de Eventos

```
1. Usuário solicita saque
   └─> status: "pending"

2. Asaas cria transferência
   └─> Webhook: TRANSFER_CREATED
   └─> status: "pending"

3. Transferência em processamento
   └─> Webhook: TRANSFER_BANK_PROCESSING
   └─> status: "processing"

4. Transferência concluída ✅
   └─> Webhook: TRANSFER_DONE
   └─> status: "completed"
   └─> Notificação enviada ao usuário
   └─> Saldo atualizado automaticamente
```

## ❌ Tratamento de Erros

Se a transferência falhar:

```
1. Asaas detecta falha
   └─> Webhook: TRANSFER_FAILED

2. Sistema atualiza status
   └─> status: "failed"
   └─> statusMessage: motivo da falha

3. Notificação de erro enviada
   └─> Usuário é informado

4. Saldo é devolvido
   └─> Valor volta para disponível
```

## 🎯 Benefícios do Webhook

✅ **Atualização Automática**: Status atualizado em tempo real
✅ **Saldo Preciso**: Desconta imediatamente ao solicitar, devolve se falhar
✅ **Notificações**: Usuário informado sobre conclusão ou falha
✅ **Transparência**: Histórico completo de eventos
✅ **Confiabilidade**: Não depende de polling manual

## 🔒 Segurança

- ✅ Webhook aceita apenas requests do Asaas
- ✅ Validação de dados antes de processar
- ✅ Logs completos para auditoria
- ✅ Tratamento de erros robusto

## 📞 Suporte

Se o webhook não estiver funcionando:

1. Verifique os logs no Firebase Console
2. Verifique se a URL está correta no painel Asaas
3. Verifique se os eventos corretos estão selecionados
4. Teste manualmente enviando um evento de teste

## 📝 Notas Importantes

⚠️ **Importante**: O webhook deve estar configurado no ambiente de **PRODUÇÃO** do Asaas, não no sandbox.

⚠️ **Atenção**: Mesmo sem webhook, o sistema funciona. O webhook apenas melhora a experiência tornando as atualizações automáticas.

