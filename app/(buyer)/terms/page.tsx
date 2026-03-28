import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="flex flex-col flex-1">
      <div className="border-b px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-lg font-bold">
          LIVEORDER
        </Link>
        <span className="text-sm text-muted-foreground">이용약관</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6 prose prose-sm max-w-none">
        <h1>LIVEORDER 서비스 이용약관</h1>
        <p className="text-muted-foreground">시행일: 2026년 __월 __일</p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-4 text-sm">
          <strong>중요 고지 — 전자상거래법 제20조 제1항 준수</strong>
          <br />
          LIVEORDER(이하 &apos;회사&apos;)는 통신판매중개업자로서 거래 당사자가
          아닙니다. 상품의 품질, 정보의 정확성, 적법성, 배송에 관한 책임은 개별
          판매자(셀러)에게 있습니다.
        </div>

        <h2>제1조 (목적)</h2>
        <p>
          이 약관은 회사가 운영하는 LIVEORDER 서비스의 이용과 관련하여 회사와
          이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
        </p>

        <h2>제4조 (서비스 이용)</h2>
        <p>구매자는 회원가입 없이 코드 입력만으로 서비스를 이용할 수 있습니다.</p>

        <h2>제7조 (청약철회)</h2>
        <p>구매자는 상품 수령일로부터 7일 이내에 청약철회를 할 수 있습니다.</p>

        <h2>제8조 (개인정보 수집 및 이용)</h2>
        <p>
          회사는 주문 처리를 위해 이름, 연락처, 배송주소를 수집하며 거래 후
          5년간 보관합니다.
        </p>

        <h2>제10조 (회사의 책임 제한)</h2>
        <p>
          회사는 통신판매중개업자로서 셀러가 제공하는 상품의 내용, 품질, 안전성에
          대해 직접적인 책임을 지지 않습니다.
        </p>

        <p className="text-xs text-muted-foreground mt-8">
          전체 약관 내용은 서비스 내에서 확인하실 수 있습니다.
          법적 사항은 변호사 검토 후 적용됩니다.
        </p>
      </div>
    </div>
  );
}
