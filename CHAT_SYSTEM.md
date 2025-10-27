# Sistema de Chat em Tempo Real

Este documento explica como configurar e usar o sistema de chat em tempo real implementado no xJobs.

## 🚀 Funcionalidades

- ✅ **Chat em tempo real** entre freelancers e clientes
- ✅ **Auto-criação de chats** baseados em projetos
- ✅ **Mensagens instantâneas** via Firestore listeners
- ✅ **Contador de mensagens não lidas**
- ✅ **Interface moderna** com scroll automático
- ✅ **Segurança** com regras do Firestore

## 📋 Estrutura do Sistema

### 1. Tipos de Dados

#### Chat
```typescript
interface Chat {
  id: string;
  projectId: string;
  projectTitle: string;
  clientId: string;
  clientName: string;
  freelancerId: string;
  freelancerName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  isActive: boolean;
  unreadCount: {
    client: number;
    freelancer: number;
  };
}
```

#### Mensagem
```typescript
interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderType: 'client' | 'freelancer';
  content: string;
  timestamp: Timestamp;
  readBy: string[];
  isEdited?: boolean;
  editedAt?: Timestamp;
}
```

### 2. Estrutura do Firestore

```
/chats/{chatId}
  - projectId: string
  - projectTitle: string
  - clientId: string
  - clientName: string
  - freelancerId: string
  - freelancerName: string
  - createdAt: Timestamp
  - updatedAt: Timestamp
  - lastMessage: string
  - lastMessageAt: Timestamp
  - isActive: boolean
  - unreadCount: object
  
  /messages/{messageId}
    - chatId: string
    - senderId: string
    - senderName: string
    - senderType: string
    - content: string
    - timestamp: Timestamp
    - readBy: array
```

## 🔧 Como Funciona

### 1. Criação Automática de Chat

Quando um freelancer clica em "Enviar mensagem":

1. O sistema verifica se já existe um chat para esse projeto + freelancer
2. Se não existir, cria um novo chat automaticamente
3. Abre o modal de chat para começar a conversa

```typescript
const chatData: CreateChatData = {
  projectId: project.id,
  projectTitle: project.title,
  clientId: project.clientId,
  clientName: project.clientName,
  freelancerId: userProfile.uid,
  freelancerName: userProfile.name
};

const chatId = await ChatService.getOrCreateChat(chatData);
```

### 2. Envio de Mensagens

```typescript
await ChatService.sendMessage(
  userProfile.uid,
  userProfile.name,
  userType, // 'client' ou 'freelancer'
  {
    chatId: chat.id,
    content: newMessage
  }
);
```

### 3. Mensagens em Tempo Real

```typescript
const unsubscribe = ChatService.subscribeToMessages(chatId, (messages) => {
  setMessages(messages);
});
```

## 🎨 Componentes

### 1. ChatModal

Modal principal do chat com:
- Header com avatar e nome do participante
- Área de mensagens com scroll automático
- Campo de input com envio via Enter
- Estados de loading e erro

### 2. Integração no EncontreTrabalho

- Botão "Enviar mensagem" em cada card de projeto
- Estado para controlar abertura do modal
- Integração com sistema de presença (dot online)

## 🔐 Segurança (Firestore Rules)

```javascript
// Regras para chats
match /chats/{chatId} {
  // Participantes podem ler e escrever
  allow read, write: if request.auth != null && 
    (request.auth.uid == resource.data.clientId || 
     request.auth.uid == resource.data.freelancerId);
  
  // Mensagens dentro do chat
  match /messages/{messageId} {
    // Participantes podem ler mensagens
    allow read: if request.auth != null && 
      (request.auth.uid == get(/databases/$(database)/documents/chats/$(chatId)).data.clientId || 
       request.auth.uid == get(/databases/$(database)/documents/chats/$(chatId)).data.freelancerId);
    
    // Participantes podem criar mensagens
    allow create: if request.auth != null && 
      request.auth.uid == request.resource.data.senderId;
  }
}
```

## 📱 Interface do Usuário

### 1. Card do Projeto
- Avatar do cliente com indicador de presença
- Botão "Enviar mensagem" destacado
- Informações do projeto como contexto

### 2. Modal de Chat
- **Header**: Avatar + nome + projeto
- **Mensagens**: Balões diferenciados (azul = eu, cinza = outro)
- **Input**: Campo + botão de envio
- **Timestamps**: Hora ou data/hora se for dia diferente

### 3. Estados Visuais
- **Loading**: Spinner ao carregar chat
- **Vazio**: Mensagem de incentivo
- **Enviando**: Botão desabilitado
- **Scroll**: Automático para última mensagem

## 🚀 Fluxo Completo

1. **Freelancer** vê projeto interessante
2. **Clica** em "Enviar mensagem" no card
3. **Sistema** cria/abre chat automaticamente
4. **Modal** abre com interface limpa
5. **Conversa** acontece em tempo real
6. **Notificações** via contador de não lidas
7. **Persistência** total no Firestore

## ⚡ Performance

- **Listeners otimizados**: Apenas mensagens do chat ativo
- **Cleanup automático**: Remove listeners ao fechar
- **Subcoleções**: Mensagens organizadas por chat
- **Índices**: Ordenação otimizada por timestamp

## 🔄 Próximas Melhorias

- [ ] Notificações push
- [ ] Indicadores de "digitando..."
- [ ] Anexos de arquivos
- [ ] Histórico de chats
- [ ] Busca em mensagens
- [ ] Mensagens offline

## 📞 Uso no Código

### Abrir Chat
```typescript
const handleOpenChat = (project: Project) => {
  setSelectedChatProject(project);
  setIsChatModalOpen(true);
};
```

### Modal
```tsx
<ChatModal
  isOpen={isChatModalOpen}
  onClose={handleCloseChatModal}
  project={selectedChatProject}
/>
```

O sistema está **totalmente funcional** e pronto para comunicação em tempo real! 🎉💬 