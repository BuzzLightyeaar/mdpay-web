"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  Info,
  Mail,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { api, fmtMoney, type Summary } from "@/lib/types";
import { ErrorBlock, Spinner } from "@/components/ui";
export default function TransfersPage() {
  const [balance, setBalance] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<Summary>("/api/dashboard/summary")
      .then((d) => setBalance(d.balance))
      .catch((e) => setError(e.message));
  }, []);
  async function send(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const r = await api<{ referenceId: string; balance: string }>(
        "/api/transfers",
        {
          method: "POST",
          body: JSON.stringify({ recipientEmail, amount, note }),
        },
      );
      setBalance(r.balance);
      setSuccess(
        `Шилжүүлэг амжилттай. Гүйлгээний №: ${r.referenceId.slice(0, 8).toUpperCase()}`,
      );
      setAmount("");
      setNote("");
      setRecipientEmail("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Шилжүүлэг амжилтгүй боллоо");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <div className="page-intro">
        <div>
          <div className="eyebrow-dash">
            <span /> MDPAY WALLET
          </div>
          <h1>Мөнгөн шилжүүлэг</h1>
          <p>Бүртгэлтэй MDPay хэрэглэгч рүү демо төгрөг шилжүүлэх.</p>
        </div>
      </div>
      <div className="transfer-layout">
        <div className="transfer-form-panel">
          <div className="panel-title">
            <span className="panel-title-icon">
              <ArrowLeftRight size={22} />
            </span>
            <div>
              <h2>Шилжүүлэг хийх</h2>
              <p>Хүлээн авагчийн MDPay и-мэйл хаягийг оруулна уу.</p>
            </div>
          </div>
          <form onSubmit={send} className="transfer-form">
            <label htmlFor="to-email">Хүлээн авагчийн и-мэйл</label>
            <div className="field">
              <Mail size={18} />
              <input
                id="to-email"
                type="email"
                placeholder="customer@mdpay.mn"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                required
              />
            </div>
            <label htmlFor="transfer-money">Шилжүүлэх дүн</label>
            <div className="amount-input">
              <input
                id="transfer-money"
                type="number"
                min="1"
                max="1000000000000"
                step="1"
                placeholder="10000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <b>₮</b>
            </div>
            <label htmlFor="transfer-note">Гүйлгээний утга</label>
            <textarea
              id="transfer-note"
              maxLength={200}
              rows={4}
              placeholder="Гүйлгээний утга бичих (сонголттой)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="notice-line">
              <Info size={16} /> Шилжүүлэг зөвхөн дотоод демо хэтэвч хооронд
              хийгдэнэ.
            </div>
            {error && (
              <div className="error-alert" role="alert">
                {error}
              </div>
            )}
            {success && (
              <div className="success-alert" role="status">
                <CheckCircle2 size={19} />
                {success}
              </div>
            )}
            <button
              className="btn btn-primary full-btn"
              disabled={busy || balance === null}
              type="submit"
            >
              {busy ? "Шилжүүлж байна..." : "Шилжүүлэг хийх"}
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
        <aside className="transfer-side">
          <div className="transfer-balance">
            <span>
              <Wallet size={20} /> Ашиглах боломжтой үлдэгдэл
            </span>
            <strong>{balance === null ? "..." : fmtMoney(balance)}</strong>
            <small>MDPay туршилтын данс</small>
          </div>
          <div className="transfer-help">
            <ShieldCheck size={24} />
            <h3>Аюулгүй туршилтын орчин</h3>
            <p>
              Эндэх шилжүүлэг PostgreSQL-д бодит transaction-оор бүртгэгдэх
              боловч банкны системд мөнгө шилжихгүй.
            </p>
            <div className="test-recipient">
              <b>Туршилтын хүлээн авагч</b>
              <code>customer@mdpay.mn</code>
              <small>Демо өгөгдөл үүсгэсэн бол ажиллана.</small>
            </div>
            <Link href="/dashboard/transactions">
              Гүйлгээний түүх <ArrowUpRight size={15} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
