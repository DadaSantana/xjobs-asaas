#!/bin/bash

# Teste da API do Pagar.me com chave de produção
echo "Testando autenticação com Pagar.me..."

# Teste de autenticação básica
curl -X GET "https://api.pagar.me/core/v5/recipients" \
  -H "accept: application/json" \
  -H "authorization: Basic c2tfZDNjMzUzMTU4NDM2NGQ4NTk4ODk5YzJmNDcwYWU0MjE6"

echo -e "\n\nTeste concluído." 