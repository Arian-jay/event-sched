import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConnectionsManager } from "@/components/connections/ConnectionsManager";
import type { Profile } from "@/types/supabase";

export default async function ConnectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold sm:text-3xl">Connections</h1>
      <ConnectionsManager profile={profile as Profile} />
    </div>
  );
}
