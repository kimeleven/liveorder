# 카카오 오픈빌더 스킬 서버 연동 가이드

> 대상: LiveOrder 운영팀 (채널 관리자)
> 최종 업데이트: 2026-04-09

---

## 개요

LiveOrder v3는 카카오 오픈빌더를 통해 구매자가 카카오톡에서 직접 주문·결제를 진행할 수 있습니다.

```
구매자 카카오톡 메시지 → 오픈빌더 봇 → LiveOrder 스킬 서버 → 상품 카드 응답
```

---

## 1. 스킬 서버 정보

| 항목 | 값 |
|------|-----|
| 엔드포인트 | `https://liveorder.vercel.app/api/kakao/webhook` |
| 메서드 | POST |
| 타임아웃 | 5초 (카카오 오픈빌더 제한) |
| 봇 ID | `69d6729b9fac321ddc6b5d64` |

---

## 2. 오픈빌더 스킬 서버 등록

### 2.1 오픈빌더 접속

1. [카카오 오픈빌더](https://obi.kakao.com) 접속
2. 봇 선택: **liveorder** (ID: `69d6729b9fac321ddc6b5d64`)

### 2.2 스킬 추가

1. 좌측 메뉴 **스킬** → **스킬 추가**
2. 설정값:

| 필드 | 값 |
|------|-----|
| 스킬명 | liveorder-skill |
| URL | `https://liveorder.vercel.app/api/kakao/webhook` |
| 설명 | 상품 코드로 상품 조회 및 결제 링크 생성 |

3. **저장** 후 **기본 스킬로 설정**

### 2.3 폴백 블록 설정

1. **시나리오** → **기본 시나리오** → **폴백 블록**
2. 응답 설정: **스킬 데이터 사용** → `liveorder-skill` 선택
3. **저장**

---

## 3. 동작 방식

### 요청 형식 (카카오 → LiveOrder)

```json
{
  "userRequest": {
    "utterance": "ABC-1234-ABCD",
    "user": { "id": "kakao-user-id" }
  }
}
```

### 응답 형식 (성공 — commerceCard)

```json
{
  "version": "2.0",
  "template": {
    "outputs": [{
      "commerceCard": {
        "description": "상품명",
        "price": 10000,
        "currency": "won",
        "thumbnails": [{
          "imageUrl": "상품 이미지 URL",
          "link": { "web": "https://liveorder.vercel.app/kakao/TOKEN" }
        }],
        "profile": {
          "thumbnail": "https://liveorder.vercel.app/og-image.png",
          "nickName": "판매자 상호명"
        },
        "buttons": [{
          "label": "결제하기",
          "action": "webLink",
          "webLinkUrl": "https://liveorder.vercel.app/kakao/TOKEN"
        }]
      }
    }]
  }
}
```

### 응답 형식 (실패 — simpleText)

```json
{
  "version": "2.0",
  "template": {
    "outputs": [{ "simpleText": { "text": "존재하지 않는 코드입니다." } }]
  }
}
```

---

## 4. 코드 유효성 검증 순서

| 순서 | 조건 | 실패 메시지 |
|------|------|------------|
| 1 | 코드 패턴 불일치 | `상품 코드를 입력해주세요.\n예: ABC-1234-ABCD` |
| 2 | 코드 미존재 | `존재하지 않는 코드입니다.` |
| 3 | 비활성 코드 | `비활성화된 코드입니다.` |
| 4 | 만료된 코드 | `만료된 코드입니다.` |
| 5 | 수량 소진 | `품절된 상품입니다.` |
| 6 | 판매 중단 셀러 | `판매 중단된 상품입니다.` |

---

## 5. 결제 세션 (KakaoPaySession)

- 코드 검증 성공 시 32자 토큰 생성 (`crypto.randomBytes(16).toString('hex')`)
- 유효시간: **30분**
- 결제 URL: `https://liveorder.vercel.app/kakao/[TOKEN]`
- 토큰 만료 시 410 Gone 응답, 구매자에게 재시도 안내

---

## 6. 구매자 안내 문구 (셀러 → 고객)

셀러가 라이브방송 중 고객에게 전달할 안내 문구:

```
카카오톡에서 'liveorder' 채널을 친구추가한 후
채팅창에 코드 [ABC-1234-ABCD]를 입력하시면
바로 결제하실 수 있습니다!
```

> 셀러 대시보드 > 코드 관리에서 코드별 공지 문구를 복사할 수 있습니다.

---

## 7. 테스트

### 스킬 서버 직접 테스트

```bash
curl -X POST https://liveorder.vercel.app/api/kakao/webhook \
  -H 'Content-Type: application/json' \
  -d '{"userRequest":{"utterance":"ABC-1234-ABCD"}}'
```

### 로컬 테스트

```bash
curl -X POST http://localhost:3000/api/kakao/webhook \
  -H 'Content-Type: application/json' \
  -d '{"userRequest":{"utterance":"실제코드"}}'
```

---

## 8. 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| 봇이 응답 없음 | 스킬 서버 미등록 또는 폴백 블록 미설정 | 2.2~2.3 단계 재확인 |
| "서버 오류가 발생했습니다" 응답 | Vercel 함수 오류 | Vercel 로그 확인 |
| 결제 링크 만료 | 토큰 30분 초과 | 카카오톡에서 코드 재입력 |
| commerceCard 미표시 | 오픈빌더 메시지 타입 설정 | 봇 채널 설정에서 커머스 메시지 활성화 확인 |
