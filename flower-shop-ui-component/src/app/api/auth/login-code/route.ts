import { NextResponse } from "next/server";
import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { verificationCodes } from "@/db/schema";
import { createSession, createUserForEmail, ensureSeedUsers, findUserByEmail } from "@/lib/auth";

export async function POST(request: Request) {
  let body: { email?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式有误" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const code = (body.code ?? "").trim();
  if (!email || !code) {
    return NextResponse.json(
      { ok: false, message: "请输入邮箱与验证码" },
      { status: 400 },
    );
  }

  const rows = await db
    .select()
    .from(verificationCodes)
    .where(
      and(
        eq(verificationCodes.email, email),
        eq(verificationCodes.code, code),
        eq(verificationCodes.consumed, false),
        gt(verificationCodes.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(verificationCodes.createdAt))
    .limit(1);

  const record = rows[0];
  if (!record) {
    return NextResponse.json(
      { ok: false, message: "验证码错误或已过期" },
      { status: 401 },
    );
  }

  await db
    .update(verificationCodes)
    .set({ consumed: true })
    .where(eq(verificationCodes.id, record.id));

  await ensureSeedUsers();
  let user = await findUserByEmail(email);
  if (!user) {
    user = await createUserForEmail(email);
  }

  await createSession(user.id);
  return NextResponse.json({
    ok: true,
    user: { name: user.name, role: user.role, username: user.username },
  });
}
