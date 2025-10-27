# 🔧 Guia: Configurar IP Estático para Pagar.me

## 📋 Problema
O Pagar.me exige que você adicione os IPs das suas Cloud Functions na allowlist para permitir chamadas à API. Como o Cloud Run usa IPs dinâmicos, precisamos configurar um IP estático.

## ✅ Solução: Cloud NAT com IP Estático

### **Opção 1: Usar o Script Automático (RECOMENDADO)**

Execute o script que criei para você:

```bash
./setup-static-ip.sh
```

O script irá:
1. ✅ Reservar um IP estático
2. ✅ Criar um Cloud Router
3. ✅ Criar um Cloud NAT
4. ✅ Criar um VPC Connector
5. ✅ Mostrar o IP que você precisa adicionar no Pagar.me

---

### **Opção 2: Configuração Manual**

Se preferir fazer manualmente, siga os passos abaixo:

#### **1. Reserve um IP Estático**

```bash
gcloud compute addresses create xjobs-nat-ip \
    --region=us-central1 \
    --project=xjobs-a43d2
```

#### **2. Obtenha o IP Reservado**

```bash
gcloud compute addresses describe xjobs-nat-ip \
    --region=us-central1 \
    --project=xjobs-a43d2 \
    --format="get(address)"
```

**Anote este IP! Você vai precisar dele para o Pagar.me.**

#### **3. Crie um Cloud Router**

```bash
gcloud compute routers create xjobs-router \
    --network=default \
    --region=us-central1 \
    --project=xjobs-a43d2
```

#### **4. Crie um Cloud NAT**

```bash
gcloud compute routers nats create xjobs-nat \
    --router=xjobs-router \
    --region=us-central1 \
    --nat-external-ip-pool=xjobs-nat-ip \
    --nat-all-subnet-ip-ranges \
    --project=xjobs-a43d2
```

#### **5. Crie um VPC Connector**

```bash
gcloud compute networks vpc-access connectors create xjobs-connector \
    --region=us-central1 \
    --subnet-project=xjobs-a43d2 \
    --subnet=default \
    --min-instances=2 \
    --max-instances=3 \
    --machine-type=e2-micro \
    --project=xjobs-a43d2
```

---

## 🔐 Adicionar IP na Allowlist do Pagar.me

### **Passo a Passo no Painel do Pagar.me:**

1. **Acesse o Dashboard do Pagar.me:**
   ```
   https://dash.pagar.me/
   ```

2. **Faça login** com suas credenciais

3. **Navegue para Configurações:**
   - Clique no ícone de engrenagem (⚙️) no canto superior direito
   - Ou vá diretamente para: `Configurações` > `Segurança`

4. **Encontre "Lista de IPs Permitidos":**
   - No menu lateral, procure por "Segurança" ou "API"
   - Clique em "Lista de IPs Permitidos" ou "IP Allowlist"

5. **Adicione o IP Estático:**
   - Clique em "Adicionar IP" ou "Add IP"
   - Cole o IP que você obteve no passo 2
   - Adicione uma descrição: `Cloud Functions - xjobs`
   - Clique em "Salvar" ou "Save"

6. **Confirme a Adição:**
   - Verifique se o IP aparece na lista
   - Aguarde alguns minutos para a propagação

---

## 🚀 Deploy das Funções

Após configurar o IP estático e adicionar na allowlist do Pagar.me:

```bash
cd functions
npm run build
firebase deploy --only functions:generateKycLink
```

---

## 🧪 Testar a Funcionalidade

1. Acesse: `http://localhost:8081/freelancer/minhas-financas`
2. Configure seus dados bancários
3. Clique em "Gerar Link de Verificação"
4. Se tudo estiver correto, o link será gerado com sucesso! ✅

---

## ❓ Troubleshooting

### **Erro: "IP de origem não autorizado"**
- ✅ Verifique se você adicionou o IP correto na allowlist do Pagar.me
- ✅ Aguarde alguns minutos para a propagação
- ✅ Verifique se o VPC Connector está ativo

### **Erro: "VPC connector does not exist"**
- ✅ Execute o script `setup-static-ip.sh` novamente
- ✅ Verifique se o VPC Connector foi criado com sucesso:
  ```bash
  gcloud compute networks vpc-access connectors list --region=us-central1
  ```

### **Erro: "Permission denied"**
- ✅ Verifique se você tem permissões de administrador no projeto GCP
- ✅ Execute: `gcloud auth login` para fazer login novamente

---

## 💰 Custos Estimados

- **IP Estático:** ~$3/mês
- **Cloud NAT:** ~$0.045/hora (~$32/mês)
- **VPC Connector:** ~$0.03/hora (~$22/mês)

**Total estimado:** ~$57/mês

---

## 🔄 Alternativa: Desabilitar IP Allowlist (NÃO RECOMENDADO)

Se você estiver em ambiente de desenvolvimento/teste, pode desabilitar temporariamente o IP Allowlist no Pagar.me. **Não faça isso em produção!**

---

## 📞 Suporte

Se tiver problemas, verifique os logs:

```bash
firebase functions:log --only generateKycLink
```

Ou entre em contato com o suporte do Pagar.me:
- Email: suporte@pagar.me
- Documentação: https://docs.pagar.me/


