import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { verificationCodes } from "@/db/schema";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式有误" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, message: "请输入正确的邮箱地址" },
      { status: 400 },
    );
  }

  const code = String(randomInt(0, 1000000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.delete(verificationCodes).where(eq(verificationCodes.email, email));
  await db.insert(verificationCodes).values({ email, code, expiresAt });

  // 演示环境没有真实邮件通道，直接把验证码回传给前端展示。
  return NextResponse.json({ ok: true, demoCode: code, expiresIn: 600 });
}
