import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminUserTable } from "@/components/admin/AdminUserTable";
import type { Profile } from "@/types/supabase";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const { data: stats } = await supabase.rpc("get_admin_stats").single();
  const { data: users } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });

  const s = stats as {
    total_users: number;
    total_admins: number;
    total_connections: number;
    total_events: number;
    new_users_7d: number;
  } | null;

  const cards = [
    { label: "Total users", value: s?.total_users ?? 0 },
    { label: "New this week", value: s?.new_users_7d ?? 0 },
    { label: "Active connections", value: s?.total_connections ?? 0 },
    { label: "Total events", value: s?.total_events ?? 0 },
    { label: "Admins", value: s?.total_admins ?? 0 },
  ];

  return (
    <div className="container py-8">
      <h1 className="mb-6 font-display text-2xl font-semibold sm:text-3xl">Admin dashboard</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {c.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-semibold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account management</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminUserTable initialUsers={(users as Profile[]) ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
