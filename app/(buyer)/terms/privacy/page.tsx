import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="flex flex-col flex-1">
      <div className="border-b px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-lg font-bold">
          LIVEORDER
        </Link>
        <span className="text-sm text-muted-foreground">개인정보처리방침</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6 prose prose-sm max-w-none">
        <h1>개인정보처리방침</h1>

        <h2>1. 수집하는 개인정보 항목</h2>
        <table>
          <thead>
            <tr>
              <th>항목</th>
              <th>수집 목적</th>
              <th>보유 기간</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>이름, 연락처, 배송주소</td>
              <td>주문 처리 및 배송</td>
              <td>거래 후 5년</td>
            </tr>
            <tr>
              <td>결제 정보 (영수증)</td>
              <td>거래 기록 보존</td>
              <td>5년</td>
            </tr>
            <tr>
              <td>접속 IP, 이용 이력</td>
              <td>부정 이용 방지</td>
              <td>3년</td>
            </tr>
          </tbody>
        </table>

        <h2>2. 개인정보 제3자 제공</h2>
        <ul>
          <li>제공 대상: 판매자(셀러)</li>
          <li>제공 목적: 주문 상품 배송 처리</li>
          <li>제공 항목: 수령인명, 배송주소, 연락처, 주문 상품명</li>
          <li>보유 기간: 배송 완료 후 6개월</li>
        </ul>

        <h2>3. 개인정보 파기</h2>
        <p>
          보유 기간이 경과한 개인정보는 지체 없이 파기합니다.
        </p>

        <h2>4. 문의</h2>
        <p>
          개인정보 관련 문의는 고객센터를 통해 접수하실 수 있습니다.
        </p>
      </div>
    </div>
  );
}
