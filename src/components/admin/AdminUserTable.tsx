"use client";

import { useState } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Profile } from "@/types/supabase";

export function AdminUserTable({ initialUsers }: { initialUsers: Profile[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggleRole(user: Profile) {
    setBusyId(user.id);
    const newRole = user.role === "admin" ? "user" : "admin";
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)));
    }
    setBusyId(null);
  }

  async function deleteUser(user: Profile) {
    if (!confirm(`Delete @${user.username}? This cannot be undone.`)) return;
    setBusyId(user.id);
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    }
    setBusyId(null);
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.id}>
            <TableCell>
              <p className="font-medium">@{u.username}</p>
              {u.full_name && <p className="text-xs text-muted-foreground">{u.full_name}</p>}
            </TableCell>
            <TableCell>
              <Badge variant={u.role === "admin" ? "accent" : "secondary"}>{u.role}</Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {new Date(u.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" disabled={busyId === u.id} onClick={() => toggleRole(u)}>
                  {u.role === "admin" ? "Revoke admin" : "Make admin"}
                </Button>
                <Button size="sm" variant="destructive" disabled={busyId === u.id} onClick={() => deleteUser(u)}>
                  Delete
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
