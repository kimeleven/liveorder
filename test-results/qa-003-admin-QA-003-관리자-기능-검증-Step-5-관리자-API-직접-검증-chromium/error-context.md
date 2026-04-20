# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qa-003-admin.spec.ts >> QA-003: 관리자 기능 검증 >> Step 5: 관리자 API 직접 검증
- Location: e2e/qa-003-admin.spec.ts:173:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 500
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - generic [ref=e5]: ADMIN
      - navigation [ref=e6]:
        - link "대시보드" [ref=e7] [cursor=pointer]:
          - /url: /admin/dashboard
          - img [ref=e8]
          - text: 대시보드
        - link "셀러 관리" [ref=e13] [cursor=pointer]:
          - /url: /admin/sellers
          - img [ref=e14]
          - text: 셀러 관리
        - link "상품 관리" [ref=e19] [cursor=pointer]:
          - /url: /admin/products
          - img [ref=e20]
          - text: 상품 관리
        - link "주문 관리" [ref=e24] [cursor=pointer]:
          - /url: /admin/orders
          - img [ref=e25]
          - text: 주문 관리
        - link "정산 관리" [ref=e29] [cursor=pointer]:
          - /url: /admin/settlements
          - img [ref=e30]
          - text: 정산 관리
        - link "이상 거래" [ref=e33] [cursor=pointer]:
          - /url: /admin/fraud
          - img [ref=e34]
          - text: 이상 거래
      - button "로그아웃" [ref=e37]:
        - img
        - text: 로그아웃
    - generic [ref=e38]:
      - banner [ref=e39]:
        - generic [ref=e40]: 관리자 패널
      - main [ref=e41]:
        - generic [ref=e42]:
          - heading "관리자 대시보드" [level=1] [ref=e43]
          - generic [ref=e44]:
            - generic [ref=e45]:
              - generic [ref=e46]:
                - generic [ref=e47]: 승인 대기 셀러
                - img [ref=e48]
              - generic [ref=e54]: "0"
            - generic [ref=e55]:
              - generic [ref=e56]:
                - generic [ref=e57]: 총 주문
                - img [ref=e58]
              - generic [ref=e63]: "0"
            - generic [ref=e64]:
              - generic [ref=e65]:
                - generic [ref=e66]: 정산 대기
                - img [ref=e67]
              - generic [ref=e71]: "0"
            - generic [ref=e72]:
              - generic [ref=e73]:
                - generic [ref=e74]: 수수료 수입 (누적)
                - img [ref=e75]
              - generic [ref=e79]: ₩0
            - generic [ref=e80]:
              - generic [ref=e81]:
                - generic [ref=e82]: 오늘 매출
                - img [ref=e83]
              - generic [ref=e86]: ₩0
            - generic [ref=e87]:
              - generic [ref=e88]:
                - generic [ref=e89]: 이번달 매출
                - img [ref=e90]
              - generic [ref=e93]: ₩0
          - generic [ref=e94]:
            - generic [ref=e96]:
              - generic [ref=e97]: 플랫폼 매출 추이
              - generic [ref=e98]:
                - button "일별" [ref=e99]
                - button "주별" [ref=e100]
                - button "월별" [ref=e101]
            - paragraph [ref=e103]: 데이터가 없습니다.
          - generic [ref=e104]:
            - generic [ref=e105]:
              - generic [ref=e107]: 승인 대기 셀러 (0건)
              - paragraph [ref=e109]: 승인 대기 중인 셀러가 없습니다.
            - generic [ref=e110]:
              - generic [ref=e112]: 최근 주문
              - paragraph [ref=e114]: 아직 주문이 없습니다.
  - region "Notifications alt+T"
  - alert [ref=e115]
```

# Test source

```ts
  107 |     const newChecked = await firstSwitch.getAttribute('data-checked')
  108 |     const newState = newChecked !== null ? 'checked' : 'unchecked'
  109 |     console.log('토글 클릭 후 상태:', newState)
  110 | 
  111 |     // 상태가 변경되었어야 함
  112 |     expect(newState).not.toEqual(initialState)
  113 | 
  114 |     await page.screenshot({ path: 'e2e/screenshots/qa003-step3-products-toggled.png', fullPage: true })
  115 |     console.log(`✅ Step 3 PASS - Switch 토글 동작 확인 (${initialState} → ${newState})`)
  116 | 
  117 |     // 원복: 다시 클릭하여 원래 상태로
  118 |     await firstSwitch.click()
  119 |     await page.waitForTimeout(2000)
  120 |     const restoredChecked = await firstSwitch.getAttribute('data-checked')
  121 |     const restoredState = restoredChecked !== null ? 'checked' : 'unchecked'
  122 |     console.log('토글 원복 상태:', restoredState)
  123 |     expect(restoredState).toEqual(initialState)
  124 |     console.log('✅ Step 3 PASS - Switch 토글 원복 완료')
  125 |   })
  126 | 
  127 |   test('Step 4: 주문 목록 표시 확인', async ({ page }) => {
  128 |     await loginAdmin(page)
  129 |     await page.goto(`${BASE}/admin/orders`)
  130 |     await page.waitForLoadState('networkidle', { timeout: 15000 })
  131 | 
  132 |     // 주문 목록 로딩 대기
  133 |     await page.waitForTimeout(3000)
  134 | 
  135 |     const bodyText = await page.textContent('body')
  136 | 
  137 |     // 주문 관련 키워드 확인
  138 |     const hasOrderUI =
  139 |       bodyText?.includes('주문') ||
  140 |       bodyText?.includes('TRANSFER_PENDING') ||
  141 |       bodyText?.includes('송금대기') ||
  142 |       bodyText?.includes('CONFIRMED') ||
  143 |       bodyText?.includes('송금확인')
  144 |     expect(hasOrderUI).toBeTruthy()
  145 | 
  146 |     // 주문 목록 테이블 확인
  147 |     const rows = await page.locator('table tbody tr').count()
  148 |     console.log('주문 목록 행 수:', rows)
  149 | 
  150 |     // QA-001에서 생성된 주문이 있어야 함 (또는 빈 목록 메시지)
  151 |     const isEmpty = bodyText?.includes('주문이 없습니다') || rows === 0
  152 |     if (isEmpty) {
  153 |       console.log('⚠️ Step 4 WARNING - 주문 데이터가 없음 (이전 테스트 주문이 정리되었을 수 있음)')
  154 |     } else {
  155 |       console.log('✅ Step 4 PASS - 주문 목록 데이터 확인')
  156 |     }
  157 | 
  158 |     await page.screenshot({ path: 'e2e/screenshots/qa003-step4-orders.png', fullPage: true })
  159 | 
  160 |     // 상태 필터 UI가 존재하는지 확인 (MVP-011에서 추가됨)
  161 |     const hasFilter =
  162 |       bodyText?.includes('송금대기') ||
  163 |       bodyText?.includes('송금확인') ||
  164 |       (await page.locator('select, [role="combobox"]').count()) > 0
  165 |     console.log('상태 필터 UI 존재:', hasFilter)
  166 | 
  167 |     // 최소한 주문 관련 UI는 있어야 함
  168 |     expect(hasOrderUI).toBeTruthy()
  169 |     console.log('✅ Step 4 PASS - 주문 목록 페이지 정상 로드')
  170 |   })
  171 | 
  172 |   // API 직접 검증 (page.evaluate()로 브라우저 컨텍스트에서 fetch — 쿠키 자동 포함)
  173 |   test('Step 5: 관리자 API 직접 검증', async ({ page }) => {
  174 |     await loginAdmin(page)
  175 | 
  176 |     // 브라우저 컨텍스트 내에서 fetch 호출 (세션 쿠키 자동 포함)
  177 |     const results = await page.evaluate(async () => {
  178 |       async function safeFetch(url: string) {
  179 |         const res = await fetch(url)
  180 |         const text = await res.text()
  181 |         let data: Record<string, unknown> = {}
  182 |         try { data = JSON.parse(text) } catch { data = { _raw: text } }
  183 |         return { status: res.status, data }
  184 |       }
  185 | 
  186 |       const [sellers, products, orders] = await Promise.all([
  187 |         safeFetch('/api/admin/sellers?page=1&limit=10'),
  188 |         safeFetch('/api/admin/products?page=1&limit=10'),
  189 |         safeFetch('/api/admin/orders?page=1&limit=10'),
  190 |       ])
  191 |       return {
  192 |         sellers: { status: sellers.status, count: (sellers.data.data as unknown[])?.length ?? 0 },
  193 |         products: { status: products.status, count: (products.data.data as unknown[])?.length ?? 0 },
  194 |         orders: { status: orders.status, count: (orders.data.data as unknown[])?.length ?? 0, error: orders.data.error ?? orders.data._raw ?? null },
  195 |       }
  196 |     })
  197 | 
  198 |     console.log('GET /api/admin/sellers 응답:', results.sellers.status, '셀러 수:', results.sellers.count)
  199 |     expect(results.sellers.status).toBe(200)
  200 |     expect(results.sellers.count).toBeGreaterThan(0)
  201 | 
  202 |     console.log('GET /api/admin/products 응답:', results.products.status, '상품 수:', results.products.count)
  203 |     expect(results.products.status).toBe(200)
  204 |     expect(results.products.count).toBeGreaterThan(0)
  205 | 
  206 |     console.log('GET /api/admin/orders 응답:', results.orders.status, '주문 수:', results.orders.count, results.orders.error ? `에러: ${results.orders.error}` : '')
> 207 |     expect(results.orders.status).toBe(200)
      |                                   ^ Error: expect(received).toBe(expected) // Object.is equality
  208 | 
  209 |     console.log('✅ Step 5 PASS - 관리자 API 모두 정상 응답')
  210 |   })
  211 | })
  212 | 
```