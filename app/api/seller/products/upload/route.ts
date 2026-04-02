import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "JPG, PNG, WebP, GIF 이미지만 업로드 가능합니다." },
      { status: 400 }
    );
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: "파일 크기는 5MB 이하여야 합니다." }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `products/${session.user.id}/${Date.now()}.${ext}`;

  const blob = await put(filename, file, { access: "public" });
  return NextResponse.json({ url: blob.url });
}
