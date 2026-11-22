"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CirclePlus,
  Clock3,
  CreditCard,
  FilePlus2,
  Receipt,
  RefreshCw,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { api, fmtMoney, type Summary } from "@/lib/types";
import {
  EntriesTable,
  EmptyState,
  ErrorBlock,
  Spinner,
  StatusChip,
} from "@/components/ui";
export default function DashboardHome() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let mounted = true;
    api<Summary>("/api/dashboard/summary")
      .then((r) => {
        if (mounted) setData(r);
      })
      .catch((e) => {
        if (mounted) setError(e.message);
      });
    return () => {
      mounted = false;
    };
  }, [retry]);
  if (error)
    return (
      <ErrorBlock
        error={error}
        retry={() => {
          setError("");
          setRetry((x) => x + 1);
        }}
      />
    );
  if (!data) return <Spinner />;
  return (
    <div className="dashboard-home">
      <div className="dash-welcome">
        <div>
          <div className="eyebrow-dash">
            <span /> ТАНЫ САНХҮҮГИЙН ТОЙМ
          </div>
          <h1>
            Сайн байна уу, {data.user.name}! <span>✳</span>
          </h1>
          <p>Таны MDPay дансны өнөөдрийн мэдээлэл.</p>
        </div>
        <div className="welcome-date">MDPAY / DEMO WALLET</div>
      </div>
      <div className="dashboard-cards">
        <div className="balance-card">
          <div className="balance-card-top">
            <span>
              <Wallet size={18} /> Үндсэн дансны үлдэгдэл
            </span>
            <span className="balance-card-chip">MNT</span>
          </div>
          <div className="balance-big">{fmtMoney(data.balance)}</div>
          <div className="balance-card-bottom">
            <span>
              <span className="balance-card-dot" /> Туршилтын данс
            </span>
            <span>MDPAY WALLET</span>
          </div>
          <div className="card-ring ring-a" />
          <div className="card-ring ring-b" />
        </div>
        <div className="metric-card">
          <div className="metric-top">
            <span>Хүлээгдэж буй нэхэмжлэл</span>
            <span className="metric-icon purple">
              <Receipt size={22} />
            </span>
          </div>
          <div className="metric-count">
            {data.pendingInvoices.toString().padStart(2, "0")}
          </div>
          <Link href="/dashboard/invoices">
            Нэхэмжлэл харах <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="metric-card">
          <div className="metric-top">
            <span>Сүүлийн гүйлгээ</span>
            <span className="metric-icon blue">
              <TrendingUp size={22} />
            </span>
          </div>
          <div className="metric-count">
            {data.recentTransactions.length.toString().padStart(2, "0")}
          </div>
          <Link href="/dashboard/transactions">
            Түүх харах <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
      <div className="quick-section">
        <div className="block-head">
          <div>
            <h3>Шуурхай үйлдлүүд</h3>
            <p>Таны өдөр тутмын үйлдлүүд нэг товшилтоор.</p>
          </div>
        </div>
        <div className="quick-grid">
          <Link href="/dashboard/invoices" className="quick-action">
            <span className="quick-icon quick-violet">
              <FilePlus2 size={25} />
            </span>
            <span>
              <b>Нэхэмжлэл үүсгэх</b>
              <small>QR кодтой төлбөр нэхэмжлэх</small>
            </span>
            <ArrowUpRight className="quick-arrow" size={20} />
          </Link>
          <Link href="/dashboard/transfers" className="quick-action">
            <span className="quick-icon quick-blue">
              <ArrowUpRight size={25} />
            </span>
            <span>
              <b>Мөнгө шилжүүлэх</b>
              <small>MDPay хэрэглэгч рүү шилжүүлэх</small>
            </span>
            <ArrowUpRight className="quick-arrow" size={20} />
          </Link>
          <Link href="/dashboard/transactions" className="quick-action">
            <span className="quick-icon quick-green">
              <CreditCard size={25} />
            </span>
            <span>
              <b>Гүйлгээ шалгах</b>
              <small>Дансны хөдөлгөөнөө хянах</small>
            </span>
            <ArrowUpRight className="quick-arrow" size={20} />
          </Link>
        </div>
      </div>
      <div className="dash-grid-bottom">
        <section className="dash-white-block">
          <div className="block-head">
            <div>
              <h3>Сүүлийн гүйлгээнүүд</h3>
              <p>Таны дансны хамгийн сүүлийн хөдөлгөөн.</p>
            </div>
            <Link href="/dashboard/transactions">
              Бүгдийг харах <ArrowRight size={16} />
            </Link>
          </div>
          {data.recentTransactions.length ? (
            <EntriesTable entries={data.recentTransactions} />
          ) : (
            <EmptyState
              title="Гүйлгээ хараахан алга"
              description="Шилжүүлэг эсвэл нэхэмжлэлийн төлбөр хийвэл энд харагдана."
            />
          )}
        </section>
        <section className="dash-white-block invoice-short">
          <div className="block-head">
            <div>
              <h3>Нэхэмжлэлүүд</h3>
              <p>Сүүлд үүсгэсэн нэхэмжлэл.</p>
            </div>
            <Link href="/dashboard/invoices">
              Харах <ArrowRight size={16} />
            </Link>
          </div>
          {data.recentInvoices.length ? (
            data.recentInvoices.map((inv) => (
              <Link
                href={`/pay/${inv.id}`}
                className="short-invoice"
                key={inv.id}
              >
                <span className="short-invoice-icon">
                  <Receipt size={19} />
                </span>
                <span className="short-invoice-detail">
                  <b>{inv.description}</b>
                  <small>#{inv.id.slice(0, 8)}</small>
                </span>
                <span className="short-invoice-right">
                  <strong>{fmtMoney(inv.amount)}</strong>
                  <StatusChip invoice={inv} />
                </span>
              </Link>
            ))
          ) : (
            <EmptyState
              title="Нэхэмжлэл алга"
              description="Анхны нэхэмжлэлээ үүсгээрэй."
              actionHref="/dashboard/invoices"
              actionLabel="Нэхэмжлэл үүсгэх"
            />
          )}
        </section>
      </div>
    </div>
  );
}
