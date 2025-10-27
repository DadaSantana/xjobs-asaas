
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserPresence, PresenceStatus } from '@/types/user';

interface PresenceState {
  currentUserStatus: PresenceStatus;
  usersPresence: Record<string, UserPresence>;
  isLoading: boolean;
}

const initialState: PresenceState = {
  currentUserStatus: 'offline',
  usersPresence: {},
  isLoading: false,
};

const presenceSlice = createSlice({
  name: 'presence',
  initialState,
  reducers: {
    setCurrentUserStatus: (state, action: PayloadAction<PresenceStatus>) => {
      state.currentUserStatus = action.payload;
    },
    setUserPresence: (state, action: PayloadAction<UserPresence>) => {
      state.usersPresence[action.payload.uid] = action.payload;
    },
    removeUserPresence: (state, action: PayloadAction<string>) => {
      delete state.usersPresence[action.payload];
    },
    setPresenceLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    clearPresenceData: (state) => {
      state.usersPresence = {};
      state.currentUserStatus = 'offline';
    },
  },
});

export const {
  setCurrentUserStatus,
  setUserPresence,
  removeUserPresence,
  setPresenceLoading,
  clearPresenceData,
} = presenceSlice.actions;

export default presenceSlice.reducer;
