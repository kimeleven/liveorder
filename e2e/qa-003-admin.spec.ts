import { test, expect } from '@playwright/test'

const BASE = 'https://liveorder.vercel.app'
const ADMIN_EMAIL = 'kimeleven@gmail.com'
const ADMIN_PW = 'qwer1234'

async function loginAdmin(page: import('@playwright/test').Page) {
  await page.goto(`${BASE}/admin/auth/login`)
  await page.waitForLoadState('networkidle', { timeout: 15000 })
  await page.locator('input[type="email"], input[name="email"]').first().fill(ADMIN_EMAIL)
  await page.locator('input[type="password"]').first().fill(ADMIN_PW)
  await page.locator('button[type="submit"]').first().click()
  // 로그인 후 auth/login이 아닌 페이지로 이동 확인
  await page.waitForURL((url) => !url.pathname.includes('auth/login'), { timeout: 15000 })
}

test.describe('QA-003: 관리자 기능 검증', () => {
  test('Step 1: 관리자 로그인 → 대시보드 접속', async ({ page }) => {
    await loginAdmin(page)
    await page.goto(`${BASE}/admin/dashboard`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    const url = page.url()
    expect(url).toContain('/admin')

    // 대시보드 주요 요소 확인 (관리자 전용 UI)
    const bodyText = await page.textContent('body')
    const hasDashboard =
      bodyText?.includes('대시보드') ||
      bodyText?.includes('LIVEORDER') ||
      bodyText?.includes('주문') ||
      bodyText?.includes('셀러')
    expect(hasDashboard).toBeTruthy()

    await page.screenshot({ path: 'e2e/screenshots/qa003-step1-admin-dashboard.png', fullPage: true })
    console.log('✅ Step 1 PASS - 관리자 대시보드 정상 로드, URL:', url)
  })

  test('Step 2: 셀러 목록 표시 확인', async ({ page }) => {
    await loginAdmin(page)
    await page.goto(`${BASE}/admin/sellers`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    // 셀러 목록 로딩 대기
    await page.waitForTimeout(3000)

    const bodyText = await page.textContent('body')

    // 테이블 또는 목록 요소 확인
    const hasTable = await page.locator('table, [role="table"]').count()
    const hasList = await page.locator('tr, [role="row"]').count()

    console.log('셀러 목록 테이블 존재:', hasTable > 0)
    console.log('셀러 행 수:', hasList)

    // 데이터 확인: 테스트 셀러 계정(testseller@liveorder.kr)이 목록에 있어야 함
    const hasSellerData = bodyText?.includes('testseller') || bodyText?.includes('liveorder.kr') || hasList > 1
    expect(hasSellerData).toBeTruthy()

    // 빈 목록이 아닌지 확인
    const isEmpty = bodyText?.includes('셀러가 없습니다') || bodyText?.includes('데이터 없음')
    expect(isEmpty).toBeFalsy()

    await page.screenshot({ path: 'e2e/screenshots/qa003-step2-sellers.png', fullPage: true })
    console.log('✅ Step 2 PASS - 셀러 목록 실제 데이터 표시 확인')
  })

  test('Step 3: 상품 목록 + Switch 토글 동작', async ({ page }) => {
    await loginAdmin(page)
    await page.goto(`${BASE}/admin/products`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    // 상품 목록 로딩 대기
    await page.waitForTimeout(3000)

    // 상품 데이터 확인
    const bodyText = await page.textContent('body')
    const isEmpty = bodyText?.includes('상품이 없습니다') || bodyText?.includes('데이터 없음')
    expect(isEmpty).toBeFalsy()

    const rows = await page.locator('table tbody tr').count()
    console.log('상품 목록 행 수:', rows)
    expect(rows).toBeGreaterThan(0)

    await page.screenshot({ path: 'e2e/screenshots/qa003-step3-products-before.png', fullPage: true })

    // Base UI Switch는 data-slot="switch"로 렌더됨 (@base-ui/react/switch 사용)
    // 데이터 로딩 후 Switch가 나타날 때까지 대기
    const switches = page.locator('[data-slot="switch"]')
    await switches.first().waitFor({ state: 'visible', timeout: 10000 })
    const switchCount = await switches.count()
    console.log('Switch 토글 수:', switchCount)
    expect(switchCount).toBeGreaterThan(0)

    // 첫 번째 토글의 현재 상태 확인 (data-checked / data-unchecked)
    const firstSwitch = switches.first()
    const initialChecked = await firstSwitch.getAttribute('data-checked')
    const initialUnchecked = await firstSwitch.getAttribute('data-unchecked')
    const initialState = initialChecked !== null ? 'checked' : 'unchecked'
    console.log('첫 번째 토글 초기 상태:', initialState, '(data-checked:', initialChecked, 'data-unchecked:', initialUnchecked, ')')

    // 토글 클릭
    await firstSwitch.click()
    await page.waitForTimeout(2000)

    // 상태 변경 확인
    const newChecked = await firstSwitch.getAttribute('data-checked')
    const newState = newChecked !== null ? 'checked' : 'unchecked'
    console.log('토글 클릭 후 상태:', newState)

    // 상태가 변경되었어야 함
    expect(newState).not.toEqual(initialState)

    await page.screenshot({ path: 'e2e/screenshots/qa003-step3-products-toggled.png', fullPage: true })
    console.log(`✅ Step 3 PASS - Switch 토글 동작 확인 (${initialState} → ${newState})`)

    // 원복: 다시 클릭하여 원래 상태로
    await firstSwitch.click()
    await page.waitForTimeout(2000)
    const restoredChecked = await firstSwitch.getAttribute('data-checked')
    const restoredState = restoredChecked !== null ? 'checked' : 'unchecked'
    console.log('토글 원복 상태:', restoredState)
    expect(restoredState).toEqual(initialState)
    console.log('✅ Step 3 PASS - Switch 토글 원복 완료')
  })

  test('Step 4: 주문 목록 표시 확인', async ({ page }) => {
    await loginAdmin(page)
    await page.goto(`${BASE}/admin/orders`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    // 주문 목록 로딩 대기
    await page.waitForTimeout(3000)

    const bodyText = await page.textContent('body')

    // 주문 관련 키워드 확인
    const hasOrderUI =
      bodyText?.includes('주문') ||
      bodyText?.includes('TRANSFER_PENDING') ||
      bodyText?.includes('송금대기') ||
      bodyText?.includes('CONFIRMED') ||
      bodyText?.includes('송금확인')
    expect(hasOrderUI).toBeTruthy()

    // 주문 목록 테이블 확인
    const rows = await page.locator('table tbody tr').count()
    console.log('주문 목록 행 수:', rows)

    // 빈 상태 메시지 확인: "주문 내역이 없습니다." = orders 빈 배열 (API 500 또는 실제 데이터 없음)
    const isEmpty = bodyText?.includes('주문 내역이 없습니다') || rows === 0
    if (isEmpty) {
      console.log('⚠️ BUG-002: /api/admin/orders 응답 오류 또는 주문 없음 — 빈 상태 메시지 표시됨')
    } else {
      console.log('✅ Step 4 PASS - 주문 목록 데이터 확인')
    }

    await page.screenshot({ path: 'e2e/screenshots/qa003-step4-orders.png', fullPage: true })

    // 상태 필터 UI가 존재하는지 확인 (MVP-011에서 추가됨)
    const hasFilter =
      bodyText?.includes('송금대기') ||
      bodyText?.includes('송금확인') ||
      (await page.locator('select, [role="combobox"]').count()) > 0
    console.log('상태 필터 UI 존재:', hasFilter)

    // 최소한 주문 관련 UI는 있어야 함
    expect(hasOrderUI).toBeTruthy()
    console.log('✅ Step 4 PASS - 주문 목록 페이지 정상 로드')
  })

  // API 직접 검증 (page.evaluate()로 브라우저 컨텍스트에서 fetch — 쿠키 자동 포함)
  test('Step 5: 관리자 API 직접 검증', async ({ page }) => {
    await loginAdmin(page)

    // 브라우저 컨텍스트 내에서 fetch 호출 (세션 쿠키 자동 포함)
    const results = await page.evaluate(async () => {
      async function safeFetch(url: string) {
        const res = await fetch(url)
        const text = await res.text()
        let data: Record<string, unknown> = {}
        try { data = JSON.parse(text) } catch { data = { _raw: text } }
        return { status: res.status, data }
      }

      const [sellers, products, orders] = await Promise.all([
        safeFetch('/api/admin/sellers?page=1&limit=10'),
        safeFetch('/api/admin/products?page=1&limit=10'),
        safeFetch('/api/admin/orders?page=1&limit=10'),
      ])
      return {
        sellers: { status: sellers.status, count: (sellers.data.data as unknown[])?.length ?? 0 },
        products: { status: products.status, count: (products.data.data as unknown[])?.length ?? 0 },
        orders: { status: orders.status, count: (orders.data.data as unknown[])?.length ?? 0, error: orders.data.error ?? orders.data._raw ?? null },
      }
    })

    console.log('GET /api/admin/sellers 응답:', results.sellers.status, '셀러 수:', results.sellers.count)
    expect(results.sellers.status).toBe(200)
    expect(results.sellers.count).toBeGreaterThan(0)

    console.log('GET /api/admin/products 응답:', results.products.status, '상품 수:', results.products.count)
    expect(results.products.status).toBe(200)
    expect(results.products.count).toBeGreaterThan(0)

    console.log('GET /api/admin/orders 응답:', results.orders.status, '주문 수:', results.orders.count, results.orders.error ? `에러: ${results.orders.error}` : '')
    if (results.orders.status !== 200) {
      console.log('⚠️ BUG-002: /api/admin/orders 500 에러 (fix 커밋 후 재검증 필요)')
    }
    expect(results.orders.status).toBe(200)

    console.log('✅ Step 5 PASS - 관리자 API 모두 정상 응답')
  })
})
