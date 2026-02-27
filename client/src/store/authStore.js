import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      team: null,

      setAuth: (user, token, team) => set({ user, token, team }),

      logout: () => set({ user: null, token: null, team: null }),
    }),
    {
      name: 'adpilot_auth',
    }
  )
);

export default useAuthStore;
