import type { Metadata } from "next";
import { getSupabaseServer } from "@/lib/supabase/server";
import { HomeScreen } from "@/components/app/HomeScreen";

export const metadata: Metadata = { title: "Home" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await getSupabaseServer();
  let email: string | null = null;
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    email = data.user?.email ?? null;
  }
  return <HomeScreen userEmail={email} />;
}
