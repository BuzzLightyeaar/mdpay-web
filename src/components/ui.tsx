import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Inbox, LoaderCircle } from "lucide-react";
import { fmtDate, fmtMoney, type Entry, type Invoice } from "@/lib/types";

export function Spinner({ label = "Уншиж байна..." }: { label?: string }) {
  return (
    <div className="content-loader">
      <LoaderCircle size={24} className="spin" /> {label}
    </div>
  );
}
export function ErrorBlock({
  error,
  retry,
}: {
  error: string;
  retry?: () => void;
}) {
  return (
    <div className="error-panel">
      {error} {retry && <button onClick={retry}>Дахин оролдох</button>}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Inbox size={28} />
      </div>
      <b>{title}</b>
      <p>{description}</p>
      {actionHref && (
        <Link className="btn btn-primary btn-small" href={actionHref}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
export function StatusChip({ invoice }: { invoice: Invoice }) {
  const status =
    invoice.status === "PENDING" && invoice.isExpired
      ? "EXPIRED"
      : invoice.status;
  const names: Record<string, string> = {
    PENDING: "Хүлээгдэж буй",
    PAID: "Төлөгдсөн",
    CANCELLED: "Цуцлагдсан",
    EXPIRED: "Хугацаа дууссан",
  };
  return (
    <span className={`status-chip chip-${status.toLowerCase()}`}>
      <span />
      {names[status]}
    </span>
  );
}
export function EntriesTable({ entries }: { entries: Entry[] }) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Гүйлгээ</th>
            <th>Огноо</th>
            <th>Гүйлгээний №</th>
            <th className="right">Дүн</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>
                <div className="entry-info">
                  <span
                    className={`entry-arrow ${Number(entry.amount) >= 0 ? "income" : "outcome"}`}
                  >
                    {Number(entry.amount) >= 0 ? (
                      <ArrowDownLeft size={19} />
                    ) : (
                      <ArrowUpRight size={19} />
                    )}
                  </span>
                  <span>
                    <b>{entry.note}</b>
                    <small>{entry.counterpartyName || "MDPay систем"}</small>
                  </span>
                </div>
              </td>
              <td className="muted-cell">{fmtDate(entry.createdAt)}</td>
              <td className="mono-cell">
                {entry.referenceId.slice(0, 8).toUpperCase()}
              </td>
              <td
                className={`right amount-cell ${Number(entry.amount) >= 0 ? "positive" : "negative"}`}
              >
                {Number(entry.amount) >= 0 ? "+" : "−"}
                {fmtMoney(
                  (BigInt(entry.amount) < 0n
                    ? -BigInt(entry.amount)
                    : BigInt(entry.amount)
                  ).toString(),
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
