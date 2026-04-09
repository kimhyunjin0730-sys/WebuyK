"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  Box,
  CreditCard,
  PackageCheck,
  Search,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";
import { formatKrw } from "@/lib/format";
import { getImpCode, loadIMP } from "@/lib/portone";

interface OrderRow {
  id: string;
  status: string;
  totalKrw: number;
  deliveryMode: string;
  createdAt: string;
  items: { id: string; quantity: number; product: { title: string } }[];
}

const STATUS_INDEX: Record<string, number> = {
  PENDING_PAYMENT: 0,
  PURCHASING: 1,
  AWAITING_INBOUND: 1,
  INSPECTING: 2,
  READY_FOR_PICKUP: 3,
  FORWARDED: 3,
  COMPLETED: 4,
  CANCELED: -1,
};

const STATUS_BADGE: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-800 border-amber-200",
  PURCHASING: "bg-blue-100 text-blue-800 border-blue-200",
  AWAITING_INBOUND: "bg-blue-100 text-blue-800 border-blue-200",
  INSPECTING: "bg-purple-100 text-purple-800 border-purple-200",
  READY_FOR_PICKUP: "bg-green-100 text-green-800 border-green-200",
  FORWARDED: "bg-green-100 text-green-800 border-green-200",
  COMPLETED: "bg-slate-200 text-slate-700 border-slate-300",
  CANCELED: "bg-red-100 text-red-800 border-red-200",
};

export default function OrdersPage() {
  const t = useTranslations("orders");
  const locale = useLocale();
  const { user, loading } = useAuth();
  const toast = useToast();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (user) api<OrderRow[]>("/orders").then(setOrders);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onCheckout = async (order: OrderRow) => {
    if (!user) return;
    if (!getImpCode()) {
      toast.error(
        "Portone is not configured. Set NEXT_PUBLIC_PORTONE_IMP_CODE in apps/web/.env.local.",
      );
      return;
    }
    setPayingId(order.id);
    try {
      const IMP = await loadIMP();
      const summary = order.items
        .map((i) => `${i.product.title} ×${i.quantity}`)
        .join(", ")
        .slice(0, 80);
      IMP.request_pay(
        {
          pay_method: "card",
          merchant_uid: order.id,
          name: summary || `We buy K Order ${order.id.slice(-8)}`,
          amount: order.totalKrw,
          buyer_email: user.email,
          buyer_name: user.displayName,
        },
        async (rsp) => {
          if (!rsp.success) {
            toast.error(rsp.error_msg || "Payment failed");
            setPayingId(null);
            return;
          }
          if (!rsp.imp_uid) {
            toast.error("Portone returned no imp_uid");
            setPayingId(null);
            return;
          }
          try {
            await api(`/payments/orders/${order.id}/capture`, {
              method: "POST",
              body: JSON.stringify({ impUid: rsp.imp_uid }),
            });
            toast.success(t("paymentSuccess"));
            refresh();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Capture failed");
          } finally {
            setPayingId(null);
          }
        },
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load Portone");
      setPayingId(null);
    }
  };

  if (loading) return <p>Loading…</p>;
  if (!user) return <p>Please sign in.</p>;
  if (!orders) return <p>Loading orders…</p>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      {orders.length === 0 ? (
        <div className="card flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <ShoppingCart className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">{t("emptyTitle")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("emptySub")}</p>
          <Link
            href={`/${locale}/cart`}
            className="btn-primary mt-4 inline-flex items-center gap-2"
          >
            {t("emptyCta")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        orders.map((o) => (
          <OrderCard
            key={o.id}
            order={o}
            onCheckout={() => onCheckout(o)}
            paying={payingId === o.id}
          />
        ))
      )}
    </div>
  );
}

function OrderCard({
  order,
  onCheckout,
  paying,
}: {
  order: OrderRow;
  onCheckout: () => void;
  paying: boolean;
}) {
  const t = useTranslations("orders");
  const idx = STATUS_INDEX[order.status] ?? 0;
  const summary = order.items
    .map((i) => `${i.product.title} ×${i.quantity}`)
    .join(", ");

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-mono text-slate-400">
            #{order.id.slice(-8).toUpperCase()}
          </div>
          <div className="mt-1 truncate font-semibold">{summary}</div>
          <div className="mt-1 text-xs text-slate-500">
            {new Date(order.createdAt).toLocaleString()} · {order.deliveryMode}
          </div>
        </div>
        <div className="text-right">
          <span
            className={`inline-block rounded-full border px-3 py-0.5 text-xs font-medium ${STATUS_BADGE[order.status] ?? "bg-slate-100 border-slate-200"}`}
          >
            {order.status.replace(/_/g, " ")}
          </span>
          <div className="mt-1 font-mono text-sm font-semibold">
            {formatKrw(order.totalKrw)}
          </div>
        </div>
      </div>

      {order.status !== "CANCELED" && <Pipeline currentIndex={idx} />}

      {order.status === "PENDING_PAYMENT" && (
        <button
          type="button"
          onClick={onCheckout}
          disabled={paying}
          className="btn-primary w-full disabled:opacity-50"
        >
          {paying ? t("paying") : t("pay")}
        </button>
      )}
    </div>
  );
}

const STAGES = [
  { key: "stage1", icon: CreditCard },
  { key: "stage2", icon: Box },
  { key: "stage3", icon: Search },
  { key: "stage4", icon: Truck },
  { key: "stage5", icon: PackageCheck },
] as const;

function Pipeline({ currentIndex }: { currentIndex: number }) {
  const t = useTranslations("orders");
  return (
    <div className="relative pt-2">
      <div className="absolute left-0 right-0 top-[18px] h-0.5 bg-slate-200" />
      <div
        className="absolute left-0 top-[18px] h-0.5 bg-brand transition-all duration-500"
        style={{
          width: `${Math.max(0, (currentIndex / (STAGES.length - 1)) * 100)}%`,
        }}
      />
      <div className="relative grid grid-cols-5 gap-1">
        {STAGES.map((stage, i) => {
          const done = i <= currentIndex;
          const active = i === currentIndex;
          const Icon = stage.icon;
          return (
            <div key={stage.key} className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                  done
                    ? "border-brand bg-brand text-white"
                    : "border-slate-200 bg-white text-slate-400"
                } ${active ? "ring-4 ring-brand/20" : ""}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span
                className={`text-[10px] font-medium ${done ? "text-brand" : "text-slate-400"}`}
              >
                {t(stage.key)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
