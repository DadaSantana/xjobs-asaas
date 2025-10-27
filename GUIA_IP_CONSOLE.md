# 🌐 Guia: Configurar IP Estático via Console do Google Cloud

## 📋 Como fazer tudo pelo navegador (sem usar terminal)

### **Passo 1: Acessar o Console do Google Cloud**

1. Acesse: https://console.cloud.google.com/
2. Selecione o projeto: `xjobs-a43d2`

---

### **Passo 2: Reservar um IP Estático**

1. No menu lateral, vá em: **VPC Network** > **IP Addresses**
   - Ou acesse diretamente: https://console.cloud.google.com/networking/addresses/list

2. Clique em **RESERVE EXTERNAL STATIC ADDRESS** (no topo)

3. Preencha os campos:
   - **Name:** `xjobs-nat-ip`
   - **Network Service Tier:** Premium
   - **IP version:** IPv4
   - **Type:** Regional
   - **Region:** `us-central1`
   - **Attached to:** None (deixe em branco)

4. Clique em **RESERVE**

5. **ANOTE O IP GERADO!** Você vai precisar dele para o Pagar.me
   - Exemplo: `34.123.45.67`

---

### **Passo 3: Criar um Cloud Router**

1. No menu lateral, vá em: **Hybrid Connectivity** > **Cloud Routers**
   - Ou acesse: https://console.cloud.google.com/hybrid/routers/list

2. Clique em **CREATE ROUTER**

3. Preencha os campos:
   - **Name:** `xjobs-router`
   - **Network:** `default`
   - **Region:** `us-central1`
   - **Google ASN:** 64512 (padrão)

4. Clique em **CREATE**

---

### **Passo 4: Criar um Cloud NAT**

1. No menu lateral, vá em: **Network Services** > **Cloud NAT**
   - Ou acesse: https://console.cloud.google.com/net-services/nat/list

2. Clique em **CREATE CLOUD NAT GATEWAY**

3. Preencha os campos:
   - **Gateway name:** `xjobs-nat`
   - **VPC network:** `default`
   - **Region:** `us-central1`
   - **Cloud Router:** Selecione `xjobs-router` (que você criou no passo 3)

4. Em **NAT IP addresses:**
   - Selecione: **Manual**
   - Clique em **Select IP addresses**
   - Selecione: `xjobs-nat-ip` (que você criou no passo 2)

5. Em **Source (internal):**
   - Selecione: **All subnet IP ranges**

6. Clique em **CREATE**

---

### **Passo 5: Criar um VPC Connector**

1. No menu lateral, vá em: **Serverless** > **Serverless VPC Access**
   - Ou acesse: https://console.cloud.google.com/networking/connectors/list

2. Clique em **CREATE CONNECTOR**

3. Preencha os campos:
   - **Name:** `xjobs-connector`
   - **Region:** `us-central1`
   - **Network:** `default`
   - **Subnet:** Selecione `default` ou crie uma nova subnet
   - **IP range:** `10.8.0.0/28` (ou deixe o padrão)
   - **Min instances:** 2
   - **Max instances:** 3
   - **Machine type:** `e2-micro`

4. Clique em **CREATE**

5. **Aguarde alguns minutos** até o connector ficar com status "Ready" (verde)

---

### **Passo 6: Adicionar IP na Allowlist do Pagar.me**

1. **Acesse o Dashboard do Pagar.me:**
   ```
   https://dash.pagar.me/
   ```

2. **Faça login** com suas credenciais

3. **Navegue para Configurações:**
   - Clique no menu superior direito (seu nome/avatar)
   - Clique em **Configurações** ou **Settings**

4. **Acesse a seção de Segurança:**
   - No menu lateral, procure por **Segurança** ou **Security**
   - Clique em **Lista de IPs Permitidos** ou **IP Allowlist**
   
   > Se não encontrar, tente:
   > - **Configurações** > **API** > **IP Allowlist**
   > - Ou entre em contato com o suporte do Pagar.me

5. **Adicione o IP Estático:**
   - Clique em **Adicionar IP** ou **Add IP** ou **+ Novo IP**
   - Cole o IP que você anotou no **Passo 2**
   - Adicione uma descrição: `Cloud Functions - xjobs`
   - Clique em **Salvar** ou **Save**

6. **Confirme a Adição:**
   - Verifique se o IP aparece na lista
   - Status deve estar "Ativo" ou "Active"

---

### **Passo 7: Fazer Deploy das Funções**

Agora que tudo está configurado, faça o deploy:

```bash
cd functions
npm run build
firebase deploy --only functions:generateKycLink
```

---

## ✅ Verificar se está tudo funcionando

### **1. Verificar o VPC Connector:**

Acesse: https://console.cloud.google.com/networking/connectors/list

- O connector `xjobs-connector` deve estar com status **Ready** (verde)

### **2. Verificar o Cloud NAT:**

Acesse: https://console.cloud.google.com/net-services/nat/list

- O NAT `xjobs-nat` deve estar com status **Running**

### **3. Verificar o IP Estático:**

Acesse: https://console.cloud.google.com/networking/addresses/list

- O IP `xjobs-nat-ip` deve estar **In use by Cloud NAT**

---

## 🧪 Testar a Funcionalidade

1. Acesse: `http://localhost:8081/freelancer/minhas-financas`
2. Configure seus dados bancários
3. Clique em **Gerar Link de Verificação**
4. Se tudo estiver correto, o link será gerado com sucesso! ✅

---

## 📸 Screenshots de Referência

### **Como encontrar o IP Allowlist no Pagar.me:**

O menu pode variar, mas geralmente está em:
- **Configurações** > **Segurança** > **Lista de IPs**
- **Settings** > **Security** > **IP Allowlist**
- **Configurações** > **API** > **IPs Permitidos**

Se não encontrar, entre em contato com o suporte:
- Email: suporte@pagar.me
- Chat: Disponível no dashboard

---

## ❓ Troubleshooting

### **"Não consigo encontrar a opção de IP Allowlist no Pagar.me"**

Possíveis motivos:
1. Você precisa ser **administrador** da conta
2. A funcionalidade pode estar em **Configurações Avançadas**
3. Entre em contato com o suporte do Pagar.me: suporte@pagar.me

### **"O VPC Connector não fica Ready"**

1. Verifique se você tem permissões suficientes no projeto
2. Aguarde até 10 minutos para a criação
3. Verifique os logs em: https://console.cloud.google.com/logs

### **"Ainda recebo erro de IP não autorizado"**

1. Verifique se o IP foi adicionado corretamente no Pagar.me
2. Aguarde 5-10 minutos para propagação
3. Verifique se o VPC Connector está configurado na função
4. Faça o deploy novamente da função

---

## 💡 Dica Importante

Após configurar tudo, **teste primeiro em ambiente de desenvolvimento** antes de usar em produção!

---

## 📞 Precisa de Ajuda?

- **Suporte Google Cloud:** https://cloud.google.com/support
- **Suporte Pagar.me:** suporte@pagar.me
- **Documentação Pagar.me:** https://docs.pagar.me/


