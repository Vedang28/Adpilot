import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user:   null,
      token:  null,
      team:   null,
      isDemo: false,

      setAuth: (user, token, team) => set({ user, token, team, isDemo: user?.isDemo ?? false }),

      // Used by DemoLoginPage and other auto-login flows
      login: ({ token, user, team }) =>
        set({ token, user, team, isDemo: user?.isDemo ?? false }),

      logout: () => set({ user: null, token: null, team: null, isDemo: false }),
    }),
    {
      name: 'adpilot_auth',
    }
  )
);

export default useAuthStore;
