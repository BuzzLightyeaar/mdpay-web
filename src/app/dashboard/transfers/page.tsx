"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Hash,
  Info,
  LockKeyhole,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { api, fmtMoney, type Summary } from "@/lib/types";

type Receiver = { accountNumber: string; name: string; currency: string };

export default function TransfersPage() {
  const [balance, setBalance] = useState<string | null>(null);
  const [myAccount, setMyAccount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [receiver, setReceiver] = useState<Receiver | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [password, setPassword] = useState("");
  const [askPassword, setAskPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Summary>("/api/dashboard/summary")
      .then((d) => {
        setBalance(d.balance);
        setMyAccount((d as { walletId?: string }).walletId ?? "");
      })
      .catch((e) => setError(e.message));
  }, []);

  function resetCheck() {
    setReceiver(null);
    setAskPassword(false);
    setPassword("");
    setError("");
  }

  async function check() {
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const r = await api<{ account: Receiver }>("/api/accounts/lookup", {
        method: "POST",
        body: JSON.stringify({ accountNumber: accountNumber.trim() }),
      });
      setReceiver(r.account);
    } catch (e) {
      setReceiver(null);
      setError(e instanceof Error ? e.message : "Данс олдсонгүй");
    } finally {
      setBusy(false);
    }
  }

  function goPassword() {
    if (!/^[1-9]\d{0,11}$/.test(amount.trim())) {
      setError("Дүн буруу байна");
      return;
    }
    setError("");
    setAskPassword(true);
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!askPassword) return;
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const r = await api<{ balance: string }>("/api/transfers", {
        method: "POST",
        body: JSON.stringify({
          accountNumber: accountNumber.trim(),
          amount: amount.trim(),
          password,
          note,
        }),
      });
      setBalance(r.balance);
      setSuccess(
        `${receiver?.name} руу ${amount.trim()} ₮ амжилттай шилжүүллээ.`,
      );
      setAccountNumber("");
      setReceiver(null);
      setAmount("");
      setNote("");
      setPassword("");
      setAskPassword(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Шилжүүлэг амжилтгүй боллоо");
      setPassword("");
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
          <p>
            Бүртгэлтэй MDPay хэрэглэгч рүү дансны дугаараар демо төгрөг
            шилжүүлэх.
          </p>
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
              <p>Хүлээн авагчийн дансны дугаарыг оруулж шалгана уу.</p>
            </div>
          </div>
          <form onSubmit={send} className="transfer-form">
            {!askPassword ? (
              <>
                <label htmlFor="to-account">
                  Хүлээн авагчийн дансны дугаар
                </label>
                <div className="field">
                  <Hash size={18} />
                  <input
                    id="to-account"
                    inputMode="numeric"
                    placeholder="Дансны дугаар"
                    value={accountNumber}
                    onChange={(e) => {
                      setAccountNumber(e.target.value.replace(/\D/g, ""));
                      resetCheck();
                    }}
                  />
                </div>

                {!receiver ? (
                  <button
                    type="button"
                    className="btn btn-primary full-btn"
                    disabled={busy || !accountNumber.trim()}
                    onClick={check}
                  >
                    <Search size={18} />
                    {busy ? "Шалгаж байна..." : "Шалгах"}
                  </button>
                ) : (
                  <>
                    <div className="success-alert" role="status">
                      <ShieldCheck size={19} />
                      <span>
                        <b>{receiver.name}</b> · Данс: {receiver.accountNumber}
                      </span>
                    </div>
                    <label htmlFor="transfer-money">Шилжүүлэх дүн</label>
                    <div className="amount-input">
                      <input
                        id="transfer-money"
                        inputMode="numeric"
                        placeholder="10000"
                        value={amount}
                        onChange={(e) =>
                          setAmount(e.target.value.replace(/\D/g, ""))
                        }
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
                  </>
                )}
              </>
            ) : (
              <>
                <div className="notice-line">
                  <Info size={16} />
                  {receiver?.name} руу <b>&nbsp;{amount} ₮&nbsp;</b> шилжүүлнэ.
                  Нууц үгээ оруулж баталгаажуулна уу.
                </div>
                <label htmlFor="transfer-pass">Нууц үг</label>
                <div className="field">
                  <LockKeyhole size={18} />
                  <input
                    id="transfer-pass"
                    type="password"
                    autoFocus
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

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

            {receiver && !askPassword && (
              <button
                type="button"
                className="btn btn-primary full-btn"
                disabled={busy || balance === null}
                onClick={goPassword}
              >
                Шилжүүлэг хийх <ArrowRight size={18} />
              </button>
            )}
            {askPassword && (
              <>
                <button
                  className="btn btn-primary full-btn"
                  disabled={busy || !password}
                  type="submit"
                >
                  {busy ? "Шилжүүлж байна..." : "Баталгаажуулах"}
                  <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  className="btn full-btn"
                  disabled={busy}
                  onClick={() => {
                    setAskPassword(false);
                    setPassword("");
                    setError("");
                  }}
                >
                  Буцах
                </button>
              </>
            )}
          </form>
        </div>
        <aside className="transfer-side">
          <div className="transfer-balance">
            <span>
              <Wallet size={20} /> Ашиглах боломжтой үлдэгдэл
            </span>
            <strong>{balance === null ? "..." : fmtMoney(balance)}</strong>
            <small>
              {myAccount ? `Миний данс: ${myAccount}` : "MDPay туршилтын данс"}
            </small>
          </div>
          <div className="transfer-help">
            <ShieldCheck size={24} />
            <h3>Аюулгүй туршилтын орчин</h3>
            <p>
              Эндэх шилжүүлэг PostgreSQL-д бодит transaction-оор бүртгэгдэх
              боловч банкны системд мөнгө шилжихгүй.
            </p>
            <div className="test-recipient">
              <b>Миний дансны дугаар</b>
              <code>{myAccount || "..."}</code>
              <small>Бусдад шилжүүлэг хүлээн авахдаа энэ дугаарыг өгнө.</small>
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
