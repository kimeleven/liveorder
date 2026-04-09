export default function SellerTermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">판매자 이용약관</h1>
      <div className="prose prose-sm max-w-none space-y-6 text-sm text-gray-700">
        <section>
          <h2 className="text-lg font-semibold mb-2">제1조 (목적)</h2>
          <p>
            본 약관은 LIVEORDER(이하 &quot;회사&quot;)가 운영하는 라이브커머스 주문·결제 플랫폼
            서비스(이하 &quot;서비스&quot;)를 이용하는 판매자(이하 &quot;셀러&quot;)와 회사 간의 권리·의무 및
            책임 사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">제2조 (정의)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>&quot;셀러&quot;란 본 약관에 동의하고 회사에 판매자 등록을 완료한 사업자를 말합니다.</li>
            <li>&quot;상품&quot;이란 셀러가 서비스를 통해 판매하는 재화 또는 용역을 말합니다.</li>
            <li>&quot;주문코드&quot;란 셀러가 발급하여 구매자가 상품을 주문할 때 사용하는 고유 코드를 말합니다.</li>
            <li>&quot;정산&quot;이란 구매자의 결제 완료 후 회사가 플랫폼 이용료를 공제하고 셀러에게 지급하는 금액을 말합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">제3조 (셀러 가입 및 승인)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>셀러 가입을 위해서는 사업자등록증, 통신판매업신고번호, 정산 계좌 정보 등 필수 정보를 제출해야 합니다.</li>
            <li>회사는 제출된 정보를 검토한 후 셀러 계정을 승인하거나 거부할 수 있습니다.</li>
            <li>허위 정보 제출 시 계정 정지 및 법적 책임이 발생할 수 있습니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">제4조 (셀러의 의무)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>셀러는 판매하는 상품이 관련 법령을 준수하는지 확인할 책임이 있습니다.</li>
            <li>셀러는 상품 정보(가격, 재고, 배송 정보 등)를 정확하게 등록·유지해야 합니다.</li>
            <li>셀러는 구매자의 개인정보를 관련 법령에 따라 보호해야 합니다.</li>
            <li>셀러는 부정한 방법으로 주문코드를 발급하거나 결제 시스템을 악용해서는 안 됩니다.</li>
            <li>셀러는 주문 발생 후 합리적인 기간 내에 배송을 완료해야 합니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">제5조 (플랫폼 이용료 및 정산)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>회사는 결제 완료된 주문에 대해 플랫폼 이용료(기본 2.5%)를 공제합니다.</li>
            <li>정산은 구매자 결제 확인 후 영업일 기준 3일(D+3)에 처리됩니다.</li>
            <li>환불·취소된 주문은 정산 대상에서 제외됩니다.</li>
            <li>정산 계좌 정보 오류로 인한 미지급에 대한 책임은 셀러에게 있습니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">제6조 (금지 행위)</h2>
          <p>셀러는 다음 행위를 해서는 안 됩니다:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>불법 상품 또는 유해 상품 판매</li>
            <li>허위·과장 광고</li>
            <li>타 셀러의 정보 도용</li>
            <li>시스템 해킹 또는 악성 코드 유포</li>
            <li>구매자 개인정보 무단 수집 및 활용</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">제7조 (계정 정지 및 해지)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>회사는 셀러가 본 약관을 위반한 경우 사전 통보 없이 계정을 정지하거나 해지할 수 있습니다.</li>
            <li>계정 해지 시 미정산 금액은 관련 법령에 따라 처리됩니다.</li>
            <li>셀러는 언제든지 서비스 탈퇴를 요청할 수 있으며, 진행 중인 주문이 없는 경우 즉시 처리됩니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">제8조 (책임 제한)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>회사는 셀러가 등록한 상품 정보의 정확성에 대해 책임지지 않습니다.</li>
            <li>회사는 셀러와 구매자 간의 분쟁에 대해 중재 역할을 할 수 있으나, 최종 책임은 셀러에게 있습니다.</li>
            <li>천재지변, 서비스 장애 등 불가항력으로 인한 서비스 중단에 대해 회사는 책임지지 않습니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">제9조 (약관의 변경)</h2>
          <p>
            회사는 관련 법령 또는 서비스 변경에 따라 본 약관을 변경할 수 있으며,
            변경 시 서비스 내 공지사항을 통해 7일 전에 고지합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">제10조 (관할 법원)</h2>
          <p>
            본 약관과 관련한 분쟁은 대한민국 법률에 따라 회사 소재지 관할 법원을 전속 관할 법원으로 합니다.
          </p>
        </section>

        <p className="text-muted-foreground text-xs mt-8">시행일: 2026년 4월 1일</p>
      </div>
    </div>
  );
}
