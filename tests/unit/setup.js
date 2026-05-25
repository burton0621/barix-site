// Mock next/server exports for API route tests
import { vi } from 'vitest'

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data, init) => ({
      status: init?.status || 200,
      statusText: 'OK',
      json: async () => data,
      headers: new Map(),
      ...init,
    }),
    redirect: (url) => ({
      status: 307,
      headers: { location: url },
    }),
  },
}))
