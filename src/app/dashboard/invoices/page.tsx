"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Hash,
  LockKeyhole,
  Plus,
  QrCode,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { api } from "@/lib/types";

type Invoice = {
  id: string;
  amount: string;
  description: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
  issuerName: string;
  receiverName: string;
  isDirected: boolean;
  direction: "RECEIVABLE" | "PAYABLE";
  qrText: string;
  isExpired: boolean;
};
type Box = "receivable" | "payable";
type Receiver = { accountNumber: string; name: string };

const money = (v: string) => `${Number(v).toLocaleString("en-US")} ₮`;
const when = (s: string) =>
  new Date(s).toLocaleString("en-US", {
    dateStyle: "short",
    timeStyle: "short",
  });

function statusOf(i: Invoice): { key: string; label: string } {
  if (i.status === "PAID") return { key: "PAID", label: "Төлөгдсөн" };
  if (i.status === "CANCELLED")
    return { key: "CANCELLED", label: "Цуцлагдсан" };
  if (i.isExpired) return { key: "EXPIRED", label: "Хугацаа дууссан" };
  return { key: "PENDING", label: "Хүлээгдэж буй" };
}

export default function InvoicesPage() {
  const [box, setBox] = useState<Box>("receivable");
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetail] = useState<Invoice | null>(null);
  const [payTarget, setPayTarget] = useState<Invoice | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url =
        box === "payable" ? "/api/invoices?box=payable" : "/api/invoices";
      const r = await api<{ invoices: Invoice[] }>(url);
      setItems(r.invoices);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ачаалж чадсангүй");
    } finally {
      setLoading(false);
    }
  }, [box]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter((i) => {
      const st = statusOf(i).key;
      if (statusFilter !== "ALL" && st !== statusFilter) return false;
      if (!t) return true;
      return (
        i.description.toLowerCase().includes(t) ||
        i.id.includes(t) ||
        i.amount.includes(t) ||
        i.issuerName.toLowerCase().includes(t) ||
        i.receiverName.toLowerCase().includes(t)
      );
    });
  }, [items, q, statusFilter]);

  return (
    <div>
      <div className="page-intro">
        <div>
          <div className="eyebrow-dash">
            <span /> ТӨЛБӨР НЭХЭМЖЛЭХ
          </div>
          <h1>Нэхэмжлэлүүд</h1>
          <p>
            Нэхэмжлэл үүсгэж, QR болон холбоосоор хуваалцаж, надад ирсэн
            нэхэмжлэлийг төлнө.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={18} /> Шинэ нэхэмжлэл
        </button>
      </div>

      <div className="inv-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={box === "receivable"}
          className={box === "receivable" ? "active" : ""}
          onClick={() => setBox("receivable")}
        >
          <ArrowDownLeft size={16} /> Авлага <small>миний нэхэмжилсэн</small>
        </button>
        <button
          role="tab"
          aria-selected={box === "payable"}
          className={box === "payable" ? "active" : ""}
          onClick={() => setBox("payable")}
        >
          <ArrowUpRight size={16} /> Өглөг <small>надад ирсэн</small>
        </button>
      </div>

      <div className="inv-panel">
        <div className="inv-toolbar">
          <div className="field">
            <Search size={18} />
            <input
              placeholder="Нэхэмжлэл хайх..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Бүх төлөв</option>
            <option value="PENDING">Хүлээгдэж буй</option>
            <option value="PAID">Төлөгдсөн</option>
            <option value="EXPIRED">Хугацаа дууссан</option>
            <option value="CANCELLED">Цуцлагдсан</option>
          </select>
        </div>

        {error && (
          <div className="error-alert" role="alert">
            {error}
          </div>
        )}

        <div className="inv-table-wrap">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Нэхэмжлэл</th>
                <th>{box === "receivable" ? "Хэнд" : "Хэнээс"}</th>
                <th>Үүсгэсэн</th>
                <th>Дүн</th>
                <th>Төлөв</th>
                <th>Үйлдэл</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6}>Ачаалж байна...</td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    {box === "receivable"
                      ? "Нэхэмжилсэн нэхэмжлэл алга."
                      : "Танд ирсэн нэхэмжлэл алга."}
                  </td>
                </tr>
              )}
              {filtered.map((i) => {
                const st = statusOf(i);
                return (
                  <tr key={i.id}>
                    <td>
                      <b>{i.description || "Нэхэмжлэл"}</b>
                      <br />
                      <small>#{i.id}</small>
                    </td>
                    <td>
                      {box === "receivable"
                        ? i.isDirected
                          ? i.receiverName
                          : "QR (хэн ч төлнө)"
                        : i.issuerName}
                    </td>
                    <td>{when(i.createdAt)}</td>
                    <td>
                      <b>{money(i.amount)}</b>
                    </td>
                    <td>
                      <span className={`inv-badge ${st.key}`}>{st.label}</span>
                    </td>
                    <td>
                      {box === "payable" && st.key === "PENDING" ? (
                        <button
                          className="btn btn-primary"
                          onClick={() => setPayTarget(i)}
                        >
                          Төлөх
                        </button>
                      ) : box === "receivable" ? (
                        <button className="btn" onClick={() => setDetail(i)}>
                          <QrCode size={16} /> QR / Дэлгэрэнгүй
                        </button>
                      ) : (
                        <button className="btn" onClick={() => setDetail(i)}>
                          Дэлгэрэнгүй
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={(inv) => {
            setShowCreate(false);
            setBox("receivable");
            setDetail(inv);
            load();
          }}
        />
      )}
      {detail && (
        <DetailModal
          inv={detail}
          onClose={() => setDetail(null)}
          onChanged={() => {
            setDetail(null);
            load();
          }}
        />
      )}
      {payTarget && (
        <PayModal
          inv={payTarget}
          onClose={() => setPayTarget(null)}
          onPaid={() => {
            setPayTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="inv-overlay"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="inv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="inv-modal-head">
          <h2>{title}</h2>
          <button className="inv-close" aria-label="Хаах" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (i: Invoice) => void;
}) {
  const [mode, setMode] = useState<"QR" | "DIRECT">("QR");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [receiver, setReceiver] = useState<Receiver | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function check() {
    setError("");
    setBusy(true);
    try {
      const r = await api<{ account: Receiver }>("/api/accounts/lookup", {
        method: "POST",
        body: JSON.stringify({ accountNumber }),
      });
      setReceiver(r.account);
    } catch (e) {
      setReceiver(null);
      setError(e instanceof Error ? e.message : "Данс олдсонгүй");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setError("");
    if (!/^[1-9]\d{0,11}$/.test(amount)) {
      setError("Дүн буруу байна");
      return;
    }
    if (mode === "DIRECT" && !receiver) {
      setError("Эхлээд дансны дугаарыг шалгана уу");
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ invoice: Invoice }>("/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          amount,
          description,
          ...(mode === "DIRECT"
            ? { receiverAccountNumber: accountNumber }
            : {}),
        }),
      });
      onCreated(r.invoice);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Шинэ нэхэмжлэл" onClose={onClose}>
      <div className="inv-tabs small">
        <button
          className={mode === "QR" ? "active" : ""}
          onClick={() => setMode("QR")}
        >
          <QrCode size={16} /> QR нэхэмжлэл
        </button>
        <button
          className={mode === "DIRECT" ? "active" : ""}
          onClick={() => setMode("DIRECT")}
        >
          <Hash size={16} /> Хүнд нэхэмжлэх
        </button>
      </div>
      <p className="inv-hint">
        {mode === "QR"
          ? "QR-г хэн ч уншиж төлж болно (жишээ нь дэлгүүрийн касс)."
          : "Зөвхөн таны сонгосон хүн энэ нэхэмжлэлийг төлж чадна."}
      </p>

      {mode === "DIRECT" && (
        <>
          <label htmlFor="inv-acc">Төлөгчийн дансны дугаар</label>
          <div className="field">
            <Hash size={18} />
            <input
              id="inv-acc"
              inputMode="numeric"
              placeholder="Дансны дугаар"
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value.replace(/\D/g, ""));
                setReceiver(null);
              }}
            />
          </div>
          {!receiver ? (
            <button
              className="btn full-btn"
              disabled={busy || !accountNumber}
              onClick={check}
            >
              <Search size={16} /> {busy ? "Шалгаж байна..." : "Шалгах"}
            </button>
          ) : (
            <div className="success-alert">
              <ShieldCheck size={18} />
              <span>
                <b>{receiver.name}</b> · {receiver.accountNumber}
              </span>
            </div>
          )}
        </>
      )}

      <label htmlFor="inv-amount">Дүн</label>
      <div className="amount-input">
        <input
          id="inv-amount"
          inputMode="numeric"
          placeholder="15000"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
        />
        <b>₮</b>
      </div>
      <label htmlFor="inv-desc">Нэхэмжлэлийн утга</label>
      <input
        id="inv-desc"
        className="inv-input"
        maxLength={200}
        placeholder="Жишээ: кофе"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      {error && (
        <div className="error-alert" role="alert">
          {error}
        </div>
      )}
      <button
        className="btn btn-primary full-btn"
        disabled={busy}
        onClick={submit}
      >
        {busy ? "Үүсгэж байна..." : "Нэхэмжлэл үүсгэх"}
      </button>
    </Modal>
  );
}

function DetailModal({
  inv,
  onClose,
  onChanged,
}: {
  inv: Invoice;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const st = statusOf(inv);
  const mine = inv.direction === "RECEIVABLE";

  async function copy() {
    try {
      await navigator.clipboard.writeText(inv.qrText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard боломжгүй */
    }
  }

  async function cancel() {
    if (!confirm("Нэхэмжлэлийг цуцлах уу?")) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/invoices/${inv.id}/cancel`, { method: "POST" });
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа гарлаа");
      setBusy(false);
    }
  }

  return (
    <Modal title={`Нэхэмжлэл #${inv.id}`} onClose={onClose}>
      <div className="inv-detail">
        <h1>{money(inv.amount)}</h1>
        <p>{inv.description || "Нэхэмжлэл"}</p>
        <span className={`inv-badge ${st.key}`}>{st.label}</span>
        <dl>
          <dt>Нэхэмжилсэн</dt>
          <dd>{inv.issuerName || "-"}</dd>
          <dt>Төлөгч</dt>
          <dd>{inv.isDirected ? inv.receiverName : "QR (хэн ч төлнө)"}</dd>
          <dt>Хүчинтэй хугацаа</dt>
          <dd>{when(inv.expiresAt)}</dd>
          {inv.paidAt && (
            <>
              <dt>Төлсөн</dt>
              <dd>{when(inv.paidAt)}</dd>
            </>
          )}
        </dl>

        {st.key === "PENDING" && inv.qrText && (
          <>
            <div className="inv-qr">
              <QRCodeSVG value={inv.qrText} size={200} marginSize={2} />
            </div>
            <p className="inv-hint">
              MDPay апп-аар уншуулбал шууд төлнө. Бусад камераар уншуулбал вэб
              нээгдэж нэвтэрч төлнө.
            </p>
            <div className="inv-link">
              <code>{inv.qrText}</code>
              <button className="btn" onClick={copy}>
                <Copy size={15} /> {copied ? "Хуулсан" : "Хуулах"}
              </button>
            </div>
          </>
        )}
        {st.key === "PAID" && (
          <div className="success-alert">
            <CheckCircle2 size={18} /> Төлөгдсөн
          </div>
        )}
        {error && (
          <div className="error-alert" role="alert">
            {error}
          </div>
        )}
        {mine && st.key === "PENDING" && (
          <button className="btn full-btn" disabled={busy} onClick={cancel}>
            Нэхэмжлэл цуцлах
          </button>
        )}
      </div>
    </Modal>
  );
}

function PayModal({
  inv,
  onClose,
  onPaid,
}: {
  inv: Invoice;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function pay() {
    setBusy(true);
    setError("");
    try {
      await api(`/api/invoices/${inv.id}/pay`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа гарлаа");
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <Modal title="Төлбөр" onClose={onPaid}>
        <div className="success-alert">
          <CheckCircle2 size={18} /> {money(inv.amount)} амжилттай төлөгдлөө.
        </div>
        <button className="btn btn-primary full-btn" onClick={onPaid}>
          Хаах
        </button>
      </Modal>
    );

  return (
    <Modal title="Төлбөр баталгаажуулах" onClose={onClose}>
      <div className="inv-detail">
        <p>
          <b>{inv.issuerName}</b>
        </p>
        <p>{inv.description || "Нэхэмжлэл"}</p>
        <h1>{money(inv.amount)}</h1>
      </div>
      <label htmlFor="inv-pay-pass">Нууц үг</label>
      <div className="field">
        <LockKeyhole size={18} />
        <input
          id="inv-pay-pass"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && password && !busy) pay();
          }}
        />
      </div>
      {error && (
        <div className="error-alert" role="alert">
          {error}
        </div>
      )}
      <button
        className="btn btn-primary full-btn"
        disabled={busy || !password}
        onClick={pay}
      >
        {busy ? "Төлж байна..." : "Төлөх"}
      </button>
    </Modal>
  );
}
