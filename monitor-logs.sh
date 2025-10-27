#!/bin/bash

echo "🔍 Monitorando logs da função generateKycLinkV2..."
echo "📋 Quando você testar a geração do link, o IP será mostrado aqui!"
echo ""
echo "⏳ Aguardando logs... (Pressione Ctrl+C para parar)"
echo ""

firebase functions:log --only generateKycLinkV2 --follow
