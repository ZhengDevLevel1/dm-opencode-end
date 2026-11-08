import { NextResponse } from "next/server";
import {
  createSession,
  ensureSeedUsers,
  findUserByUsername,
  verifyPassword,
} from "@/lib/auth";

export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式有误" }, { status: 400 });
  }

  const username = (body.username ?? "").trim();
  const password = body.password ?? "";
  if (!username || !password) {
    return NextResponse.json(
      { ok: false, message: "请输入用户名与密码" },
      { status: 400 },
    );
  }

  await ensureSeedUsers();
  const user = await findUserByUsername(username);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json(
      { ok: false, message: "用户名或密码不正确" },
      { status: 401 },
    );
  }

  await createSession(user.id);
  return NextResponse.json({
    ok: true,
    user: { name: user.name, role: user.role, username: user.username },
  });
}
