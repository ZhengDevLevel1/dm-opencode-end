import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import HomeScreen from "@/components/home-screen";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "花屿 Bloom Isle",
};

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  return <HomeScreen name={user.name} />;
}
