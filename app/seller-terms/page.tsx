import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '판매자 이용약관 — LiveOrder',
}

export default function SellerTermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">LiveOrder 판매자 이용약관</h1>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">제1조 (목적)</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          본 약관은 LiveOrder(이하 &quot;회사&quot;)가 제공하는 라이브 커머스 주문 중개 서비스(이하 &quot;서비스&quot;)를
          이용하는 판매자 회원(이하 &quot;판매자&quot;)과 회사 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">제2조 (서비스 정의)</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          회사는 판매자가 라이브 방송 중 구매자에게 주문 코드를 제공하고, 구매자가 해당 코드로 상품을
          주문·결제할 수 있는 중개 플랫폼을 운영합니다. 회사는 통신판매중개업자로서 판매자와 구매자 간
          거래에 직접 개입하지 않습니다.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">제3조 (판매자 의무)</h2>
        <ul className="text-sm text-muted-foreground leading-relaxed space-y-1 list-disc list-inside">
          <li>판매자는 사실에 근거한 상품 정보를 등록해야 합니다.</li>
          <li>판매자는 주문 접수 후 합리적인 기간 내 배송을 처리해야 합니다.</li>
          <li>판매자는 구매자의 정당한 청약 철회 요청에 응해야 합니다.</li>
          <li>판매자는 관련 법령(전자상거래법, 소비자보호법 등)을 준수해야 합니다.</li>
          <li>불법·허위 상품 등록 시 서비스 이용이 즉시 정지될 수 있습니다.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">제4조 (수수료 및 정산)</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          회사는 결제 완료된 주문 금액에서 플랫폼 이용 수수료를 공제한 후 주문일로부터 3영업일 이내에
          판매자가 등록한 계좌로 정산합니다. 수수료율은 서비스 내 정책 페이지에서 확인할 수 있으며,
          변경 시 7일 전 판매자에게 이메일로 공지합니다.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">제5조 (금지 행위)</h2>
        <ul className="text-sm text-muted-foreground leading-relaxed space-y-1 list-disc list-inside">
          <li>허위 또는 과장 광고</li>
          <li>미성년자 대상 유해 상품 판매</li>
          <li>위조·불량 상품 판매</li>
          <li>개인정보 무단 수집 또는 남용</li>
          <li>시스템 해킹, 크롤링 등 정상 운영 방해 행위</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">제6조 (계약 해지)</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          판매자는 언제든지 회사에 탈퇴를 요청할 수 있습니다. 단, 진행 중인 주문·정산이 완료된 후
          탈퇴가 처리됩니다. 회사는 제5조 위반 또는 서비스 약관 위반 시 별도 고지 없이 계정을
          정지하거나 해지할 수 있습니다.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">제7조 (면책조항)</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          회사는 통신판매중개업자로서 판매자와 구매자 간의 거래에서 발생하는 분쟁에 대해 직접적인
          책임을 지지 않습니다. 단, 회사의 귀책사유로 인한 손해는 관련 법령에 따라 처리합니다.
        </p>
      </section>

      <p className="text-xs text-muted-foreground mt-8 border-t pt-4">
        시행일: 2026년 4월 10일
      </p>
    </div>
  )
}
