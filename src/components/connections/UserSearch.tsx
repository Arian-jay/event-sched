"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Profile } from "@/types/supabase";

export function UserSearch({ currentUserId, onRequestSent }: { currentUserId: string; onRequestSent: () => void }) {
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .ilike("username", `%${query.trim()}%`)
      .neq("id", currentUserId)
      .limit(10);

    setResults((data as Profile[]) ?? []);
    setSearching(false);
  }

  async function sendRequest(addresseeId: string) {
    const { error } = await supabase.from("connections").insert({
      requester_id: currentUserId,
      addressee_id: addresseeId,
    });
    if (!error) {
      setSentTo((prev) => new Set(prev).add(addresseeId));
      onRequestSent();
    }
  }

  return (
    <div>
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username…"
          className="flex-1"
        />
        <Button type="submit" disabled={searching}>
          {searching ? "Searching…" : "Search"}
        </Button>
      </form>

      <div className="mt-4 flex flex-col gap-2">
        {results.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>{r.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">@{r.username}</p>
                {r.full_name && <p className="text-xs text-muted-foreground">{r.full_name}</p>}
              </div>
            </div>
            <Button
              size="sm"
              variant={sentTo.has(r.id) ? "secondary" : "default"}
              disabled={sentTo.has(r.id)}
              onClick={() => sendRequest(r.id)}
            >
              {sentTo.has(r.id) ? "Request sent" : "Connect"}
            </Button>
          </div>
        ))}
        {results.length === 0 && query && !searching && (
          <p className="text-sm text-muted-foreground">No users found for &ldquo;{query}&rdquo;.</p>
        )}
      </div>
    </div>
  );
}
