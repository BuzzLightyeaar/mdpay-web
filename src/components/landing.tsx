"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileText,
  Layers3,
  LockKeyhole,
  Menu,
  MoveUpRight,
  Phone,
  QrCode,
  ReceiptText,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Sparkles,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Brand } from "./brand";

const benefits = [
  {
    icon: Zap,
    title: "Шуурхай, хялбар",
    desc: "Төлбөр болон нэхэмжлэлээ нэг дороос удирдах нэгдсэн орчин.",
  },
  {
    icon: ShieldCheck,
    title: "Найдвартай бүтэц",
    desc: "Дансны өөрчлөлтийг transaction түвшинд бүртгэж, мэдээллээ хамгаална.",
  },
  {
    icon: Layers3,
    title: "Бизнесийн өсөлт",
    desc: "Төлбөрийн холбоос, QR, гүйлгээний түүхийг нэг системд нэгтгэнэ.",
  },
];

export default function Landing() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mode, setMode] = useState<"dynamic" | "quick">("dynamic");
  return (
    <div className="landing">
      <header className="land-header">
        <div className="site-container header-inner">
          <Brand light />
          <nav className={`land-nav ${mobileOpen ? "is-open" : ""}`}>
            <a href="#solutions" onClick={() => setMobileOpen(false)}>
              Мерчант
            </a>
            <a href="#qr" onClick={() => setMobileOpen(false)}>
              Вендор
            </a>
            <a href="#about" onClick={() => setMobileOpen(false)}>
              Компани
            </a>
          </nav>
          <div className="land-actions">
            <span className="phone-link">
              <Phone size={15} /> +976 95668585
            </span>
            <Link className="header-login" href="/login">
              Нэвтрэх <ArrowUpRight size={15} />
            </Link>
          </div>
          <button
            aria-label="Цэс"
            className="mobile-menu"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <section className="hero">
        <div className="hero-lines" />{" "}
        <div className="site-container hero-inner">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-dot" /> ТӨЛБӨРИЙН УХААЛАГ ПЛАТФОРМ{" "}
              <Sparkles size={13} />
            </div>
            <h1>
              Төлбөр бүрийг
              <br />
              <span>илүү хялбар</span>
              <br />
              болгоё.
            </h1>
            <p>
              Таны бизнесийн төлбөр тооцоо, нэхэмжлэл, дансны мэдээллийг нэг
              цэгээс удирдах илүү энгийн, илүү ухаалаг шийдэл.
            </p>
            <div className="hero-cta">
              <Link href="/register" className="btn btn-white">
                MDPay-тэй нэгдэх <ArrowUpRight size={18} />
              </Link>
              <a className="btn btn-outline-light" href="#solutions">
                Боломжууд <ArrowRight size={17} />
              </a>
            </div>
            <div className="hero-trust">
              <span className="trust-icon">
                <Check size={15} />
              </span>
              <span>QR төлбөр</span>
              <i />
              <span>Дотоод шилжүүлэг</span>
              <i />
              <span>Нэхэмжлэл</span>
            </div>
          </div>
          <div className="hero-art" aria-label="MDPay QR төлбөрийн загвар">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="art-glow" />
            <div className="float-card float-card-top">
              <span className="float-icon">
                <CheckCircle2 size={21} />
              </span>
              <span>
                <b>Амжилттай төлөгдлөө</b>
                <small>125,000 ₮ · Дөнгөж сая</small>
              </span>
            </div>
            <div className="payment-device">
              <div className="device-camera" />
              <div className="device-screen">
                <div className="device-top">
                  <span className="device-logo">
                    <span className="tiny-symbol">◈</span> MD<span>pay</span>
                  </span>
                  <ScanLine size={17} />
                </div>
                <div className="device-content">
                  <small>Төлөх дүн</small>
                  <strong>125,000 ₮</strong>
                  <div className="qr-frame">
                    <QRCodeSVG
                      value="https://example.com/mdpay-demo"
                      size={146}
                      bgColor="#ffffff"
                      fgColor="#1e2434"
                      marginSize={0}
                    />
                  </div>
                  <p>QR кодыг уншуулж төлнө үү</p>
                </div>
                <div className="device-footer">
                  <LockKeyhole size={12} /> Аюулгүй төлбөр
                </div>
              </div>
            </div>
            <div className="float-card float-card-bottom">
              <div className="balance-icon">
                <WalletCards size={22} />
              </div>
              <div>
                <small>Нийт орлого</small>
                <b>₮ 8,450,000</b>
                <span className="demo-trend">
                  +12.8% <span>демо</span>
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-bottom">
          <div className="site-container">
            <span>
              <span className="status-pulse" /> Нэг платформ. Олон боломж.
            </span>
            <span>ҮР ДҮНТЭЙ • ХУРДАН • ЭНГИЙН</span>
          </div>
        </div>
      </section>
      <section className="solutions section-pad" id="solutions">
        <div className="site-container solution-layout">
          <div className="solution-left">
            <div className="section-kicker">БИЗНЕСТ ЗОРИУЛСАН</div>
            <h2>
              Таны бизнест
              <br />
              таарах <span>төлбөрийн</span>
              <br />
              шийдэл.
            </h2>
            <p>
              Жижиг дэлгүүрээс онлайн үйлчилгээ хүртэл нэхэмжлэлээ үүсгээд,
              төлбөрийн мэдээллээ хянахад хялбар.
            </p>
            <div className="solution-list">
              <div>
                <CheckCircle2 size={20} /> QR кодтой нэхэмжлэл үүсгэх
              </div>
              <div>
                <CheckCircle2 size={20} /> Гүйлгээний түүхээ шалгах
              </div>
              <div>
                <CheckCircle2 size={20} /> Дотоод данс хооронд шилжүүлэх
              </div>
            </div>
            <Link className="btn btn-dark" href="/register">
              Бүртгүүлэх <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="solution-visual">
            <div className="visual-tag">
              <span /> LIVE DEMO
            </div>
            <div className="stat-display">
              <div className="stat-head">
                <span>Таны данс</span>
                <CircleDollarSign size={20} />
              </div>
              <small>Нийт үлдэгдэл</small>
              <strong>1,850,000 ₮</strong>
              <div className="stat-bars">
                {[37, 51, 40, 70, 55, 84, 74, 95, 77, 100, 88, 108].map(
                  (h, i) => (
                    <span key={i} style={{ height: h + "px" }} />
                  ),
                )}
              </div>
              <div className="stat-foot">
                <span>Сүүлийн 12 гүйлгээ</span>
                <span>↑ Демо үзүүлэлт</span>
              </div>
            </div>
            <div className="mini-invoice">
              <div className="mini-invoice-icon">
                <ReceiptText size={23} />
              </div>
              <div>
                <small>Нэхэмжлэл #00042</small>
                <b>350,000 ₮</b>
              </div>
              <span className="paid-label">
                <Check size={13} /> Төлөгдсөн
              </span>
            </div>
          </div>
        </div>
      </section>
      <section className="qr-section section-pad" id="qr">
        <div className="site-container qr-layout">
          <div className="qr-feature-card">
            <div className="qr-feature-orb" />
            <div className="qr-white-card">
              <div className="qr-white-head">
                <span className="qr-white-brand">MDpay</span>
                <span>QR ТӨЛБӨР</span>
              </div>
              <div className="qr-white-amount">
                {mode === "dynamic" ? "85,000 ₮" : "Дүнгээ оруулах"}
              </div>
              <div className="qr-white-code">
                <QRCodeSVG
                  value="https://example.com/mdpay-qr-demo"
                  size={172}
                  fgColor="#142033"
                />
              </div>
              <small>MDPay • Жишээ QR</small>
            </div>
            <div className="qr-float-icon">
              <ScanLine size={29} />
            </div>
          </div>
          <div className="qr-description">
            <div className="section-kicker">QR ШИЙДЭЛ</div>
            <h2>
              Уншуулаад
              <br />
              <span>төлчих.</span>
            </h2>
            <p>
              QR төлбөр болон нэхэмжлэлийн холбоосоор төлбөр авах урсгалыг
              туршиж үзээрэй.
            </p>
            <div className="qr-tabs">
              <button
                className={mode === "dynamic" ? "active" : ""}
                onClick={() => setMode("dynamic")}
              >
                Динамик QR <ArrowRight size={15} />
              </button>
              <button
                className={mode === "quick" ? "active" : ""}
                onClick={() => setMode("quick")}
              >
                Quick QR <ArrowRight size={15} />
              </button>
            </div>
            <div className="qr-mode-info">
              <BadgeCheck size={19} />
              <span>
                {mode === "dynamic"
                  ? "Динамик QR нь дүн, зориулалттай нэхэмжлэлийн холбоос үүсгэнэ."
                  : "Quick QR нь хэрэглэгч төлөх дүнгээ өөрөө оруулах урсгалын загвар юм. Энэ хувилбарт төлбөртэй нэхэмжлэлийн QR ажиллана."}
              </span>
            </div>
          </div>
        </div>
      </section>
      <section className="cta-section" id="about">
        <div className="site-container">
          <div className="cta-box">
            <div>
              <span className="cta-kicker">ШИНЭ ҮЕИЙН ТӨЛБӨР</span>
              <h2>
                Бизнесээ дараагийн
                <br />
                түвшинд гаргая.
              </h2>
              <p>
                MDPay-ийг өнөөдөр туршаад, төлбөр тооцооны шинэ туршлагыг
                эхлүүлээрэй.
              </p>
              <Link className="btn btn-white" href="/register">
                Үнэгүй бүртгүүлэх <ArrowUpRight size={18} />
              </Link>
            </div>
            <div className="cta-decoration">
              <div className="cta-circle">
                M<span>D</span>
              </div>
              <div className="cta-circle cta-circle-small" />
            </div>
          </div>
        </div>
      </section>
      <footer className="footer">
        <div className="site-container footer-main">
          <div>
            <Brand light />
            <p>
              Нэг платформ. Олон боломж.
              <br />
              Туршилтын төлбөрийн систем.
            </p>
          </div>
          <div className="footer-links">
            <a href="#solutions">Мерчант</a>
            <a href="#qr">QR шийдэл</a>
            <Link href="/login">Нэвтрэх</Link>
          </div>
          <div className="footer-contact">
            <b>Холбоо барих</b>
            <span>+976 95668585</span>
            <span>Улаанбаатар, Монгол</span>
          </div>
        </div>
        <div className="site-container footer-bottom">
          <span>© 2026 MDPay. Демо төсөл.</span>
          <span>Бодит банкны төлбөр тооцоо хийгдэхгүй.</span>
        </div>
      </footer>
    </div>
  );
}
