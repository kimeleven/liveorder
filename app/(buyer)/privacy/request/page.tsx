'use client';

import { useState } from 'react';

export default function DataDeletionRequestPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ deleted: number } | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/buyer/data-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '처리 중 오류가 발생했습니다.');
        return;
      }
      setResult(data);
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">개인정보 삭제 요청</h1>
          <p className="text-sm text-gray-500 mb-6">
            개인정보 보호법 및 GDPR에 따라 주문 시 수집된 개인정보(이름, 전화번호, 주소)의
            삭제를 요청할 수 있습니다.
          </p>

          {result === null ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="주문 시 입력한 이름"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  전화번호
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010-0000-0000"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <p className="text-xs text-gray-400">
                ※ 거래 금액, 주문 번호 등 정산에 필요한 정보는 관련 법령에 따라 보존됩니다.
              </p>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium rounded-lg text-sm transition-colors"
              >
                {isLoading ? '처리 중...' : '개인정보 삭제 요청'}
              </button>
            </form>
          ) : (
            <div className="text-center py-6">
              {result.deleted > 0 ? (
                <>
                  <div className="text-4xl mb-4">✅</div>
                  <p className="text-lg font-semibold text-gray-800 mb-2">처리 완료</p>
                  <p className="text-sm text-gray-600">
                    {result.deleted}건의 주문 개인정보가 삭제되었습니다.
                  </p>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-4">🔍</div>
                  <p className="text-lg font-semibold text-gray-800 mb-2">주문 없음</p>
                  <p className="text-sm text-gray-600">
                    해당 정보로 등록된 주문이 없습니다.
                  </p>
                </>
              )}
              <button
                onClick={() => { setResult(null); setName(''); setPhone(''); }}
                className="mt-6 text-sm text-indigo-600 hover:underline"
              >
                다시 요청하기
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          <a href="/privacy" className="hover:underline">개인정보처리방침</a>으로 돌아가기
        </p>
      </div>
    </div>
  );
}
