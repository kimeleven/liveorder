import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildProductCard, sendKakaoMessage } from "@/lib/kakao";
import { nanoid } from "nanoid";

const CODE_PATTERN = /[A-Z]{3}-\d{4}-[A-Z0-9]{4}/;

export async function POST(req: NextRequest) {
  const body = await req.json();

  const userKey: string = body?.userRequest?.user?.id ?? "";
  const utterance: string = body?.userRequest?.utterance ?? "";

  const match = utterance.toUpperCase().match(CODE_PATTERN);
  if (!match) {
    return NextResponse.json({
      version: "2.0",
      template: {
        outputs: [
          { simpleText: { text: "코드를 입력해주세요.\n예: ABC-1234-XY01" } },
        ],
      },
    });
  }

  const codeKey = match[0];

  const code = await prisma.code.findUnique({
    where: { codeKey },
    include: { product: { include: { seller: true } } },
  });

  if (!code || !code.isActive || code.expiresAt < new Date()) {
    return NextResponse.json({
      version: "2.0",
      template: {
        outputs: [
          {
            simpleText: {
              text: "유효하지 않은 코드입니다. 코드를 다시 확인해 주세요.",
            },
          },
        ],
      },
    });
  }

  if (code.product.seller.status !== "APPROVED") {
    return NextResponse.json({
      version: "2.0",
      template: {
        outputs: [
          { simpleText: { text: "현재 이용할 수 없는 코드입니다." } },
        ],
      },
    });
  }

  if (code.maxQty > 0 && code.usedQty >= code.maxQty) {
    return NextResponse.json({
      version: "2.0",
      template: {
        outputs: [
          { simpleText: { text: "해당 코드는 수량이 소진되었습니다." } },
        ],
      },
    });
  }

  // 결제 세션 토큰 생성 (30분 만료)
  const sessionToken = nanoid(32);
  await prisma.kakaoPaySession.create({
    data: {
      token: sessionToken,
      codeId: code.id,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });

  const paymentUrl = `${process.env.NEXTAUTH_URL}/kakao/${sessionToken}`;

  // 카카오 응답 포맷 (스킬 응답)
  return NextResponse.json({
    version: "2.0",
    template: {
      outputs: [
        {
          basicCard: {
            title: code.product.name,
            description: `가격: ₩${code.product.price.toLocaleString()}\n재고: ${
              code.product.stock === 0
                ? "무제한"
                : code.product.stock + "개 남음"
            }`,
            thumbnail: code.product.imageUrl
              ? { imageUrl: code.product.imageUrl }
              : undefined,
            buttons: [
              {
                label: "결제하기",
                action: "webLink",
                webLinkUrl: paymentUrl,
              },
            ],
          },
        },
      ],
    },
  });
}
