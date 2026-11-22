"use client";
import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CreditCard, Search } from "lucide-react";
import { api, fmtMoney, type Entry } from "@/lib/types";
import { EmptyState, EntriesTable, ErrorBlock, Spinner } from "@/components/ui";
export default function TransactionsPage() {
  const [items, setItems] = useState<Entry[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  useEffect(() => {
    api<{ transactions: Entry[] }>("/api/transactions")
      .then((r) => setItems(r.transactions))
      .catch((e) => setError(e.message));
  }, []);
  const filtered = (items || []).filter(
    (t) =>
      (filter === "ALL" ||
        (filter === "IN" ? BigInt(t.amount) >= 0n : BigInt(t.amount) < 0n)) &&
      `${t.note} ${t.counterpartyName || ""} ${t.referenceId}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div>
      <div className="page-intro">
        <div>
          <div className="eyebrow-dash">
            <span /> ACCOUNT ACTIVITY
          </div>
          <h1>Гүйлгээний түүх</h1>
          <p>Дансны орлого, зарлага, шилжүүлгийн мэдээлэл.</p>
        </div>
      </div>
      <div className="dash-white-block transactions-block">
        <div className="list-tools">
          <div className="tool-search">
            <Search size={18} />
            <input
              placeholder="Гүйлгээ хайх..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="filter-pills">
            <button
              className={filter === "ALL" ? "active" : ""}
              onClick={() => setFilter("ALL")}
            >
              Бүгд
            </button>
            <button
              className={filter === "IN" ? "active" : ""}
              onClick={() => setFilter("IN")}
            >
              Орлого
            </button>
            <button
              className={filter === "OUT" ? "active" : ""}
              onClick={() => setFilter("OUT")}
            >
              Зарлага
            </button>
          </div>
        </div>
        {error ? (
          <ErrorBlock error={error} />
        ) : items === null ? (
          <Spinner />
        ) : filtered.length ? (
          <EntriesTable entries={filtered} />
        ) : (
          <EmptyState
            title="Гүйлгээ олдсонгүй"
            description="Сонгосон шүүлтүүрт тохирох гүйлгээ алга."
          />
        )}
        <div className="table-footer">
          Хамгийн сүүлийн 100 гүйлгээг харуулна. • Тест өгөгдөл
        </div>
      </div>
    </div>
  );
}
