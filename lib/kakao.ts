// 카카오 채널 메시지 발송 유틸

const KAKAO_API_BASE = "https://kapi.kakao.com";

export interface KakaoMessage {
  object_type: string;
  [key: string]: unknown;
}

export async function sendKakaoMessage(
  userId: string,
  message: KakaoMessage
): Promise<void> {
  const res = await fetch(
    `${KAKAO_API_BASE}/v1/api/talk/friends/message/default/send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.KAKAO_BIZMSG_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        receiver_uuids: [userId],
        template_object: message,
      }),
    }
  );
  if (!res.ok) {
    console.error("[kakao] message send failed:", await res.text());
  }
}

export function buildProductCard(
  productName: string,
  price: number,
  stock: number,
  imageUrl: string | null,
  paymentUrl: string
): KakaoMessage {
  return {
    object_type: "commerce",
    content: {
      title: productName,
      image_url: imageUrl ?? "https://liveorder.vercel.app/og-image.png",
      image_width: 640,
      image_height: 640,
      description: `₩${price.toLocaleString()} | 재고: ${stock === 0 ? "무제한" : stock + "개"}`,
      link: { web_url: paymentUrl, mobile_web_url: paymentUrl },
    },
    commerce: {
      regular_price: price,
    },
    buttons: [
      {
        title: "결제하기",
        link: { web_url: paymentUrl, mobile_web_url: paymentUrl },
      },
    ],
  };
}
