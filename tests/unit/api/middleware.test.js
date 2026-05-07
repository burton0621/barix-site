import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  checkRateLimit,
  apiError,
  apiSuccess,
  parseBody,
  validateRequired,
} from '@/lib/api/middleware'

describe('checkRateLimit', () => {
  let testCounter = 0

  it('allows request when under limit', () => {
    const request = new Request('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': `192.168.1.${++testCounter}` },
    })

    const result = checkRateLimit(request, { limit: 5, windowMs: 60000 })
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4) // 5 limit - 1 used
  })

  it('increments remaining count with multiple requests', () => {
    const request = new Request('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': `192.168.1.${++testCounter}` },
    })

    const result1 = checkRateLimit(request, { limit: 5, windowMs: 60000 })
    expect(result1.remaining).toBe(4)

    const result2 = checkRateLimit(request, { limit: 5, windowMs: 60000 })
    expect(result2.remaining).toBe(3)

    const result3 = checkRateLimit(request, { limit: 5, windowMs: 60000 })
    expect(result3.remaining).toBe(2)
  })

  it('rejects request when limit exceeded', () => {
    const request = new Request('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': `192.168.1.${++testCounter}` },
    })

    // Hit the limit (3 requests with limit of 3)
    checkRateLimit(request, { limit: 3, windowMs: 60000 })
    checkRateLimit(request, { limit: 3, windowMs: 60000 })
    checkRateLimit(request, { limit: 3, windowMs: 60000 })

    const result = checkRateLimit(request, { limit: 3, windowMs: 60000 })
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfter).toBeDefined()
  })

  it('returns retryAfter time when rate limited', () => {
    const request = new Request('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': `192.168.1.${++testCounter}` },
    })

    const limit = 1
    checkRateLimit(request, { limit, windowMs: 60000 })
    const result = checkRateLimit(request, { limit, windowMs: 60000 })

    expect(result.retryAfter).toBeGreaterThan(0)
    expect(result.retryAfter).toBeLessThanOrEqual(60) // Less than or equal to window
  })

  it('distinguishes between different IPs', () => {
    const request1 = new Request('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': `192.168.1.${++testCounter}` },
    })

    const request2 = new Request('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': `192.168.1.${++testCounter}` },
    })

    checkRateLimit(request1, { limit: 2, windowMs: 60000 })
    checkRateLimit(request1, { limit: 2, windowMs: 60000 })

    // request2 should have full quota
    const result = checkRateLimit(request2, { limit: 2, windowMs: 60000 })
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(1)
  })

  it('handles missing x-forwarded-for header', () => {
    const request = new Request('http://localhost:3000/api/test')

    const result = checkRateLimit(request, { limit: 5, windowMs: 60000 })
    expect(result.allowed).toBe(true)
  })

  it('uses first IP when x-forwarded-for has multiple values', () => {
    const request = new Request('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': `192.168.1.${++testCounter}, 192.168.1.99` },
    })

    checkRateLimit(request, { limit: 1, windowMs: 60000 })
    const result = checkRateLimit(request, { limit: 1, windowMs: 60000 })

    // Should be limited because it's the same first IP
    expect(result.allowed).toBe(false)
  })

  it('applies higher limit for webhook requests', () => {
    const request = new Request('http://localhost:3000/api/stripe/webhook', {
      headers: {
        'x-forwarded-for': `192.168.1.${++testCounter}`,
        'stripe-signature': 't=123,v1=abc',
      },
    })

    const limit = 10
    let result
    // Hit the normal limit (10), but webhook limit is 100
    for (let i = 0; i < 12; i++) {
      result = checkRateLimit(request, { limit, windowMs: 60000 })
    }

    // Should still be allowed because webhook limit is 100
    expect(result.allowed).toBe(true)
  })

  it('resets count after window expires', (done) => {
    const request = new Request('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': `192.168.1.${++testCounter}` },
    })

    checkRateLimit(request, { limit: 1, windowMs: 100 })
    let result = checkRateLimit(request, { limit: 1, windowMs: 100 })
    expect(result.allowed).toBe(false)

    // Wait for window to expire
    setTimeout(() => {
      result = checkRateLimit(request, { limit: 1, windowMs: 100 })
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(0)
      done()
    }, 150)
  })

  it('uses default values when options not provided', () => {
    const request = new Request('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': `192.168.1.${++testCounter}` },
    })

    const result = checkRateLimit(request)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(99) // 100 default limit - 1
  })
})

describe('apiError', () => {
  it('returns error response with default 500 status', () => {
    const response = apiError('Internal error')
    expect(response.status).toBe(500)
  })

  it('returns error response with custom status', () => {
    const response = apiError('Not found', 404)
    expect(response.status).toBe(404)
  })

  it('includes error message in response body', async () => {
    const response = apiError('Something went wrong', 400)
    const json = await response.json()
    expect(json.error).toBe('Something went wrong')
  })

  it('includes details when provided', async () => {
    const details = { field: 'email', message: 'Invalid format' }
    const response = apiError('Validation failed', 400, details)
    const json = await response.json()
    expect(json.details).toEqual(details)
  })

  it('does not include details when not provided', async () => {
    const response = apiError('Error', 500)
    const json = await response.json()
    expect(json.details).toBeUndefined()
  })

  it('handles various status codes', () => {
    const statuses = [400, 401, 403, 404, 500, 503]
    statuses.forEach(status => {
      const response = apiError('Error', status)
      expect(response.status).toBe(status)
    })
  })
})

describe('apiSuccess', () => {
  it('returns success response with default 200 status', () => {
    const response = apiSuccess({ message: 'ok' })
    expect(response.status).toBe(200)
  })

  it('returns success response with custom status', () => {
    const response = apiSuccess({ id: 1 }, 201)
    expect(response.status).toBe(201)
  })

  it('includes data in response body', async () => {
    const data = { user: { id: 1, name: 'John' } }
    const response = apiSuccess(data)
    const json = await response.json()
    expect(json).toEqual(data)
  })

  it('handles array data', async () => {
    const data = [{ id: 1 }, { id: 2 }]
    const response = apiSuccess(data)
    const json = await response.json()
    expect(json).toEqual(data)
  })

  it('handles primitive values', async () => {
    const response = apiSuccess({ count: 42 })
    const json = await response.json()
    expect(json.count).toBe(42)
  })

  it('handles 201 Created status', () => {
    const response = apiSuccess({ id: 'new-id' }, 201)
    expect(response.status).toBe(201)
  })

  it('handles 204 No Content status', () => {
    const response = apiSuccess({}, 204)
    expect(response.status).toBe(204)
  })
})

describe('parseBody', () => {
  it('parses valid JSON body', async () => {
    const body = JSON.stringify({ email: 'test@example.com', password: '123' })
    const request = new Request('http://localhost:3000/api/test', {
      method: 'POST',
      body,
    })

    const { data, error } = await parseBody(request)
    expect(error).toBeNull()
    expect(data).toEqual({ email: 'test@example.com', password: '123' })
  })

  it('returns error for invalid JSON', async () => {
    const request = new Request('http://localhost:3000/api/test', {
      method: 'POST',
      body: 'not json at all',
    })

    const { data, error } = await parseBody(request)
    expect(data).toBeNull()
    expect(error).toBeDefined()
  })

  it('parses empty object', async () => {
    const request = new Request('http://localhost:3000/api/test', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const { data, error } = await parseBody(request)
    expect(error).toBeNull()
    expect(data).toEqual({})
  })

  it('parses array', async () => {
    const body = JSON.stringify([1, 2, 3])
    const request = new Request('http://localhost:3000/api/test', {
      method: 'POST',
      body,
    })

    const { data, error } = await parseBody(request)
    expect(error).toBeNull()
    expect(data).toEqual([1, 2, 3])
  })

  it('parses nested objects', async () => {
    const nested = { user: { profile: { name: 'John' } } }
    const request = new Request('http://localhost:3000/api/test', {
      method: 'POST',
      body: JSON.stringify(nested),
    })

    const { data, error } = await parseBody(request)
    expect(error).toBeNull()
    expect(data).toEqual(nested)
  })

  it('parses boolean and null values', async () => {
    const body = JSON.stringify({ active: true, deleted: false, meta: null })
    const request = new Request('http://localhost:3000/api/test', {
      method: 'POST',
      body,
    })

    const { data, error } = await parseBody(request)
    expect(error).toBeNull()
    expect(data.active).toBe(true)
    expect(data.deleted).toBe(false)
    expect(data.meta).toBeNull()
  })

  it('handles incomplete JSON', async () => {
    const request = new Request('http://localhost:3000/api/test', {
      method: 'POST',
      body: '{"incomplete": ',
    })

    const { data, error } = await parseBody(request)
    expect(data).toBeNull()
    expect(error).toBeDefined()
  })
})

describe('validateRequired', () => {
  it('returns empty array when all fields present', () => {
    const data = { email: 'test@example.com', password: 'secret' }
    const missing = validateRequired(data, ['email', 'password'])
    expect(missing).toEqual([])
  })

  it('detects missing fields', () => {
    const data = { email: 'test@example.com' }
    const missing = validateRequired(data, ['email', 'password'])
    expect(missing).toContain('password')
  })

  it('detects multiple missing fields', () => {
    const data = { email: 'test@example.com' }
    const missing = validateRequired(data, ['email', 'password', 'name'])
    expect(missing).toEqual(['password', 'name'])
  })

  it('treats empty string as missing', () => {
    const data = { email: '', password: 'secret' }
    const missing = validateRequired(data, ['email', 'password'])
    expect(missing).toContain('email')
  })

  it('treats null as missing', () => {
    const data = { email: null, password: 'secret' }
    const missing = validateRequired(data, ['email', 'password'])
    expect(missing).toContain('email')
  })

  it('treats undefined as missing', () => {
    const data = { password: 'secret' }
    const missing = validateRequired(data, ['email', 'password'])
    expect(missing).toContain('email')
  })

  it('allows zero as valid value', () => {
    const data = { count: 0 }
    const missing = validateRequired(data, ['count'])
    expect(missing).toEqual([])
  })

  it('allows false as valid value', () => {
    const data = { active: false }
    const missing = validateRequired(data, ['active'])
    expect(missing).toEqual([])
  })

  it('handles null data', () => {
    const missing = validateRequired(null, ['email', 'password'])
    expect(missing).toEqual(['email', 'password'])
  })

  it('handles undefined data', () => {
    const missing = validateRequired(undefined, ['email'])
    expect(missing).toEqual(['email'])
  })

  it('handles non-object data', () => {
    const missing = validateRequired('string', ['field'])
    expect(missing).toEqual(['field'])
  })

  it('handles empty fields array', () => {
    const data = { email: 'test@example.com' }
    const missing = validateRequired(data, [])
    expect(missing).toEqual([])
  })

  it('returns fields in order', () => {
    const data = {}
    const fields = ['name', 'email', 'password', 'phone']
    const missing = validateRequired(data, fields)
    expect(missing).toEqual(fields)
  })
})
