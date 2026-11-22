"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clipboard,
  Copy,
  FilePlus2,
  FileText,
  Filter,
  Link2,
  Plus,
  QrCode,
  Search,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { api, checkoutUrl, fmtDate, fmtMoney, type Invoice } from "@/lib/types";
import { EmptyState, ErrorBlock, Spinner, StatusChip } from "@/components/ui";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const refresh = useCallback(async () => {
    try {
      const r = await api<{ invoices: Invoice[] }>("/api/invoices");
      setInvoices(r.invoices);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа гарлаа");
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  async function create(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    setBusy(true);
    try {
      const r = await api<{ invoice: Invoice }>("/api/invoices", {
        method: "POST",
        body: JSON.stringify({ amount, description }),
      });
      setModal(false);
      setDescription("");
      setAmount("");
      setSelected(r.invoice);
      await refresh();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setBusy(false);
    }
  }
  async function cancelInvoice(inv: Invoice) {
    if (!window.confirm("Энэ нэхэмжлэлийг цуцлах уу?")) return;
    try {
      await api(`/api/invoices/${inv.id}/cancel`, { method: "POST" });
      setSelected(null);
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Алдаа гарлаа");
    }
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Энэ холбоосыг хуулна уу:", value);
    }
  }
  const filtered = (invoices || []).filter(
    (i) =>
      (status === "ALL" ||
        (status === "EXPIRED"
          ? i.isExpired
          : i.status === status && !i.isExpired)) &&
      (i.description.toLowerCase().includes(query.toLowerCase()) ||
        i.id.toLowerCase().includes(query.toLowerCase())),
  );
  return (
    <div>
      <div className="page-intro">
        <div>
          <div className="eyebrow-dash">
            <span /> ТӨЛБӨР НЭХЭМЖЛЭХ
          </div>
          <h1>Нэхэмжлэлүүд</h1>
          <p>Төлбөрийн нэхэмжлэл үүсгэж, QR болон холбоосоор хуваалцаарай.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          <Plus size={18} /> Шинэ нэхэмжлэл
        </button>
      </div>
      <div className="summary-strip">
        <span className="strip-icon">
          <QrCode size={22} />
        </span>
        <div>
          <b>Нэхэмжлэл бүр өөрийн QR кодтой.</b>
          <p>
            Харилцагч QR уншуулахад MDPay-ийн туршилтын төлбөрийн хуудас руу
            шилжинэ.
          </p>
        </div>
        <span className="strip-info">DEMO QR</span>
      </div>
      <div className="dash-white-block invoices-block">
        <div className="list-tools">
          <div className="tool-search">
            <Search size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Нэхэмжлэл хайх..."
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Нэхэмжлэлийн төлөв"
          >
            <option value="ALL">Бүх төлөв</option>
            <option value="PENDING">Хүлээгдэж буй</option>
            <option value="PAID">Төлөгдсөн</option>
            <option value="CANCELLED">Цуцлагдсан</option>
            <option value="EXPIRED">Хугацаа дууссан</option>
          </select>
        </div>
        {error ? (
          <ErrorBlock error={error} retry={() => void refresh()} />
        ) : invoices === null ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Нэхэмжлэл олдсонгүй"
            description="Нэхэмжлэл үүсгэх эсвэл хайлтын нөхцөлөө өөрчилнө үү."
          />
        ) : (
          <div className="table-scroll">
            <table className="data-table invoice-table">
              <thead>
                <tr>
                  <th>Нэхэмжлэл</th>
                  <th>Үүсгэсэн</th>
                  <th>Дүн</th>
                  <th>Төлөв</th>
                  <th className="right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <div className="entry-info">
                        <span className="entry-arrow invoice-entry">
                          <FileText size={18} />
                        </span>
                        <span>
                          <b>{inv.description}</b>
                          <small>#{inv.id.slice(0, 8).toUpperCase()}</small>
                        </span>
                      </div>
                    </td>
                    <td className="muted-cell">{fmtDate(inv.createdAt)}</td>
                    <td className="invoice-amount">{fmtMoney(inv.amount)}</td>
                    <td>
                      <StatusChip invoice={inv} />
                    </td>
                    <td className="right">
                      <button
                        className="table-action"
                        onClick={() => setSelected(inv)}
                      >
                        <QrCode size={17} /> QR / Дэлгэрэнгүй
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(false);
          }}
        >
          <div className="modal-card">
            <div className="modal-heading">
              <div>
                <span>ШИНЭ НЭХЭМЖЛЭЛ</span>
                <h2>Нэхэмжлэл үүсгэх</h2>
              </div>
              <button onClick={() => setModal(false)} aria-label="Хаах">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={create} className="modal-form">
              <label htmlFor="invoice-title">Нэхэмжлэлийн тайлбар</label>
              <input
                id="invoice-title"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Жишээ: Кофе захиалгын төлбөр"
                minLength={3}
                maxLength={200}
                required
              />
              <label htmlFor="invoice-amount">Төлөх дүн (₮)</label>
              <div className="amount-input">
                <input
                  id="invoice-amount"
                  type="number"
                  min="1"
                  max="1000000000000"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="85000"
                  required
                />
                <b>₮</b>
              </div>
              <div className="form-hint">
                Нэхэмжлэл 7 хоногийн хугацаанд хүчинтэй.
              </div>
              {formError && <div className="error-alert">{formError}</div>}
              <button
                className="btn btn-primary full-btn"
                type="submit"
                disabled={busy}
              >
                {busy ? "Үүсгэж байна..." : "QR нэхэмжлэл үүсгэх"}
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
        </div>
      )}
      {selected && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <div className="modal-card qr-modal">
            <div className="modal-heading">
              <div>
                <span>НЭХЭМЖЛЭЛ</span>
                <h2>QR төлбөр</h2>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Хаах">
                <X size={20} />
              </button>
            </div>
            <div className="qr-modal-inner">
              <div className="qr-modal-code">
                <div className="qr-modal-brand">
                  MD<span>pay</span>
                </div>
                <QRCodeSVG
                  value={checkoutUrl(selected.id)}
                  size={212}
                  marginSize={1}
                  includeMargin={false}
                />
                <small>Уншуулаад MDPay-ээр төлнө</small>
              </div>
              <div className="qr-modal-amount">
                <span>{selected.description}</span>
                <strong>{fmtMoney(selected.amount)}</strong>
                <StatusChip invoice={selected} />
              </div>
              <div className="detail-row">
                <span>Нэхэмжлэлийн №</span>
                <b>{selected.id.slice(0, 18)}...</b>
              </div>
              <div className="detail-row">
                <span>Дуусах хугацаа</span>
                <b>{fmtDate(selected.expiresAt)}</b>
              </div>
              <div className="modal-buttons">
                <button
                  className="btn btn-primary"
                  onClick={() => void copy(checkoutUrl(selected.id))}
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}{" "}
                  {copied ? "Хуулсан" : "Холбоос хуулах"}
                </button>
                <Link
                  className="btn btn-secondary"
                  href={`/pay/${selected.id}`}
                  target="_blank"
                >
                  Төлбөрийн хуудас <ArrowUpRight size={16} />
                </Link>
              </div>
              {selected.status === "PENDING" && !selected.isExpired && (
                <button
                  className="text-danger"
                  onClick={() => void cancelInvoice(selected)}
                >
                  Нэхэмжлэл цуцлах
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
