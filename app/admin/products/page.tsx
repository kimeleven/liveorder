'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AdminShell from '@/components/admin/AdminShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface ProductItem {
  id: string
  name: string
  price: number
  stock: number
  isActive: boolean
  category: string | null
  imageUrl: string | null
  createdAt: string
  seller: { id: string; name: string; email: string }
  _count: { codes: number }
}

interface Pagination {
  page: number
  totalPages: number
  total: number
  hasNext: boolean
  hasPrev: boolean
}

export default function AdminProductsPage() {
  const router = useRouter()
  const [items, setItems] = useState<ProductItem[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, totalPages: 1, total: 0, hasNext: false, hasPrev: false,
  })
  const [page, setPage] = useState(1)
  const [isActiveFilter, setIsActiveFilter] = useState<'' | 'true' | 'false'>('')
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 검색어 디바운스 300ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(q)
      setPage(1)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [q])

  const fetchProducts = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (isActiveFilter) params.set('isActive', isActiveFilter)
    if (debouncedQ) params.set('q', debouncedQ)

    fetch(`/api/admin/products?${params}`)
      .then(r => r.json())
      .then(data => {
        setItems(data.data ?? [])
        setPagination(data.pagination ?? { page: 1, totalPages: 1, total: 0, hasNext: false, hasPrev: false })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, isActiveFilter, debouncedQ])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  function handleFilterChange(value: string) {
    setIsActiveFilter(value as '' | 'true' | 'false')
    setPage(1)
  }

  async function handleToggle(productId: string, currentActive: boolean) {
    setTogglingId(productId)
    // 낙관적 업데이트
    setItems(prev => prev.map(p => p.id === productId ? { ...p, isActive: !currentActive } : p))
    try {
      await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      })
    } catch {
      // 실패 시 롤백
      setItems(prev => prev.map(p => p.id === productId ? { ...p, isActive: currentActive } : p))
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">상품 관리</h1>

        {/* 필터 */}
        <div className="flex gap-3 flex-wrap">
          <Select value={isActiveFilter || '_all'} onValueChange={v => handleFilterChange((v ?? '_all') === '_all' ? '' : (v ?? ''))}>

            <SelectTrigger className="w-36">
              <SelectValue placeholder="상태 전체" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">상태 전체</SelectItem>
              <SelectItem value="true">활성</SelectItem>
              <SelectItem value="false">비활성</SelectItem>
            </SelectContent>
          </Select>

          <Input
            className="w-64"
            placeholder="상품명 검색..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />

          <span className="self-center text-sm text-muted-foreground">
            총 {pagination.total.toLocaleString()}건
          </span>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>상품명</TableHead>
                <TableHead>셀러</TableHead>
                <TableHead>카테고리</TableHead>
                <TableHead className="text-right">가격</TableHead>
                <TableHead className="text-right">재고</TableHead>
                <TableHead className="text-right">코드수</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>등록일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-full rounded bg-muted animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    상품이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                items.map(item => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/admin/products/${item.id}`)}
                  >
                    <TableCell className="font-medium max-w-[180px] truncate">{item.name}</TableCell>
                    <TableCell>
                      <button
                        className="text-sm text-muted-foreground hover:text-primary hover:underline"
                        onClick={e => { e.stopPropagation(); router.push(`/admin/sellers/${item.seller.id}`) }}
                      >
                        {item.seller.name}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.category ?? '-'}
                    </TableCell>
                    <TableCell className="text-right">₩{item.price.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.stock.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item._count.codes.toLocaleString()}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Switch
                        checked={item.isActive}
                        disabled={togglingId === item.id}
                        onCheckedChange={() => handleToggle(item.id, item.isActive)}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* 페이지네이션 */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!pagination.hasPrev}
              onClick={() => setPage(p => p - 1)}
            >
              이전
            </Button>
            <span className="px-3 py-1 text-sm text-muted-foreground">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={!pagination.hasNext}
              onClick={() => setPage(p => p + 1)}
            >
              다음
            </Button>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
