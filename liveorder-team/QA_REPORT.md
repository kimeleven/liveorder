# LIVEORDER QA 리포트

> 최종 업데이트: 2026-04-02
> QA 단계: Phase 1 MVP — 기능 완성도 검증

---

## 핵심 플로우 상태

| 단계 | 플로우 | 상태 | 비고 |
|------|--------|------|------|
| SELLER | 회원가입 → 사업자 인증 | ✅ | 관리자 승인 후 APPROVED 전환 |
| SELLER | 상품 등록 → 코드 발급 | ✅ | PENDING 상태 시 차단 (403) |
| SELLER | 코드 API 보안 | ✅ | `/api/seller/codes`로 이동 완료 |
| SELLER | 상품 수정/삭제 | ✅ | Soft delete, `/api/seller/products/[id]` |
| BUYER | 코드 입력 → 상품 확인 | ✅ | 랜딩 + 채팅 플로우 |
| BUYER | 결제 (PortOne) | ✅ | 서버 검증 완료 |
| BUYER | 배송지 입력 + 개인정보 동의 | ✅ | 체크박스 미체크 시 제출 불가 |
| BUYER | 주문 조회 (비회원) | ✅ | 전화번호 + 주문번호 |
| SELLER | 주문 확인 → 배송지 CSV | ✅ | CSV 다운로드 |
| SELLER | 운송장 등록 | ✅ | Dialog UI, PAID/SHIPPING 상태 |
| SELLER | 배송완료 상태 (DELIVERED) | ✅ | enum + 마이그레이션 완료 |
| SELLER | 정산 조회 | ✅ | 목록 + 필터 + 합계 |
| ADMIN | 셀러 승인/거부/정지 | ✅ | 감사 로그 포함 |
| ADMIN | 정산 처리 (크론) | ✅ | D+3 자동 정산 |

---

## 잔여 버그 / 이슈 목록

### P1 — 이번 스프린트 내 처리

| # | 이슈 | 파일 | 상세 |
|---|------|------|------|
| B-01 | 상품 이미지 업로드 미구현 | `app/seller/products/new/page.tsx` | `imageUrl` DB 필드 있으나 업로드 없음. ProductCard에도 이미지 미표시 |
| B-02 | debug 엔드포인트 프로덕션 노출 | `app/api/debug/route.ts` | DB 연결 테스트용. 배포 전 반드시 제거 또는 비활성화 |

### P2 — 다음 스프린트

| # | 이슈 | 파일 | 상세 |
|---|------|------|------|
| B-03 | 셀러 정산 상세 없음 | `app/seller/settlements/page.tsx` | 목록은 있으나 정산 건별 포함 주문 내역 없음 |
| B-04 | 환불 처리 미구현 | `app/admin/` | 관리자 환불 UI 없음. 현재 수동 처리 |
| B-05 | 구매자 채팅 네트워크 오류 재시도 | `app/(buyer)/chat/page.tsx` | 오류 시 재시도 버튼 없음 |
| B-06 | 결제 완료 후 재입력 버튼 없음 | `app/(buyer)/chat/page.tsx` | "새 코드 입력하기" 버튼 미구현 |

### P3 — MVP 이후

| # | 이슈 | 상세 |
|---|------|------|
| B-07 | Redis 캐싱 미구현 | 기획서 명시, MVP 이후 고려 |
| B-08 | 이메일 알림 없음 | 주문 접수, 정산 완료 알림 |
| B-09 | 택배사 API 배송 추적 없음 | 수동 운송장 입력만 가능 |
| B-10 | 셀러 대시보드 차트 없음 | 코드별 주문 수 바 차트 |

---

## 기술 부채

| 항목 | 우선순위 | 상태 |
|------|----------|------|
| `app/api/debug/route.ts` 제거 | HIGH (배포 전) | 미처리 |
| `.env.example` PortOne 변수 추가 | MEDIUM | 미처리 |
| buyer-store 타입 안전성 | LOW | 미처리 |
| package-lock.json 정리 | LOW | 미처리 |

---

## 검증 필요 항목 (수동 QA)

1. **결제 플로우:** PortOne 실제 결제창 호출 → 서버 검증 → 주문 생성
2. **운송장 등록:** 주문 PAID 상태 → 운송장 Dialog → 제출 → SHIPPING 전환 확인
3. **관리자 승인:** 셀러 회원가입 → 관리자 로그인 → 승인 → 셀러 대시보드 PENDING 배너 사라짐
4. **정산 크론:** Vercel Cron 설정 확인 (`vercel.json` 또는 `app/api/cron/settlements`)
5. **미들웨어 인증:** 비로그인 상태에서 `/seller/dashboard` 직접 접근 시 로그인으로 리다이렉트

---

## 다음 QA 사이클 기준

Phase 1 MVP 배포 가능 기준:
- [x] 핵심 플로우 14단계 모두 ✅
- [ ] B-02 (debug 엔드포인트) 제거
- [ ] B-01 (이미지) 없어도 배포 가능 — 텍스트 상품명으로 운영 가능
- [ ] 수동 QA 5개 항목 통과
