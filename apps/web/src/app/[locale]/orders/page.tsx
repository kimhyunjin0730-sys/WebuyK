"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { formatKrw } from "@/lib/format";

interface OrderRow {
  id: string;
  status: string;
  totalKrw: number;
  deliveryMode: string;
  createdAt: string;
  items: { id: string; quantity: number; product: { title: string } }[];
}

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: "bg-yellow-100 text-yellow-800",
  PURCHASING: "bg-blue-100 text-blue-800",
  AWAITING_INBOUND: "bg-blue-100 text-blue-800",
  INSPECTING: "bg-purple-100 text-purple-800",
  READY_FOR_PICKUP: "bg-green-100 text-green-800",
  FORWARDED: "bg-green-100 text-green-800",
  COMPLETED: "bg-slate-200 text-slate-700",
  CANCELED: "bg-red-100 text-red-800",
};

export default function OrdersPage() {
  const t = useTranslations("orders");
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);

  useEffect(() => {
    if (user) api<OrderRow[]>("/orders").then(setOrders);
  }, [user]);

  if (loading) return <p>Loading…</p>;
  if (!user) return <p>Please sign in.</p>;
  if (!orders) return <p>Loading orders…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      {orders.length === 0 ? (
        <p className="card text-slate-500">{t("empty")}</p>
      ) : (
        orders.map((o) => (
          <div key={o.id} className="card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-slate-500">#{o.id.slice(-8)}</div>
                <div className="mt-1 font-medium">
                  {o.items.map((i) => `${i.product.title} ×${i.quantity}`).join(", ")}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {new Date(o.createdAt).toLocaleString()} · {o.deliveryMode}
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`inline-block rounded px-2 py-0.5 text-xs ${STATUS_COLOR[o.status] ?? "bg-slate-100"}`}
                >
                  {o.status}
                </span>
                <div className="mt-1 font-mono text-sm">{formatKrw(o.totalKrw)}</div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
