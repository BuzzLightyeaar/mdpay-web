"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
  Building2,
} from "lucide-react";
import { Brand } from "./brand";
import { api } from "@/lib/types";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const search = useSearchParams();
  const [type, setType] = useState<"PERSONAL" | "BUSINESS">("BUSINESS");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isLogin = mode === "login";
  const returnTo = search.get("next");
  const afterAuth =
    returnTo?.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : "/dashboard";
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api(`/api/auth/${isLogin ? "login" : "register"}`, {
        method: "POST",
        body: JSON.stringify(
          isLogin
            ? { email, password }
            : { email, password, name, type, businessName },
        ),
      });

      if (isLogin) {
        router.push(afterAuth);
        router.refresh();
      } else {
        // Бүртгэл амжилттай, нэвтрэх хуудас руу шилжинэ
        router.push("/login");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-screen">
      <div className="auth-left">
        <Link href="/" className="auth-back">
          ← Нүүр хуудас
        </Link>
        <div className="auth-panel-info">
          <div className="auth-overline">
            <span /> MDPAY FINANCIAL PLATFORM
          </div>
          <h1>
            Санхүүгээ
            <br />
            <em>ухаалгаар</em>
            <br />
            удирд.
          </h1>
          <p>Төлбөр, нэхэмжлэл, шилжүүлэг — бүгд нэг системд.</p>
          <div className="auth-info-card">
            <ShieldCheck size={23} />
            <span>
              <strong>Аюулгүй туршилтын орчин</strong>
              <small>Энэ хувилбарт бодит мөнгөн гүйлгээ хийхгүй.</small>
            </span>
          </div>
        </div>
        <div className="auth-left-foot">© 2026 MDPay • Demo</div>
      </div>
      <div className="auth-right">
        <div className="auth-topline">
          <Brand />
          <span>Тусламж: +976 95668585</span>
        </div>
        <div className="auth-form-wrap">
          <div className="auth-title">
            <span className="auth-micro">MDPAY ACCOUNT</span>
            <h2>{isLogin ? "Тавтай морил!" : "Бүртгэл үүсгэх"}</h2>
            <p>
              {isLogin
                ? "Өөрийн бүртгэлээр нэвтэрч, дансаа удирдаарай."
                : "Дансаа нээж, QR нэхэмжлэлээ үүсгэж эхлээрэй."}
            </p>
          </div>
          <div className="auth-switch">
            <Link href="/login" className={isLogin ? "selected" : ""}>
              Нэвтрэх
            </Link>
            <Link href="/register" className={!isLogin ? "selected" : ""}>
              Бүртгүүлэх
            </Link>
          </div>
          <form onSubmit={submit} className="auth-fields">
            {!isLogin && (
              <>
                <label>Хэрэглэгчийн төрөл</label>
                <div className="type-switch">
                  <button
                    type="button"
                    className={type === "PERSONAL" ? "active" : ""}
                    onClick={() => setType("PERSONAL")}
                  >
                    <UserRound size={16} /> Иргэн
                  </button>
                  <button
                    type="button"
                    className={type === "BUSINESS" ? "active" : ""}
                    onClick={() => setType("BUSINESS")}
                  >
                    <Building2 size={16} /> Байгууллага
                  </button>
                </div>
                <label htmlFor="auth-name">Овог, нэр</label>
                <div className="field">
                  <UserRound size={18} />
                  <input
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Таны нэр"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                  />
                </div>
                {type === "BUSINESS" && (
                  <>
                    <label htmlFor="auth-business">Байгууллагын нэр</label>
                    <div className="field">
                      <Building2 size={18} />
                      <input
                        id="auth-business"
                        type="text"
                        placeholder="Байгууллагын нэр"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        required
                        minLength={2}
                      />
                    </div>
                  </>
                )}
              </>
            )}
            <label htmlFor="auth-email">И-мэйл хаяг</label>
            <div className="field">
              <Mail size={18} />
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <label htmlFor="auth-password">Нууц үг</label>
            <div className="field">
              <LockKeyhole size={18} />
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                autoComplete={isLogin ? "current-password" : "new-password"}
                placeholder={
                  isLogin ? "Нууц үг" : "10 буюу түүнээс олон тэмдэгт"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={isLogin ? 1 : 10}
              />
              <button
                type="button"
                className="reveal"
                aria-label={showPassword ? "Нууц үг нуух" : "Нууц үг харуулах"}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && (
              <div className="error-alert" role="alert">
                {error}
              </div>
            )}
            <button
              disabled={busy}
              type="submit"
              className="btn btn-primary auth-submit"
            >
              {busy
                ? "Түр боловсруулж байна..."
                : isLogin
                  ? "Нэвтрэх"
                  : "Бүртгүүлэх"}
              <ArrowRight size={18} />
            </button>
          </form>
          {isLogin ? (
            <div className="demo-credentials">
              <b>Демо эрхээр турших</b>
              <span>
                Байгууллага:{" "}
                <button
                  onClick={() => {
                    setEmail("merchant@mdpay.mn");
                    setPassword("Demo12345!");
                  }}
                >
                  merchant@mdpay.mn <ArrowUpRight size={13} />
                </button>
              </span>
              <span>
                Иргэн:{" "}
                <button
                  onClick={() => {
                    setEmail("customer@mdpay.mn");
                    setPassword("Demo12345!");
                  }}
                >
                  customer@mdpay.mn <ArrowUpRight size={13} />
                </button>
              </span>
              <small>
                Нууц үг: Demo12345! • Эхлээд <code>npm run db:seed</code>{" "}
                ажиллуулна.
              </small>
            </div>
          ) : (
            <div className="auth-note">
              <Check size={15} /> Бүртгэл үүсгэснээр 0 ₮ үлдэгдэлтэй тест данс
              нээгдэнэ.
            </div>
          )}
          <div className="auth-footnote">
            Бодит банк, картын төлбөрийн холболт энэ демод байхгүй.
          </div>
        </div>
      </div>
    </div>
  );
}
