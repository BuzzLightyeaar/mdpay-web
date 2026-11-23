import type { qr_codes, transactions } from "@prisma/client";

const iso = (d: Date | null | undefined) => (d ?? new Date()).toISOString();
const whole = (v: { toFixed: (n: number) => string } | null | undefined) =>
  v ? v.toFixed(0) : "0";

type Person =
  | {
      firstname: string | null;
      lastname: string | null;
      business_name: string | null;
    }
  | null
  | undefined;

const personName = (p: Person) =>
  p
    ? p.business_name || [p.firstname, p.lastname].filter(Boolean).join(" ")
    : "";

// viewerId өгвөл "RECEIVABLE" (авлага) / "PAYABLE" (өглөг) гэж ялгана
export const serializeInvoice = (
  item: qr_codes & { users?: Person; receiver?: Person },
  viewerId?: number,
) => {
  const status = item.status ?? "PENDING";
  const expires = item.expires_at ?? item.created_at ?? new Date();
  return {
    id: item.qr_id.toString(),
    amount: whole(item.amount),
    description: item.description ?? "",
    status,
    createdAt: iso(item.created_at),
    expiresAt: expires.toISOString(),
    paidAt: item.paid_at ? item.paid_at.toISOString() : (null as string | null),
    issuerName: personName(item.users),
    receiverName: personName(item.receiver),
    isDirected: item.receiver_id !== null,
    direction:
      viewerId !== undefined && item.receiver_id === viewerId
        ? "PAYABLE"
        : "RECEIVABLE",
    qrText: item.qr_text ?? "",
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
