import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const secretHeader = request.headers.get('x-pabbas-ai-secret')?.trim()
  const expectedSecret = process.env.PABBAS_AI_WEBHOOK_SECRET?.trim()

  if (!expectedSecret || secretHeader !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { query } = body

  const adminClient = createAdminClient()

  // Simple RAG implementation: fetch all info and let AI decide, or search if query provided
  // Since info is small, returning all verified info is efficient and prevents hallucination
  const { data: info, error } = await adminClient
    .from('restaurant_info')
    .select('info_key, info_value')

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch restaurant info' }, { status: 500 })
  }

  return NextResponse.json({ info })
}
