import type { qr_codes, transactions } from "@prisma/client";

const iso = (d: Date | null | undefined) => (d ?? new Date()).toISOString();
const whole = (v: { toFixed: (n: number) => string } | null | undefined) =>
  v ? v.toFixed(0) : "0";

export const serializeInvoice = (
  item: qr_codes & { issuer?: { name: string; businessName: string | null } },
) => {
  const status = item.status ?? "PENDING";
  const expires = item.expires_at ?? item.created_at ?? new Date();
  return {
    id: item.qr_id.toString(),
    amount: whole(item.amount),
    description: item.description ?? "",
    qrText: item.qr_text ?? "",
    status,
    createdAt: iso(item.created_at),
    expiresAt: expires.toISOString(),
    paidAt: item.paid_at ? item.paid_at.toISOString() : (null as string | null),
    issuerName: item.issuer?.businessName || item.issuer?.name || "",
    isExpired:
      status === "PENDING" &&
      !!item.expires_at &&
      item.expires_at.getTime() <= Date.now(),
  };
};

export const serializeEntry = (e: transactions) => ({
  id: String(e.transaction_id),
  amount: whole(e.amount),
  balanceAfter: whole(e.balance),
  kind: e.transaction_type ?? "",
  note: e.description ?? "",
  counterpartyName: "",
  referenceId: String(e.transaction_id),
  createdAt: iso(e.created_at),
});