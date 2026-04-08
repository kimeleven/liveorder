'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function KakaoPayPage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return

    fetch(`/api/kakao/session/${token}`)
      .then((r) => {
        if (r.status === 410) throw new Error('만료된 링크입니다. 카카오톡에서 다시 시도해주세요.')
        if (!r.ok) throw new Error('서버 오류가 발생했습니다.')
        return r.json()
      })
      .then((data) => {
        if (!data.valid) {
          setError(data.error || '유효하지 않은 링크입니다.')
          return
        }
        // 기존 chat 페이지와 동일한 pendingCode 형식으로 저장
        sessionStorage.setItem(
          'pendingCode',
          JSON.stringify({ code: data.code.codeKey, data })
        )
        sessionStorage.setItem('kakaoSource', 'true')
        router.replace('/chat')
      })
      .catch((e) => setError(e.message || '오류가 발생했습니다.'))
  }, [token, router])

  if (error) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center px-6 text-center space-y-4">
        <p className="text-destructive font-semibold">{error}</p>
        <a href="/" className="underline text-sm text-muted-foreground">
          처음으로 돌아가기
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 text-center space-y-4">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">결제 페이지 로딩 중...</p>
    </div>
  )
}
