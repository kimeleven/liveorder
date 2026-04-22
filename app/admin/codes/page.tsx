'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AdminShell from '@/components/admin/AdminShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface CodeItem {
  id: string
  codeKey: string
  expiresAt: string
  maxQty: number
  usedQty: number
  isActive: boolean
  createdAt: string
  product: {
    id: string
    name: string
    seller: { id: string; name: string; email: string }
  }
}

interface Pagination {
  page: number
  totalPages: number
  total: number
  hasNext: boolean
  hasPrev: boolean
}

function getStatus(code: CodeItem) {
  if (!code.isActive) return { label: '중지', variant: 'secondary' as const }
  if (new Date(code.expiresAt) < new Date()) return { label: '만료', variant: 'destructive' as const }
  if (code.maxQty > 0 && code.usedQty >= code.maxQty) return { label: '소진', variant: 'outline' as const }
  return { label: '활성', variant: 'default' as const }
}

export default function AdminCodesPage() {
  const router = useRouter()
  const [items, setItems] = useState<CodeItem[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, totalPages: 1, total: 0, hasNext: false, hasPrev: false,
  })
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'inactive'>('all')
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const fetchCodes = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (debouncedQ) params.set('q', debouncedQ)

    fetch(`/api/admin/codes?${params}`)
      .then(r => r.json())
      .then(data => {
        setItems(data.data ?? [])
        setPagination(data.pagination ?? { page: 1, totalPages: 1, total: 0, hasNext: false, hasPrev: false })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, statusFilter, debouncedQ])

  useEffect(() => { fetchCodes() }, [fetchCodes])

  async function handleToggle(codeId: string, currentActive: boolean) {
    setTogglingId(codeId)
    setItems(prev => prev.map(c => c.id === codeId ? { ...c, isActive: !currentActive } : c))
    try {
      await fetch(`/api/admin/codes/${codeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      })
    } catch {
      setItems(prev => prev.map(c => c.id === codeId ? { ...c, isActive: currentActive } : c))
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">코드 관리</h1>

        <div className="flex gap-3 flex-wrap">
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v as typeof statusFilter); setPage(1) }}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="상태 전체" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">상태 전체</SelectItem>
              <SelectItem value="active">활성</SelectItem>
              <SelectItem value="expired">만료</SelectItem>
              <SelectItem value="inactive">중지</SelectItem>
            </SelectContent>
          </Select>

          <Input
            className="w-64"
            placeholder="코드키 또는 상품명 검색..."
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
                <TableHead>코드키</TableHead>
                <TableHead>상품명</TableHead>
                <TableHead>셀러</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>사용/최대</TableHead>
                <TableHead>만료일시</TableHead>
                <TableHead>등록일</TableHead>
                <TableHead>강제 비활성</TableHead>
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
                    코드가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                items.map(item => {
                  const status = getStatus(item)
                  return (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/seller/codes/${item.id}`)}
                    >
                      <TableCell className="font-mono font-semibold">{item.codeKey}</TableCell>
                      <TableCell
                        className="max-w-[160px] truncate hover:underline cursor-pointer"
                        onClick={e => { e.stopPropagation(); router.push(`/admin/products/${item.product.id}`) }}
                      >
                        {item.product.name}
                      </TableCell>
                      <TableCell>
                        <button
                          className="text-sm text-muted-foreground hover:text-primary hover:underline"
                          onClick={e => { e.stopPropagation(); router.push(`/admin/sellers/${item.product.seller.id}`) }}
                        >
                          {item.product.seller.name}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.usedQty}/{item.maxQty === 0 ? '∞' : item.maxQty}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(item.expiresAt).toLocaleString('ko-KR')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Switch
                          checked={item.isActive}
                          disabled={togglingId === item.id}
                          onCheckedChange={() => handleToggle(item.id, item.isActive)}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Card>

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
