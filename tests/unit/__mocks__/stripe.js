import { vi } from 'vitest'

export const createMockStripe = () => ({
  webhooks: {
    constructEvent: vi.fn(),
  },
  subscriptions: {
    retrieve: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
  },
  invoices: {
    retrieve: vi.fn(),
  },
  checkout: {
    sessions: {
      retrieve: vi.fn(),
    },
  },
  accounts: {
    retrieve: vi.fn(),
  },
  balances: {
    retrieve: vi.fn(),
  },
})

// Mock stripe API call functions
export const mockStripeWebhookEvent = (type, data = {}) => ({
  type,
  id: `evt_${Math.random().toString(36).substr(2, 9)}`,
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: `obj_${Math.random().toString(36).substr(2, 9)}`,
      ...data,
    },
  },
})
