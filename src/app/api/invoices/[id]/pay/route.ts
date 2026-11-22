import { NextRequest } from "next/server";
import { Prisma, EntryKind } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, validOrigin } from "@/lib/api";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!validOrigin(req)) return fail("Хүсэлтийн эх сурвалж баталгаажаагүй", 403);
  const user = await getCurrentUser();
  if (!user) return fail("Төлбөр төлөхийн тулд нэвтэрнэ үү", 401);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Нэхэмжлэл олдсонгүй", 404);
  try {
    await db.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id }, include: {
        issuer: { select: { name: true, businessName: true } },
      } });
      if (!invoice) throw new Error("NOT_FOUND");
      if (invoice.issuerId === user.id) throw new Error("OWN_INVOICE");
      if (invoice.status !== "PENDING" || invoice.expiresAt <= new Date()) throw new Error("NOT_PAYABLE");
      const senderWallet = await tx.wallet.findUniqueOrThrow({ where: { userId: user.id } });
      const receiverWallet = await tx.wallet.findUniqueOrThrow({ where: { userId: invoice.issuerId } });
      const debit = await tx.wallet.updateMany({
        where: { id: senderWallet.id, balance: { gte: invoice.amount } },
        data: { balance: { decrement: invoice.amount } },
      });
      if (!debit.count) throw new Error("INSUFFICIENT_BALANCE");
      const marked = await tx.invoice.updateMany({
        where: { id, status: "PENDING", expiresAt: { gt: new Date() } },
        data: { status: "PAID", payerId: user.id, paidAt: new Date() },
      });
      if (!marked.count) throw new Error("NOT_PAYABLE");
      const [sender, receiver] = await Promise.all([
        tx.wallet.findUniqueOrThrow({ where: { id: senderWallet.id } }),
        tx.wallet.update({ where: { id: receiverWallet.id }, data: { balance: { increment: invoice.amount } } }),
      ]);
      await tx.walletEntry.createMany({ data: [
        { walletId: sender.id, amount: -invoice.amount, balanceAfter: sender.balance,
          kind: EntryKind.INVOICE_PAYMENT_SENT, note: invoice.description,
          counterpartyName: invoice.issuer.businessName || invoice.issuer.name, referenceId: invoice.id },
        { walletId: receiver.id, amount: invoice.amount, balanceAfter: receiver.balance,
          kind: EntryKind.INVOICE_PAYMENT_RECEIVED, note: invoice.description,
          counterpartyName: user.businessName || user.name, referenceId: invoice.id },
      ] });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return ok({ success: true, invoiceId: id });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "NOT_FOUND") return fail("Нэхэмжлэл олдсонгүй", 404);
      if (e.message === "OWN_INVOICE") return fail("Өөрийн нэхэмжлэлийг төлөх боломжгүй", 400);
      if (e.message === "NOT_PAYABLE") return fail("Нэхэмжлэл төлөгдсөн, цуцлагдсан эсвэл хугацаа дууссан", 409);
      if (e.message === "INSUFFICIENT_BALANCE") return fail("Үлдэгдэл хүрэлцэхгүй байна", 409);
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034")
      return fail("Гүйлгээ давхацлаа. Нэхэмжлэлийн төлөвийг шалгана уу", 409);
    console.error("Invoice payment failed", e);
    return fail("Төлбөр боловсруулахад алдаа гарлаа", 500);
  }
}
