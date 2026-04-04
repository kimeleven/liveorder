import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">개인정보처리방침</h1>
          <p className="text-sm text-gray-500 mb-8">최종 업데이트: 2026년 4월 3일</p>

          <div className="space-y-6 text-sm text-gray-700">
            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">1. 수집하는 개인정보</h2>
              <p>주문 처리 목적으로 다음 정보를 수집합니다:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                <li>이름, 전화번호</li>
                <li>배송 주소</li>
                <li>결제 관련 정보 (PG사 처리, 당사 미보관)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">2. 개인정보 보유 기간</h2>
              <p>
                전자상거래법에 따라 주문·결제 기록은 5년간 보존됩니다.
                거래 정보를 제외한 개인식별 정보는 본인 요청 시 즉시 삭제합니다.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">3. 개인정보 삭제 요청 (정보 주체의 권리)</h2>
              <p className="mb-3">
                개인정보 보호법 및 GDPR 제17조(삭제권)에 따라 수집된 개인정보의 삭제를 요청할 수 있습니다.
                삭제 요청 시 이름과 전화번호가 마스킹 처리됩니다.
              </p>
              <Link
                href="/privacy/request"
                className="inline-block px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-lg text-sm transition-colors border border-red-200"
              >
                개인정보 삭제 요청하기 →
              </Link>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">4. 개인정보 제3자 제공</h2>
              <p>
                수집한 개인정보는 배송 처리를 위해 택배사에 제공될 수 있습니다.
                그 외 제3자에게 제공하지 않습니다.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">5. 문의</h2>
              <p>개인정보 관련 문의는 이메일로 연락 주세요.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
