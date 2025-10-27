import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from 'firebase/auth';
import { SerializedUserProfile } from '@/types/user';

interface AuthState {
  user: User | null;
  userProfile: SerializedUserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  userProfile: null,
  isLoading: true,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.isLoading = false;
    },
    setUserProfile: (state, action: PayloadAction<SerializedUserProfile | null>) => {
      state.userProfile = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    updateLastLogin: (state) => {
      if (state.userProfile) {
        state.userProfile.lastLogin = new Date().toISOString();
      }
    },
    logout: (state) => {
      state.user = null;
      state.userProfile = null;
      state.isAuthenticated = false;
      state.isLoading = false;
    },
  },
});

export const { setUser, setUserProfile, setLoading, updateLastLogin, logout } = authSlice.actions;
export default authSlice.reducer;
