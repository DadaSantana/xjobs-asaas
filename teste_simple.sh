#!/bin/bash

echo "Testando chave do Pagar.me..."

# Teste com endpoint mais simples
curl -X GET "https://api.pagar.me/core/v5/accounts" \
  -H "accept: application/json" \
  -H "authorization: Basic c2tfZDNjMzUzMTU4NDM2NGQ4NTk4ODk5YzJmNDcwYWU0MjE6"

echo -e "\n\nTeste de conta concluído." 