import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import LoginScreen from "@/components/login/login-screen";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "花屿 Bloom Isle · 登录",
};

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/home");
  return <LoginScreen />;
}
