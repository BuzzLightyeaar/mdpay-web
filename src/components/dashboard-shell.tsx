"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  Bell,
  CreditCard,
  FileText,
  Home,
  LogOut,
  Menu,
  MoveLeft,
  PlusCircle,
  Repeat2,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import { Brand } from "./brand";
import { api, type User } from "@/lib/types";

const items = [
  { href: "/dashboard", label: "Хяналтын самбар", icon: Home },
  { href: "/dashboard/invoices", label: "Нэхэмжлэл", icon: FileText },
  { href: "/dashboard/transfers", label: "Мөнгөн шилжүүлэг", icon: Repeat2 },
  {
    href: "/dashboard/transactions",
    label: "Гүйлгээний түүх",
    icon: CreditCard,
  },
];
export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname(),
    router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(true);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let active = true;
    api<{ user: User }>("/api/auth/me")
      .then(({ user }) => {
        if (active) {
          setUser(user);
          setBusy(false);
        }
      })
      .catch(() => {
        if (active) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
          setBusy(false);
        }
      });
    return () => {
      active = false;
    };
  }, [pathname, router]);
  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch {
      alert("Гарахад алдаа гарлаа");
    }
  }
  if (busy)
    return (
      <div className="full-loading">
        <div className="spinner" /> MDPay ачаалж байна...
      </div>
    );
  if (!user) return null;
  const pageTitle = items.find((i) => i.href === pathname)?.label || "MDPay";
  return (
    <div className="dashboard-layout">
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <Brand href="/dashboard" />
          <button
            className="sidebar-close"
            onClick={() => setOpen(false)}
            aria-label="Цэс хаах"
          >
            <X size={20} />
          </button>
        </div>
        <div className="sidebar-workspace">
          <span className="workspace-avatar">
            {(user.businessName || user.name).charAt(0).toUpperCase()}
          </span>
          <span>
            <small>МИНИЙ ХЭТЭВЧ</small>
            <b>{user.businessName || user.name}</b>
          </span>
          <span className="workspace-dot" />
        </div>
        <div className="sidebar-label">ҮНДСЭН ЦЭС</div>
        <nav className="side-links">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={pathname === item.href ? "side-active" : ""}
            >
              <item.icon size={19} />
              {item.label}
              {pathname === item.href && <span className="side-active-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-lower">
          <div className="sidebar-tip">
            <div className="tip-icon">
              <ShieldCheck size={21} />
            </div>
            <b>Демо горим идэвхтэй</b>
            <p>Бодит банкны гүйлгээ биш, туршилтын хэтэвч ашиглаж байна.</p>
          </div>
          <button className="sidebar-logout" onClick={logout}>
            <LogOut size={18} /> Гарах
          </button>
        </div>
      </aside>
      <div className="dashboard-main">
        <header className="dash-header">
          <div className="dash-header-left">
            <button
              className="dash-mobile-toggle"
              onClick={() => setOpen(!open)}
            >
              <Menu size={22} />
            </button>
            <div>
              <div className="dash-header-breadcrumb">
                MDPay <span>/</span> Workspace
              </div>
              <h2>{pageTitle}</h2>
            </div>
          </div>
          <div className="dash-header-right">
            <span className="demo-pill">
              <span /> DEMO
            </span>
            <Link className="header-quick" href="/dashboard/invoices">
              <PlusCircle size={17} /> Нэхэмжлэл
            </Link>
            <div className="user-avatar" title={user.email}>
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        <main className="dash-content">{children}</main>
      </div>
      {open && (
        <button
          aria-label="Цэс хаах"
          className="sidebar-overlay"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
