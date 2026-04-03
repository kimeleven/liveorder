export const CARRIER_URLS: Record<string, string> = {
  '대한통운': 'https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=',
  'CJ대한통운': 'https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=',
  '롯데택배': 'https://www.lotteglogis.com/home/reservation/tracking/index?InvNo=',
  '한진택배': 'https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=',
  '우체국택배': 'https://service.epost.go.kr/trace.RetrieveDomRfRcptnInfo.comm?sid1=',
  '로젠택배': 'https://www.ilogen.com/web/personal/trace/',
};

export function getTrackingUrl(carrier: string, trackingNo: string): string | null {
  const base = CARRIER_URLS[carrier];
  return base ? `${base}${trackingNo}` : null;
}
