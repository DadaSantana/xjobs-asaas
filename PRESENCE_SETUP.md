# Sistema de Presença em Tempo Real

Este documento explica como configurar e usar o sistema de presença em tempo real implementado no xJobs.

## 🚀 Funcionalidades

- ✅ **Presença em tempo real** usando Firestore listeners
- ✅ **Heartbeat automático** a cada 30 segundos
- ✅ **Detecção de offline/online** via eventos do browser
- ✅ **Cleanup automático** quando usuário sai
- ✅ **Otimização de performance** com memoização

## 📋 Configuração do Firestore

### 1. Regras de Segurança

Adicione as seguintes regras ao seu `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Regras para a coleção de presença
    match /presence/{userId} {
      // Usuários só podem escrever sua própria presença
      allow write: if request.auth != null && request.auth.uid == userId;
      
      // Qualquer usuário logado pode ler o status de presença de outros
      allow read: if request.auth != null;
    }
  }
}
```

### 2. Estrutura da Coleção `presence`

Cada documento na coleção `presence` tem a seguinte estrutura:

```typescript
{
  isOnline: boolean,
  lastSeen: Timestamp,
  userId: string,
  name: string,
  updatedAt: Timestamp
}
```

## 🔧 Como Usar

### 1. Hook básico

```typescript
import { usePresence } from '@/hooks/usePresence';

const MyComponent = () => {
  const { isUserOnline } = usePresence();
  
  return (
    <div>
      {isUserOnline('user123') ? 'Online' : 'Offline'}
    </div>
  );
};
```

### 2. Monitorar múltiplos usuários

```typescript
const userIds = ['user1', 'user2', 'user3'];
const { isUserOnline, getOnlineUsers, getOnlineCount } = usePresence(userIds);

console.log('Usuários online:', getOnlineUsers());
console.log('Total online:', getOnlineCount());
```

### 3. Aguardar inicialização

```typescript
const { isUserOnline, isInitialized } = usePresence(userIds);

if (!isInitialized) {
  return <div>Carregando presença...</div>;
}
```

## 🎯 Implementação no EncontreTrabalho

O sistema está implementado no componente `EncontreTrabalho.tsx`:

1. **Extração de IDs**: Os IDs dos clientes são extraídos dos projetos
2. **Hook de presença**: Monitora a presença de todos os clientes
3. **Indicador visual**: Dot verde/cinza no avatar + texto "Online"
4. **Estado de loading**: Mostra "Verificando..." enquanto carrega

```typescript
// Extrair IDs dos clientes
const clientIds = projects.map(project => project.clientId);
const { isUserOnline, isInitialized } = usePresence(clientIds);

// Obter status do cliente
const getClientStatus = (clientId: string) => {
  if (!isInitialized) {
    return {
      isOnline: false,
      label: "Verificando...",
      dotColor: "bg-gray-300 animate-pulse"
    };
  }

  const isOnline = isUserOnline(clientId);
  return {
    isOnline,
    label: isOnline ? "Online" : "Offline",
    dotColor: isOnline ? "bg-green-500" : "bg-gray-400"
  };
};
```

## ⚡ Performance

- **Memoização**: UserIds são memoizados para evitar re-renders
- **Cleanup**: Listeners são removidos automaticamente
- **Heartbeat otimizado**: Apenas quando usuário está ativo
- **Detecção de visibilidade**: Para quando usuário muda de aba

## 🔄 Eventos Monitorados

- `beforeunload`: Marca como offline ao sair
- `visibilitychange`: Pausa heartbeat quando inativo
- `online/offline`: Detecta conexão de internet
- `heartbeat`: Mantém presença ativa a cada 30s

## 🚨 Considerações

1. **Firestore costs**: Cada listener gera reads em tempo real
2. **Cleanup**: Importante remover listeners para evitar vazamentos
3. **Rate limiting**: Heartbeat limitado a 30s para reduzir custos
4. **Offline handling**: Documentos são removidos quando offline

## 🎨 Interface

### Avatar com Dot

```tsx
<div className="relative">
  <Avatar className="h-8 w-8">
    <AvatarFallback>JD</AvatarFallback>
  </Avatar>
  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
</div>
```

### Status Text

```tsx
<p className="text-xs text-gray-500">
  Cliente{isOnline ? ' • Online' : ''}
</p>
```

O sistema está totalmente funcional e pronto para uso em produção! 🎉 