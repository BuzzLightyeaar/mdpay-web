import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, publicUser } from "@/lib/api";
import { serializeEntry, serializeInvoice } from "@/lib/serializers";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү", 401);

  const [account, recentTransactions, recentInvoices, invoiceCount] = await Promise.all([
    db.accounts.findFirst({
      where: { account_id: user.account_id },
      orderBy: { id: "asc" },
    }),
    db.transactions.findMany({
      where: { account_id: user.account_id },
      orderBy: { created_at: "desc" },
      take: 5,
    }),
    db.qr_codes.findMany({
      where: { account_id: user.account_id },
      orderBy: { created_at: "desc" },
      take: 4,
    }),
    db.qr_codes.count({ where: { account_id: user.account_id } }),
  ]);

  return ok({
    user: publicUser(user),
    balance: account?.balance ? account.balance.toFixed(0) : "0",
    walletId: account?.account_number.toString() ?? "",
    pendingInvoices: invoiceCount,
    recentTransactions: recentTransactions.map(serializeEntry),
    recentInvoices: recentInvoices.map(serializeInvoice),
  });
}