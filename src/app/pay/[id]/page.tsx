"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  FileText,
  LockKeyhole,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { api, fmtDate, fmtMoney, type Invoice } from "@/lib/types";
import { StatusChip, Spinner } from "@/components/ui";

export default function PaymentPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [logged, setLogged] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [paid, setPaid] = useState(false);

  async function refresh() {
    try {
      const r = await api<{ invoice: Invoice }>(`/api/invoices/${id}`);
      setInvoice(r.invoice);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Нэхэмжлэл олдсонгүй");
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    void refresh();
    api<{ balance: string }>("/api/dashboard/summary")
      .then((r) => {
        setLogged(true);
        setBalance(r.balance);
      })
      .catch(() => setLogged(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function pay() {
    setError("");
    setBusy(true);
    try {
      const r = await api<{ balance: string }>(`/api/invoices/${id}/pay`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setBalance(r.balance);
      setPaid(true);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Төлбөр амжилтгүй боллоо");
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  const loginHref = `/login?next=${encodeURIComponent(`/pay/${id}`)}`;
  const needsLogin = !invoice && loadError === "Нэвтэрнэ үү";
  const isOwn = invoice?.direction === "RECEIVABLE" && logged;
  const blocked =
    !!invoice &&
    (invoice.isExpired ||
      invoice.status === "CANCELLED" ||
      invoice.status === "PAID");

  return (
    <div className="payment-page">
      <header className="payment-header">
        <Brand />
        <div>
          <ShieldCheck size={18} /> MDPay аюулгүй демо төлбөр
        </div>
      </header>
      <div className="payment-background">
        <div className="payment-layout">
          <div className="payment-side">
            <Link href="/" className="payment-return">
              <ArrowLeft size={17} /> Нүүр хуудас
            </Link>
            <div className="payment-side-copy">
              <div className="eyebrow">
                <span className="eyebrow-dot" /> MDPAY CHECKOUT
              </div>
              <h1>
                Төлбөрөө
                <br />
                энгийнээр.
              </h1>
              <p>
                Төлбөрийн мэдээллээ шалгаж, MDPay дансаараа туршилтын төлбөр
                төлөөрэй.
              </p>
              <div>
                <LockKeyhole size={17} /> Энэ хуудсаар бодит мөнгө шилжихгүй.
              </div>
            </div>
          </div>
          <div className="checkout-card">
            {!loaded ? (
              <Spinner />
            ) : needsLogin ? (
              <div className="payment-error">
                <LockKeyhole size={40} />
                <h2>Нэвтэрч орно уу</h2>
                <p>Энэ нэхэмжлэлийг харахын тулд нэвтрэх шаардлагатай.</p>
                <Link className="btn btn-primary full-btn" href={loginHref}>
                  Нэвтрэх <ArrowRight size={17} />
                </Link>
              </div>
            ) : !invoice ? (
              <div className="payment-error">
                <XCircle size={40} />
                <h2>Нэхэмжлэл олдсонгүй</h2>
                <p>{loadError}</p>
              </div>
            ) : paid || invoice.status === "PAID" ? (
              <div className="checkout-success">
                <div className="big-check">
                  <CheckCircle2 size={47} />
                </div>
                <span>ТӨЛБӨР АМЖИЛТТАЙ</span>
                <h2>{fmtMoney(invoice.amount)}</h2>
                <p>Нэхэмжлэлийн төлбөр бүртгэгдлээ.</p>
                <div className="checkout-detail">
                  <span>Нэхэмжлэл</span>
                  <b>#{invoice.id}</b>
                </div>
                <Link href="/dashboard" className="btn btn-primary full-btn">
                  Хяналтын самбар <ArrowRight size={18} />
                </Link>
              </div>
            ) : (
              <>
                <div className="checkout-top">
                  <div className="checkout-merchant">
                    <div className="merchant-icon">
                      {invoice.issuerName.charAt(0)}
                    </div>
                    <div>
                      <span>ТӨЛБӨР ХҮЛЭЭН АВАГЧ</span>
                      <b>{invoice.issuerName}</b>
                    </div>
                  </div>
                  <StatusChip invoice={invoice} />
                </div>
                <div className="checkout-main">
                  <div className="checkout-caption">Төлөх нийт дүн</div>
                  <div className="checkout-total">
                    {fmtMoney(invoice.amount)}
                  </div>
                  <div className="checkout-description">
                    <FileText size={18} />
                    {invoice.description}
                  </div>
                  <div className="checkout-detail">
                    <span>Нэхэмжлэлийн дугаар</span>
                    <b>#{invoice.id}</b>
                  </div>
                  <div className="checkout-detail">
                    <span>Хүчинтэй хугацаа</span>
                    <b>{fmtDate(invoice.expiresAt)}</b>
                  </div>
                </div>
                <div className="checkout-action">
                  <h3>
                    <CreditCard size={19} /> MDPay хэтэвч
                  </h3>
                  {logged && (
                    <p>
                      Таны үлдэгдэл:{" "}
                      <b>{balance !== null ? fmtMoney(balance) : "..."}</b>
                    </p>
                  )}
                  {blocked ? (
                    <div className="error-alert">
                      Энэ нэхэмжлэлийг төлөх боломжгүй.
                    </div>
                  ) : !logged ? (
                    <Link className="btn btn-primary full-btn" href={loginHref}>
                      Төлөхийн тулд нэвтрэх <ArrowRight size={17} />
                    </Link>
                  ) : isOwn ? (
                    <div className="error-alert">
                      Энэ таны өөрийн нэхэмжлэл тул өөрөө төлөх боломжгүй.
                    </div>
                  ) : (
                    <>
                      <label htmlFor="pay-pass">
                        Нууц үгээ оруулж баталгаажуулна уу
                      </label>
                      <div className="field">
                        <LockKeyhole size={18} />
                        <input
                          id="pay-pass"
                          type="password"
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && password && !busy)
                              void pay();
                          }}
                        />
                      </div>
                      <button
                        disabled={busy || !password}
                        onClick={() => void pay()}
                        className="btn btn-primary full-btn"
                      >
                        {busy ? "Боловсруулж байна..." : "MDPay-ээр төлөх"}
                        <ArrowRight size={18} />
                      </button>
                    </>
                  )}
                  {error && (
                    <div className="error-alert" role="alert">
                      {error}
                    </div>
                  )}
                  <div className="checkout-disclaimer">
                    <ShieldCheck size={15} /> Туршилтын төлбөр — бодит банкны
                    гүйлгээ биш.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <footer className="payment-footer">© 2026 MDPay</footer>
    </div>
  );
}
