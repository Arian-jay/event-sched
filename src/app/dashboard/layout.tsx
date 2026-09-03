import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardNavbar } from "@/components/DashboardNavbar";
import type { Profile } from "@/types/supabase";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (!profile) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar profile={profile as Profile} />
      <main className="container py-8">{children}</main>
    </div>
  );
}
