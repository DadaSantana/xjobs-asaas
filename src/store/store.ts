
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer from './authSlice';
import presenceReducer from './presenceSlice';

// Configuração do persist para auth
const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['userProfile'], // Só persistir o userProfile, não o user do Firebase
};

// Configuração do persist para presence
const presencePersistConfig = {
  key: 'presence',
  storage,
  whitelist: ['usersPresence'],
};

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);
const persistedPresenceReducer = persistReducer(presencePersistConfig, presenceReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    presence: persistedPresenceReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      immutableCheck: {
        ignoredPaths: ['auth.user', 'auth.userProfile', 'presence.usersPresence'],
      },
      serializableCheck: {
        ignoredActions: [
          'auth/setUser',
          'auth/setUserProfile',
          'presence/setUserPresence',
          'persist/PERSIST',
          'persist/REHYDRATE',
        ],
        ignoredPaths: [
          'auth.user',
          'auth.userProfile',
          'presence.usersPresence',
        ],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
