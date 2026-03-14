import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    unsubscribedEmail: {
      findMany: vi.fn(),
    },
  },
}));

describe('GET /api/unsubscribed', () => {
  const SECRET = 'test-secret';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_SECRET = SECRET;
  });

  it('returns 401 if secret is missing', async () => {
    const request = new Request('http://localhost/api/unsubscribed');
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('returns 401 if secret is incorrect', async () => {
    const request = new Request('http://localhost/api/unsubscribed?secret=wrong');
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('returns emails if secret is correct', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const mockEmails = [
      { email: 'test1@example.com', source: 'link', createdAt: now },
      { email: 'test2@example.com', source: 'link', createdAt: now },
    ];
    (prisma.unsubscribedEmail.findMany as any).mockResolvedValue(mockEmails);

    const request = new Request(`http://localhost/api/unsubscribed?secret=${SECRET}`);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toEqual([
      { email: 'test1@example.com', source: 'link', timestamp: now.toISOString() },
      { email: 'test2@example.com', source: 'link', timestamp: now.toISOString() },
    ]);
    expect(data.count).toBe(2);
  });
});
