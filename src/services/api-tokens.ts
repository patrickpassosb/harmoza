import pb from '@/lib/pocketbase/client'

export interface ApiToken {
  id: string
  name: string
  createdAt: string
  expiresAt: string | null
}

export interface CreateTokenResponse {
  id: string
  name: string
  expiresAt: string | null
  token: string
}

export interface TestTokenResponse {
  valid: boolean
  message: string
}

export async function listTokens(): Promise<ApiToken[]> {
  return pb.send('/backend/v1/api-tokens', { method: 'GET' })
}

export async function createToken(
  name: string,
  expiresInDays: number | null,
): Promise<CreateTokenResponse> {
  return pb.send('/backend/v1/api-tokens', {
    method: 'POST',
    body: JSON.stringify({ name, expiresInDays }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function revokeToken(id: string): Promise<void> {
  await pb.send(`/backend/v1/api-tokens/${id}`, { method: 'DELETE' })
}

export async function testToken(token: string): Promise<TestTokenResponse> {
  return pb.send('/backend/v1/api-tokens/test', {
    method: 'POST',
    body: JSON.stringify({ token }),
    headers: { 'Content-Type': 'application/json' },
  })
}
