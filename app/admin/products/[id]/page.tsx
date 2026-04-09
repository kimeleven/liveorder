'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import AdminShell from '@/components/admin/AdminShell'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ArrowLeft } from 'lucide-react'

interface Code {
  id: string
  codeKey: string
  expiresAt: string | null
  maxQty: number
  usedQty: number
  isActive: boolean
  createdAt: string
}

interface ProductDetail {
  id: string
  name: string
  description: string | null
  price: number
  stock: number
  isActive: boolean
  category: string | null
  imageUrl: string | null
  createdAt: string
  seller: { id: string; name: string; email: string; phone: string }
  codes: Code[]
}

export default function AdminProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isPatching, setIsPatching] = useState(false)

  const fetchProduct = useCallback(() => {
    fetch(`/api/admin/products/${id}`)
      .then(r => { if (!r.ok) throw new Error('상품을 찾을 수 없습니다.'); return r.json() })
      .then(setProduct)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { fetchProduct() }, [fetchProduct])

  async function handleToggleActive() {
    if (!product) return
    setIsPatching(true)
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !product.isActive }),
      })
      if (!res.ok) throw new Error('상태 변경 실패')
      const updated = await res.json()
      setProduct(prev => prev ? { ...prev, isActive: updated.isActive } : prev)
      toast.success(`상품이 ${updated.isActive ? '활성화' : '비활성화'}되었습니다.`)
    } catch {
      toast.error('상태 변경에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setIsPatching(false)
    }
  }

  if (loading) {
    return (
      <AdminShell>
        <div className="p-6 space-y-6 max-w-6xl">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-muted animate-pulse rounded" />
            <div className="h-64 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </AdminShell>
    )
  }

  if (error || !product) {
    return (
      <AdminShell>
        <div className="p-8 text-destructive">{error || '상품을 찾을 수 없습니다.'}</div>
      </AdminShell>
    )
  }

  return (
    <AdminShell>
      <div className="p-6 space-y-6 max-w-6xl">
        {/* 헤더 */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/products')}>
            <ArrowLeft className="h-4 w-4 mr-1" />상품 목록
          </Button>
          <h1 className="text-xl font-bold">{product.name}</h1>
          <Badge variant={product.isActive ? 'default' : 'secondary'}>
            {product.isActive ? '활성' : '비활성'}
          </Badge>
          <div className="ml-auto">
            <Button
              size="sm"
              variant={product.isActive ? 'destructive' : 'default'}
              disabled={isPatching}
              onClick={handleToggleActive}
            >
              {isPatching ? '처리 중...' : product.isActive ? '비활성화' : '활성화'}
            </Button>
          </div>
        </div>

        {/* 2컬럼 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 좌: 상품 정보 */}
          <Card>
            <CardHeader><CardTitle className="text-base">상품 정보</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow label="셀러">
                <button
                  className="text-primary underline hover:opacity-80"
                  onClick={() => router.push(`/admin/sellers/${product.seller.id}`)}
                >
                  {product.seller.name}
                </button>
              </InfoRow>
              <InfoRow label="이메일"><span>{product.seller.email}</span></InfoRow>
              <InfoRow label="전화"><span>{product.seller.phone}</span></InfoRow>
              <InfoRow label="카테고리"><span>{product.category ?? '-'}</span></InfoRow>
              <InfoRow label="가격"><span>₩{product.price.toLocaleString()}</span></InfoRow>
              <InfoRow label="재고"><span>{product.stock.toLocaleString()}개</span></InfoRow>
              {product.description && (
                <div>
                  <span className="text-muted-foreground block mb-1">설명</span>
                  <p className="text-sm whitespace-pre-line">{product.description}</p>
                </div>
              )}
              {product.imageUrl && (
                <div>
                  <span className="text-muted-foreground block mb-1">이미지 미리보기</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="max-h-40 rounded border object-contain"
                  />
                </div>
              )}
              <InfoRow label="등록일">
                <span>{new Date(product.createdAt).toLocaleDateString('ko-KR')}</span>
              </InfoRow>
            </CardContent>
          </Card>

          {/* 우: 코드 목록 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">코드 목록 ({product.codes.length}건)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>코드</TableHead>
                    <TableHead>만료일</TableHead>
                    <TableHead className="text-right">수량</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.codes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        코드가 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    product.codes.map(code => (
                      <TableRow key={code.id} className={code.isActive ? '' : 'opacity-50'}>
                        <TableCell className="font-mono text-xs">{code.codeKey}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {code.expiresAt
                            ? new Date(code.expiresAt).toLocaleDateString('ko-KR')
                            : '무제한'}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {code.usedQty}/{code.maxQty === 0 ? '∞' : code.maxQty}
                        </TableCell>
                        <TableCell>
                          <Badge variant={code.isActive ? 'default' : 'secondary'}>
                            {code.isActive ? '활성' : '비활성'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminShell>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{children}</span>
    </div>
  )
}
