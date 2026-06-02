import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      credits: 0,
      isAuthenticated: false,
      subscriptionActive: true,
      subscriptionExpiresAt: null,

      setAuth: (user, token) =>
        set({ user, token, credits: user?.credits ?? 0, isAuthenticated: true }),

      setCredits: (credits) => set({ credits }),

      setUser: (user) => set({ user }),

      setSubscription: (active, expiresAt) =>
        set({ subscriptionActive: active, subscriptionExpiresAt: expiresAt }),

      logout: () =>
        set({ user: null, token: null, credits: 0, isAuthenticated: false, subscriptionActive: true, subscriptionExpiresAt: null }),
    }),
    {
      name: 'bouncetr-auth',
      version: 2,   // bump this whenever a breaking store shape change is deployed
      migrate: () => ({ user: null, token: null, credits: 0, isAuthenticated: false, subscriptionActive: true, subscriptionExpiresAt: null }),
    }
  )
)
