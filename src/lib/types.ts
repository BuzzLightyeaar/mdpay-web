export type User = {
  id: string;
  name: string;
  email: string;
  type: "BUSINESS" | "PERSONAL";
  businessName: string | null;
};
export type Entry = {
  id: string;
  amount: string;
  balanceAfter: string;
  kind: string;
  note: string;
  counterpartyName: string | null;
  referenceId: string;
  createdAt: string;
};
export type Invoice = {
  id: string;
  amount: string;
  description: string;
  status: "PENDING" | "PAID" | "CANCELLED";
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
  issuerName: string;
  isExpired: boolean;
  direction?: "RECEIVABLE" | "PAYABLE";
  receiverName?: string;
  isDirected?: boolean;
  qrText?: string;
};
export type Summary = {
  user: User;
  balance: string;
  walletId: string;
  pendingInvoices: number;
  recentTransactions: Entry[];
  recentInvoices: Invoice[];
};
export function fmtMoney(value: string | number) {
  return Number(value).toLocaleString("en-US") + " ₮";
}
export function fmtDate(value: string) {
  return new Date(value).toLocaleString("mn-MN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
export function checkoutUrl(id: string) {
  // Prefer public canonical origin; current host is fallback only for preview.
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000");
  return `${origin.replace(/\/$/, "")}/pay/${id}`;
}
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
    headers: {
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
      ...(options?.headers || {}),
    },
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || "Хүсэлт амжилтгүй боллоо");
  return json as T;
}
