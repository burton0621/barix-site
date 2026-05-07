import { vi } from 'vitest'

export const createMockResend = () => ({
  emails: {
    send: vi.fn().mockResolvedValue({ data: { id: `email_${Math.random().toString(36).substr(2, 9)}` }, error: null }),
  },
})
