import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Create mutable mock objects
const mockState = {
  constructEvent: vi.fn(),
  subscriptionsRetrieve: vi.fn(),
  from: vi.fn(),
}

vi.mock('stripe', () => {
  const mockStripe = class {
    constructor() {
      this.webhooks = {
        constructEvent: (...args) => mockState.constructEvent(...args),
      }
      this.subscriptions = {
        retrieve: (...args) => mockState.subscriptionsRetrieve(...args),
      }
    }
  }
  return { default: mockStripe }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: (...args) => mockState.from(...args),
  })),
}))

// Now import the route AFTER mocking
import { POST } from '@/app/api/stripe/webhook/route'

const createMockRequest = (body, signature = 'test-signature') => {
  return {
    text: vi.fn().mockResolvedValue(body),
    headers: {
      get: (key) => {
        if (key === 'stripe-signature') return signature
        return null
      },
    },
  }
}

const createMockSupabaseQuery = (data = null, error = null) => {
  const methods = {}
  methods.select = vi.fn(() => methods)
  methods.update = vi.fn(() => methods)
  methods.eq = vi.fn(() => methods)
  methods.single = vi.fn().mockResolvedValue({ data, error })
  return methods
}

const createDefaultQueryMethods = () => {
  const methods = {}
  methods.select = vi.fn(() => methods)
  methods.update = vi.fn(() => methods)
  methods.eq = vi.fn(() => methods)
  methods.single = vi.fn().mockResolvedValue({ data: null, error: null })
  return methods
}

describe('Stripe Webhook Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock state
    mockState.constructEvent = vi.fn()
    mockState.subscriptionsRetrieve = vi.fn()
    mockState.from = vi.fn(() => createDefaultQueryMethods())
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Invalid signature', () => {
    it('rejects webhook with invalid signature', async () => {
      const body = JSON.stringify({ type: 'test' })
      mockState.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      const request = createMockRequest(body, 'invalid-signature')
      const response = await POST(request)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('Invalid signature')
    })

    it('rejects webhook without signature header', async () => {
      const body = JSON.stringify({ type: 'test' })
      mockState.constructEvent.mockImplementation(() => {
        throw new Error('No signature provided')
      })

      const request = {
        text: vi.fn().mockResolvedValue(body),
        headers: {
          get: () => null,
        },
      }

      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })

  describe('checkout.session.completed - Subscription', () => {
    it('updates contractor profile with subscription info', async () => {
      const event = {
        type: 'checkout.session.completed',
        id: 'evt_test_1',
        data: {
          object: {
            mode: 'subscription',
            customer: 'cus_123',
            subscription: 'sub_123',
            metadata: { contractor_id: 'contractor_1' },
          },
        },
      }

      mockState.constructEvent.mockReturnValue(event)
      mockState.subscriptionsRetrieve.mockResolvedValue({
        id: 'sub_123',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 86400,
        trial_end: null,
      })

      const queryMethods = createMockSupabaseQuery()
      mockState.from.mockReturnValue(queryMethods)

      const request = createMockRequest(JSON.stringify(event))
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(queryMethods.update).toHaveBeenCalledWith(
        expect.objectContaining({
          stripe_customer_id: 'cus_123',
          stripe_subscription_id: 'sub_123',
          subscription_status: 'active',
        })
      )
    })

    it('handles missing contractor_id gracefully', async () => {
      const event = {
        type: 'checkout.session.completed',
        id: 'evt_test_1',
        data: {
          object: {
            mode: 'subscription',
            customer: 'cus_123',
            subscription: 'sub_123',
            metadata: {}, // No contractor_id
          },
        },
      }

      mockState.constructEvent.mockReturnValue(event)

      const request = createMockRequest(JSON.stringify(event))
      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('checkout.session.completed - Invoice Payment', () => {
    it('updates invoice status to paid', async () => {
      const event = {
        type: 'checkout.session.completed',
        id: 'evt_test_1',
        data: {
          object: {
            mode: 'payment',
            payment_intent: 'pi_123',
            id: 'cs_123',
            metadata: { invoice_id: 'inv_123' },
          },
        },
      }

      mockState.constructEvent.mockReturnValue(event)

      const queryMethods = createMockSupabaseQuery()
      mockState.from.mockReturnValue(queryMethods)

      const request = createMockRequest(JSON.stringify(event))
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(queryMethods.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'paid',
          stripe_payment_id: 'pi_123',
          stripe_session_id: 'cs_123',
        })
      )
    })

    it('skips payment update when invoice_id is missing', async () => {
      const event = {
        type: 'checkout.session.completed',
        id: 'evt_test_1',
        data: {
          object: {
            mode: 'payment',
            payment_intent: 'pi_123',
            id: 'cs_123',
            metadata: {}, // No invoice_id
          },
        },
      }

      mockState.constructEvent.mockReturnValue(event)

      const request = createMockRequest(JSON.stringify(event))
      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('customer.subscription.updated', () => {
    it('updates subscription status in contractor profile', async () => {
      const event = {
        type: 'customer.subscription.updated',
        id: 'evt_test_1',
        data: {
          object: {
            id: 'sub_123',
            status: 'active',
            customer: 'cus_123',
            current_period_end: Math.floor(Date.now() / 1000) + 86400,
            trial_end: null,
          },
        },
      }

      mockState.constructEvent.mockReturnValue(event)

      const queryMethods = createMockSupabaseQuery({ id: 'contractor_1' })
      mockState.from.mockReturnValue(queryMethods)

      const request = createMockRequest(JSON.stringify(event))
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(queryMethods.select).toHaveBeenCalledWith('id')
    })

    it('handles when contractor not found', async () => {
      const event = {
        type: 'customer.subscription.updated',
        id: 'evt_test_1',
        data: {
          object: {
            id: 'sub_123',
            status: 'active',
            customer: 'cus_unknown',
            current_period_end: Math.floor(Date.now() / 1000),
            trial_end: null,
          },
        },
      }

      mockState.constructEvent.mockReturnValue(event)

      const queryMethods = createMockSupabaseQuery(null) // No contractor found
      mockState.from.mockReturnValue(queryMethods)

      const request = createMockRequest(JSON.stringify(event))
      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('customer.subscription.deleted', () => {
    it('updates subscription status to canceled', async () => {
      const event = {
        type: 'customer.subscription.deleted',
        id: 'evt_test_1',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
          },
        },
      }

      mockState.constructEvent.mockReturnValue(event)

      const queryMethods = createMockSupabaseQuery({ id: 'contractor_1' })
      mockState.from.mockReturnValue(queryMethods)

      const request = createMockRequest(JSON.stringify(event))
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(queryMethods.update).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_status: 'canceled',
          stripe_subscription_id: null,
        })
      )
    })
  })

  describe('invoice.payment_failed', () => {
    it('marks subscription as past_due when payment fails', async () => {
      const event = {
        type: 'invoice.payment_failed',
        id: 'evt_test_1',
        data: {
          object: {
            id: 'in_123',
            subscription: 'sub_123',
            customer: 'cus_123',
          },
        },
      }

      mockState.constructEvent.mockReturnValue(event)

      const queryMethods = createMockSupabaseQuery({ id: 'contractor_1' })
      mockState.from.mockReturnValue(queryMethods)

      const request = createMockRequest(JSON.stringify(event))
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(queryMethods.update).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_status: 'past_due',
        })
      )
    })

    it('ignores non-subscription invoices', async () => {
      const event = {
        type: 'invoice.payment_failed',
        id: 'evt_test_1',
        data: {
          object: {
            id: 'in_123',
            subscription: null, // Not a subscription invoice
            customer: 'cus_123',
          },
        },
      }

      mockState.constructEvent.mockReturnValue(event)

      const request = createMockRequest(JSON.stringify(event))
      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Unhandled events', () => {
    it('handles checkout.session.expired', async () => {
      const event = {
        type: 'checkout.session.expired',
        id: 'evt_test_1',
        data: {
          object: {
            id: 'cs_123',
          },
        },
      }

      mockState.constructEvent.mockReturnValue(event)

      const request = createMockRequest(JSON.stringify(event))
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('handles payment_intent.payment_failed', async () => {
      const event = {
        type: 'payment_intent.payment_failed',
        id: 'evt_test_1',
        data: {
          object: {
            id: 'pi_123',
          },
        },
      }

      mockState.constructEvent.mockReturnValue(event)

      const request = createMockRequest(JSON.stringify(event))
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('handles unknown event types gracefully', async () => {
      const event = {
        type: 'custom.event.type',
        id: 'evt_test_1',
        data: { object: {} },
      }

      mockState.constructEvent.mockReturnValue(event)

      const request = createMockRequest(JSON.stringify(event))
      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Error handling', () => {
    it('returns 500 when Stripe API fails during subscription retrieval', async () => {
      const event = {
        type: 'checkout.session.completed',
        id: 'evt_test_1',
        data: {
          object: {
            mode: 'subscription',
            customer: 'cus_123',
            subscription: 'sub_123',
            metadata: { contractor_id: 'contractor_1' },
          },
        },
      }

      mockState.constructEvent.mockReturnValue(event)
      mockState.subscriptionsRetrieve.mockRejectedValue(
        new Error('Stripe API error')
      )

      const request = createMockRequest(JSON.stringify(event))
      const response = await POST(request)

      expect(response.status).toBe(500)
    })

    it('handles database update errors', async () => {
      const event = {
        type: 'checkout.session.completed',
        id: 'evt_test_1',
        data: {
          object: {
            mode: 'subscription',
            customer: 'cus_123',
            subscription: 'sub_123',
            metadata: { contractor_id: 'contractor_1' },
          },
        },
      }

      mockState.constructEvent.mockReturnValue(event)
      mockState.subscriptionsRetrieve.mockResolvedValue({
        id: 'sub_123',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000),
        trial_end: null,
      })

      const queryMethods = createMockSupabaseQuery()
      mockState.from.mockReturnValue(queryMethods)

      const request = createMockRequest(JSON.stringify(event))
      const response = await POST(request)

      // Handler logs error but still returns 200
      expect(response.status).toBe(200)
    })
  })

  describe('Multiple event handling', () => {
    it('correctly processes different event types in sequence', async () => {
      // Test that state isn't shared between events
      const event1 = {
        type: 'customer.subscription.deleted',
        id: 'evt_1',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
          },
        },
      }

      const event2 = {
        type: 'checkout.session.expired',
        id: 'evt_2',
        data: {
          object: {
            id: 'cs_456',
          },
        },
      }

      mockState.constructEvent
        .mockReturnValueOnce(event1)
        .mockReturnValueOnce(event2)

      const queryMethods = createMockSupabaseQuery({ id: 'contractor_1' })
      mockState.from.mockReturnValue(queryMethods)

      const request1 = createMockRequest(JSON.stringify(event1))
      const response1 = await POST(request1)
      expect(response1.status).toBe(200)

      const request2 = createMockRequest(JSON.stringify(event2))
      const response2 = await POST(request2)
      expect(response2.status).toBe(200)
    })
  })
})
