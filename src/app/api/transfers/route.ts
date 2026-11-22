import { NextRequest } from "next/server";
import { Prisma, EntryKind } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, toAmount, validOrigin } from "@/lib/api";

const schema = z.object({
  recipientEmail: z.email(),
  amount: z.string(),
  note: z.string().trim().max(200).default("Дотоод шилжүүлэг"),
});
export async function POST(req: NextRequest) {
  if (!validOrigin(req)) return fail("Хүсэлтийн эх сурвалж баталгаажаагүй", 403);
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү", 401);
  let input: z.infer<typeof schema>;
  try { input = schema.parse(await req.json()); }
  catch { return fail("Шилжүүлгийн мэдээлэл буруу байна"); }
  const amount = toAmount(input.amount);
  if (!amount) return fail("Дүн 1–1,000,000,000,000 ₮ бүхэл тоо байх шаардлагатай");
  const recipient = await db.user.findUnique({ where: { email: input.recipientEmail.trim().toLowerCase() } });
  if (!recipient) return fail("Хүлээн авагч бүртгэлгүй байна", 404);
  if (recipient.id === user.id) return fail("Өөрийн данс руу шилжүүлэх боломжгүй");

  try {
    const ref = crypto.randomUUID();
    const result = await db.$transaction(async (tx) => {
      const senderWallet = await tx.wallet.findUniqueOrThrow({ where: { userId: user.id } });
      const receiverWallet = await tx.wallet.findUniqueOrThrow({ where: { userId: recipient.id } });
      const debit = await tx.wallet.updateMany({
        where: { id: senderWallet.id, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      });
      if (debit.count !== 1) throw new Error("INSUFFICIENT_BALANCE");
      const [sender, receiver] = await Promise.all([
        tx.wallet.findUniqueOrThrow({ where: { id: senderWallet.id } }),
        tx.wallet.update({ where: { id: receiverWallet.id }, data: { balance: { increment: amount } } }),
      ]);
      await tx.walletEntry.createMany({ data: [
        { walletId: sender.id, amount: -amount, balanceAfter: sender.balance, kind: EntryKind.TRANSFER_SENT,
          note: input.note || "Дотоод шилжүүлэг", counterpartyName: recipient.businessName || recipient.name, referenceId: ref },
        { walletId: receiver.id, amount, balanceAfter: receiver.balance, kind: EntryKind.TRANSFER_RECEIVED,
          note: input.note || "Дотоод шилжүүлэг", counterpartyName: user.businessName || user.name, referenceId: ref },
      ] });
      return sender.balance;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return ok({ success: true, referenceId: ref, balance: result.toString() });
  } catch (e) {
    if (e instanceof Error && e.message === "INSUFFICIENT_BALANCE") return fail("Дансны үлдэгдэл хүрэлцэхгүй байна", 409);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034")
      return fail("Давхацсан гүйлгээ илэрлээ. Дахин оролдоно уу", 409);
    console.error("Transfer failed", e);
    return fail("Шилжүүлэг хийхэд алдаа гарлаа", 500);
  }
}
