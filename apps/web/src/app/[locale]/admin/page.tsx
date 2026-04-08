"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { formatKrw } from "@/lib/format";

interface AdminOrder {
  id: string;
  status: string;
  totalKrw: number;
  user: { email: string; displayName: string };
}

interface Stats {
  total: number;
  pending: number;
  ready: number;
  longStanding: number;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    api<AdminOrder[]>(`/admin/orders${statusFilter ? `?status=${statusFilter}` : ""}`)
      .then(setOrders)
      .catch(() => setOrders([]));
    api<Stats>("/admin/stats").then(setStats).catch(() => setStats(null));
  };

  useEffect(() => {
    if (user?.role === "ADMIN") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, statusFilter]);

  const markInbound = async (orderId: string) => {
    setBusy(orderId);
    try {
      await api("/admin/warehouse/inbound", {
        method: "POST",
        body: JSON.stringify({
          orderId,
          trackingNo: `TRK-${Date.now()}`,
          carrier: "CJ",
        }),
      });
      await api("/admin/warehouse/inspection", {
        method: "POST",
        body: JSON.stringify({
          orderId,
          photoUrl: "https://placehold.co/400x300?text=inspection",
          notes: "Looks good.",
        }),
      });
      load();
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <p>Loading…</p>;
  if (user?.role !== "ADMIN") return <p>Admins only.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Console</h1>

      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Stat label="Total" value={stats.total} />
          <Stat label="Awaiting inbound" value={stats.pending} />
          <Stat label="Ready for pickup" value={stats.ready} />
          <Stat label="Long standing (14d+)" value={stats.longStanding} highlight />
        </div>
      )}

      <div className="card space-y-3">
        <div className="flex gap-2">
          {["", "PENDING_PAYMENT", "AWAITING_INBOUND", "INSPECTING", "READY_FOR_PICKUP"].map((s) => (
            <button
              key={s || "all"}
              onClick={() => setStatusFilter(s)}
              className={`rounded border px-2 py-1 text-xs ${statusFilter === s ? "bg-brand text-white" : "border-slate-300"}`}
            >
              {s || "ALL"}
            </button>
          ))}
        </div>
        {orders && orders.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Order</th>
                <th>Buyer</th>
                <th>Status</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="py-2 font-mono text-xs">#{o.id.slice(-8)}</td>
                  <td>{o.user.displayName}</td>
                  <td>{o.status}</td>
                  <td className="font-mono">{formatKrw(o.totalKrw)}</td>
                  <td>
                    <button
                      disabled={busy === o.id || o.status === "READY_FOR_PICKUP"}
                      onClick={() => markInbound(o.id)}
                      className="btn-secondary text-xs"
                    >
                      Mark received + inspected
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-slate-500">No orders.</p>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className={`card ${highlight ? "border-brand-accent" : ""}`}>
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className={`mt-1 text-3xl font-semibold ${highlight ? "text-brand-accent" : ""}`}>
        {value}
      </div>
    </div>
  );
}
