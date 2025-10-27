# Templates de E-mail - Xjobs

Este documento descreve os templates de e-mail implementados na plataforma Xjobs, todos com design moderno e responsivo seguindo a identidade visual do app.

## Templates Implementados

### 1. E-mail de Boas-vindas (`welcome`)
**Quando é enviado:** Após o cadastro bem-sucedido de um novo usuário
**Destinatário:** Novo usuário
**Assunto:** "Bem-vindo à Xjobs!"

**Características:**
- Design moderno com gradientes azuis
- Lista de benefícios da plataforma
- Call-to-action para acessar a conta
- Dica para completar o perfil
- Links para suporte e políticas

### 2. E-mail de Proposta Recebida (`proposalReceived`)
**Quando é enviado:** Quando um freelancer envia uma proposta para um projeto
**Destinatário:** Cliente (dono do projeto)
**Assunto:** "Nova Proposta Recebida - [Nome do Projeto]"

**Características:**
- Design verde com foco na ação
- Detalhes da proposta (projeto, freelancer, valor)
- Destaque visual para o valor proposto
- Call-to-action para ver a proposta completa
- Dica sobre comunicação com o freelancer

### 3. E-mail de Proposta Aceita (`proposalAccepted`)
**Quando é enviado:** Quando o cliente aceita uma proposta
**Destinatário:** Freelancer
**Assunto:** "Proposta Aceita! - [Nome do Projeto]"

**Características:**
- Design roxo com celebração
- Detalhes do projeto e valor
- Status "Aguardando Garantia"
- Lista de próximos passos
- Call-to-action para acompanhar o projeto

### 4. E-mail de Garantia Depositada (`escrowDeposited`)
**Quando é enviado:** Quando o cliente deposita a garantia e o projeto muda para "executando"
**Destinatário:** Freelancer
**Assunto:** "Garantia Confirmada - Inicie o Projeto [Nome]!"

**Características:**
- Design vermelho com foco na ação
- Banner de sucesso destacado
- Informações completas do projeto
- Valor em garantia destacado
- Lista de ações recomendadas
- Nota sobre segurança e proteção

## Implementação Técnica

### Estrutura dos Templates
Todos os templates seguem a mesma estrutura:
- HTML5 semântico
- CSS inline para compatibilidade
- Design responsivo
- Gradientes e cores da marca
- Ícones emoji para visual appeal
- Botões com hover effects

### Serviços de E-mail
Os e-mails são enviados através do `EmailService` que utiliza a coleção `mail` do Firestore, que é processada pelo Firebase Mail Trigger.

### Triggers Automáticos
- **E-mail de boas-vindas:** Enviado no `AuthService.registerUser()`
- **E-mail de proposta recebida:** Enviado no `ProjectService.createProposal()`
- **E-mail de proposta aceita:** Enviado no `ProjectService.acceptProposal()`
- **E-mail de garantia depositada:** Enviado via trigger do Firestore `onProjectStatusChanged`

## Cores e Identidade Visual

### Paleta de Cores
- **Azul (Primário):** `#2563eb` - E-mails de boas-vindas e ações gerais
- **Verde:** `#059669` - E-mails de propostas recebidas
- **Roxo:** `#7c3aed` - E-mails de propostas aceitas
- **Vermelho:** `#dc2626` - E-mails de garantia depositada

### Elementos Visuais
- Gradientes suaves
- Bordas arredondadas (8px-12px)
- Sombras sutis
- Ícones emoji para contexto
- Tipografia moderna (Segoe UI)

## Responsividade
Todos os templates são responsivos e funcionam bem em:
- Desktop (600px+)
- Tablet (400px-600px)
- Mobile (<400px)

## Segurança e Privacidade
- E-mails automáticos com aviso de não resposta
- Links para políticas de privacidade
- Informações sensíveis protegidas
- Logs de envio para auditoria

## Monitoramento
Todos os envios de e-mail incluem:
- Logs de sucesso/erro
- Tratamento de exceções
- Não falham operações principais se o e-mail falhar

## Próximos Passos
- Implementar templates para outros eventos (conclusão de projeto, disputas, etc.)
- Adicionar personalização baseada no tipo de usuário
- Implementar A/B testing para otimizar conversão
- Adicionar opções de cancelamento de inscrição 