import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: '인증 실패' }, { status: 401 })
    }
  }

  try {
    const result = await prisma.kakaoPaySession.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    })

    return NextResponse.json({
      ok: true,
      deleted: result.count,
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    console.error('[kakao-session-cleanup] 실패:', e)
    return NextResponse.json({ error: '정리 실패' }, { status: 500 })
  }
}
