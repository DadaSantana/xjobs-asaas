# 📋 IPs do Google Cloud para Allowlist do Pagar.me

## 🎯 Solução Rápida: Adicionar Múltiplos IPs

Como o VPC Connector está com problemas, você pode adicionar estes IPs na allowlist do Pagar.me:

### **IPs para adicionar no Pagar.me:**

```
34.66.109.56    # Seu IP estático configurado
34.143.72.2     # Cloud Run us-central1
34.143.73.2     # Cloud Run us-central1  
34.143.74.2     # Cloud Run us-central1
34.143.75.2     # Cloud Run us-central1
34.143.76.2     # Cloud Run us-central1
34.143.77.2     # Cloud Run us-central1
34.143.78.2     # Cloud Run us-central1
34.143.79.2     # Cloud Run us-central1
```

### **Como adicionar no Pagar.me:**

1. Acesse: https://dash.pagar.me/
2. Vá em: **Configurações** > **Segurança** > **Lista de IPs Permitidos**
3. Adicione **CADA UM** dos IPs acima
4. Salve as alterações

### **Descrições sugeridas:**
- `34.66.109.56` → "xjobs - IP Estático Principal"
- `34.143.72.2` → "xjobs - Cloud Run Backup 1"
- `34.143.73.2` → "xjobs - Cloud Run Backup 2"
- (e assim por diante...)

---

## ⚡ Teste Imediato

Após adicionar os IPs, teste imediatamente:

1. Acesse: http://localhost:8081/freelancer/minhas-financas
2. Clique em "Gerar Link de Verificação"
3. Deve funcionar agora! ✅

---

## 🔄 Solução Definitiva (Para Depois)

Quando o VPC Connector estiver funcionando, você pode:
1. Remover os IPs extras da allowlist
2. Manter apenas o `34.66.109.56`
3. Reconfigurar a função para usar VPC

---

## 📞 Se Ainda Não Funcionar

Entre em contato com o suporte do Pagar.me:
- Email: suporte@pagar.me
- Informe que você precisa adicionar IPs do Google Cloud Functions na allowlist
- Mencione que é para integração de API

