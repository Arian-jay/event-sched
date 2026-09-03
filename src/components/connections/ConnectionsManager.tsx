"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UserSearch } from "./UserSearch";
import type { Connection, Profile } from "@/types/supabase";

export function ConnectionsManager({ profile }: { profile: Profile }) {
  const supabase = createClient();
  const [incoming, setIncoming] = useState<Connection[]>([]);
  const [outgoing, setOutgoing] = useState<Connection[]>([]);
  const [accepted, setAccepted] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("connections")
      .select(
        "*, requester:profiles!connections_requester_id_fkey(*), addressee:profiles!connections_addressee_id_fkey(*)"
      )
      .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`);

    const all = (data as unknown as Connection[]) ?? [];
    setIncoming(all.filter((c) => c.status === "pending" && c.addressee_id === profile.id));
    setOutgoing(all.filter((c) => c.status === "pending" && c.requester_id === profile.id));
    setAccepted(all.filter((c) => c.status === "accepted"));
    setLoading(false);
  }, [supabase, profile.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function respond(connectionId: string, status: "accepted" | "declined") {
    await supabase.from("connections").update({ status }).eq("id", connectionId);
    load();
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-semibold">Find people</h2>
        <p className="mb-4 text-sm text-muted-foreground">Search for a username and send a connection request.</p>
        <UserSearch currentUserId={profile.id} onRequestSent={load} />
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <Tabs defaultValue="connections">
          <TabsList>
            <TabsTrigger value="connections">Connections ({accepted.length})</TabsTrigger>
            <TabsTrigger value="requests">
              Requests {incoming.length > 0 && `(${incoming.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connections">
            {!loading && accepted.length === 0 && (
              <p className="text-sm text-muted-foreground">No connections yet — search above to add one.</p>
            )}
            <div className="flex flex-col gap-2">
              {accepted.map((c) => {
                const partner = c.requester_id === profile.id ? c.addressee! : c.requester!;
                return (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <Avatar>
                      <AvatarFallback>{partner.username[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">@{partner.username}</p>
                      {partner.full_name && <p className="text-xs text-muted-foreground">{partner.full_name}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="requests">
            <div className="flex flex-col gap-4">
              {incoming.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Incoming
                  </p>
                  <div className="flex flex-col gap-2">
                    {incoming.map((c) => (
                      <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{c.requester!.username[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <p className="text-sm font-medium">@{c.requester!.username}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => respond(c.id, "declined")}>
                            Decline
                          </Button>
                          <Button size="sm" onClick={() => respond(c.id, "accepted")}>
                            Accept
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {outgoing.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Sent
                  </p>
                  <div className="flex flex-col gap-2">
                    {outgoing.map((c) => (
                      <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border p-3 opacity-70">
                        <Avatar>
                          <AvatarFallback>{c.addressee!.username[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <p className="text-sm font-medium">@{c.addressee!.username}</p>
                        <span className="ml-auto text-xs text-muted-foreground">Pending</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {incoming.length === 0 && outgoing.length === 0 && (
                <p className="text-sm text-muted-foreground">No pending requests.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
