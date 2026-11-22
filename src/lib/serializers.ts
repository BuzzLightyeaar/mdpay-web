import type { qr_codes, transactions } from "@prisma/client";

const iso = (d: Date | null | undefined) => (d ?? new Date()).toISOString();
const whole = (v: { toFixed: (n: number) => string } | null | undefined) =>
  v ? v.toFixed(0) : "0";

export const serializeInvoice = (
  item: qr_codes & { issuer?: { name: string; businessName: string | null } },
) => ({
  id: item.qr_id.toString(),
  amount: whole(item.amount),
  description: item.description ?? "",
  status: "PENDING", // qr_codes-д status багана байхгүй
  createdAt: iso(item.created_at),
  expiresAt: iso(item.created_at), // qr_codes-д expires_at байхгүй
  paidAt: null as string | null,
  issuerName: item.issuer?.businessName || item.issuer?.name || "",
  isExpired: false,
});

export const serializeEntry = (e: transactions) => ({
  id: String(e.transaction_id),
  amount: whole(e.amount),
  balanceAfter: whole(e.balance),
  kind: e.transaction_type ?? "",
  note: e.description ?? "",
  counterpartyName: "", // transactions-д байхгүй
  referenceId: String(e.transaction_id),
  createdAt: iso(e.created_at),
});
