#!/bin/bash

# Script para configurar IP estático para Cloud Functions
# Este script configura Cloud NAT com IP estático para que o Pagar.me aceite as requisições

PROJECT_ID="xjobs-a43d2"
REGION="us-central1"

echo "🚀 Configurando IP estático para Cloud Functions..."
echo ""

# 1. Reserve um IP estático
echo "1️⃣ Reservando IP estático..."
gcloud compute addresses create xjobs-nat-ip \
    --region=$REGION \
    --project=$PROJECT_ID

# Obter o IP reservado
STATIC_IP=$(gcloud compute addresses describe xjobs-nat-ip \
    --region=$REGION \
    --project=$PROJECT_ID \
    --format="get(address)")

echo "✅ IP estático reservado: $STATIC_IP"
echo ""

# 2. Criar Cloud Router
echo "2️⃣ Criando Cloud Router..."
gcloud compute routers create xjobs-router \
    --network=default \
    --region=$REGION \
    --project=$PROJECT_ID

echo "✅ Cloud Router criado"
echo ""

# 3. Criar Cloud NAT
echo "3️⃣ Criando Cloud NAT..."
gcloud compute routers nats create xjobs-nat \
    --router=xjobs-router \
    --region=$REGION \
    --nat-external-ip-pool=xjobs-nat-ip \
    --nat-all-subnet-ip-ranges \
    --project=$PROJECT_ID

echo "✅ Cloud NAT criado"
echo ""

# 4. Criar VPC Connector
echo "4️⃣ Criando VPC Connector..."
gcloud compute networks vpc-access connectors create xjobs-connector \
    --region=$REGION \
    --subnet-project=$PROJECT_ID \
    --subnet=default \
    --min-instances=2 \
    --max-instances=3 \
    --machine-type=e2-micro \
    --project=$PROJECT_ID

echo "✅ VPC Connector criado"
echo ""

echo "🎉 Configuração concluída!"
echo ""
echo "📝 PRÓXIMOS PASSOS:"
echo ""
echo "1. Adicione este IP na allowlist do Pagar.me:"
echo "   IP: $STATIC_IP"
echo ""
echo "2. Acesse o painel do Pagar.me:"
echo "   https://dash.pagar.me/"
echo ""
echo "3. Vá em: Configurações > Segurança > Lista de IPs permitidos"
echo ""
echo "4. Adicione o IP: $STATIC_IP"
echo ""
echo "5. Faça o deploy das funções:"
echo "   cd functions && firebase deploy --only functions:generateKycLink"
echo ""


