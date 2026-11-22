import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, validOrigin } from "@/lib/api";

class PayError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!validOrigin(req))
    return fail("Хүсэлтийн эх сурвалж баталгаажаагүй", 403);
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү", 401);

  const { id } = await params;
  if (!/^\d{1,18}$/.test(id)) return fail("Нэхэмжлэл олдсонгүй", 404);

  try {
    const balance = await db.$transaction(async (tx) => {
      const invoice = await tx.qr_codes.findUnique({
        where: { qr_id: BigInt(id) },
      });
      if (!invoice) throw new PayError("Нэхэмжлэл олдсонгүй", 404);
      if (invoice.account_id === user.account_id)
        throw new PayError("Өөрийн нэхэмжлэлийг төлөх боломжгүй", 400);
      if ((invoice.status ?? "PENDING") !== "PENDING")
        throw new PayError("Энэ нэхэмжлэл төлөх боломжгүй төлөвтэй байна", 409);
      if (invoice.expires_at && invoice.expires_at.getTime() <= Date.now())
        throw new PayError("Нэхэмжлэлийн хугацаа дууссан", 410);
      if (!invoice.amount || invoice.account_number === null)
        throw new PayError("Нэхэмжлэлийн мэдээлэл дутуу байна", 400);

      const amount = invoice.amount;

      const [from, to] = await Promise.all([
        tx.accounts.findFirst({
          where: { account_id: user.account_id },
          orderBy: { id: "asc" },
        }),
        tx.accounts.findUnique({
          where: { account_number: invoice.account_number },
        }),
      ]);
      if (!from) throw new PayError("Таны данс олдсонгүй", 404);
      if (!to) throw new PayError("Хүлээн авагчийн данс олдсонгүй", 404);
      if (from.id === to.id)
        throw new PayError("Өөрийн данс руу төлөх боломжгүй", 400);

      // Хоёр дансыг тогтмол дарааллаар түгжинэ (deadlock-оос сэргийлнэ)
      await tx.$queryRaw`SELECT id FROM accounts WHERE id IN (${from.id}, ${to.id}) ORDER BY id FOR UPDATE`;

      // Нэхэмжлэлийг атомаар "төлөгдсөн" болгоно (давхар төлөлтөөс сэргийлнэ)
      const marked = await tx.qr_codes.updateMany({
        where: { qr_id: invoice.qr_id, status: "PENDING" },
        data: {
          status: "PAID",
          paid_at: new Date(),
          payer_id: user.account_id,
        },
      });
      if (marked.count !== 1)
        throw new PayError("Энэ нэхэмжлэл аль хэдийн төлөгдсөн", 409);

      // Үлдэгдэл хүрэлцэхгүй бол count = 0, throw хийж бүгдийг буцаана
      const debit = await tx.accounts.updateMany({
        where: { id: from.id, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      });
      if (debit.count !== 1)
        throw new PayError("Үлдэгдэл хүрэлцэхгүй байна", 400);

      await tx.accounts.update({
        where: { id: to.id },
        data: { balance: { increment: amount } },
      });

      const [sender, receiver] = await Promise.all([
        tx.accounts.findUniqueOrThrow({ where: { id: from.id } }),
        tx.accounts.findUniqueOrThrow({ where: { id: to.id } }),
      ]);

      const description = invoice.description || "Нэхэмжлэлийн төлбөр";
      await tx.transactions.createMany({
        data: [
          {
            account_id: user.account_id,
            default_account_id: from.account_number,
            secondary_account_id: to.account_number,
            amount,
            transaction_type: "TRANSFER_OUT",
            description,
            balance: sender.balance,
          },
          {
            account_id: invoice.account_id,
            default_account_id: from.account_number,
            secondary_account_id: to.account_number,
            amount,
            transaction_type: "TRANSFER_IN",
            description,
            balance: receiver.balance,
          },
        ],
      });

      return sender.balance;
    });

    return ok({ success: true, balance: balance ? balance.toFixed(0) : "0" });
  } catch (e) {
    if (e instanceof PayError) return fail(e.message, e.status);
    console.error("Invoice pay error", e);
    return fail("Төлөхөд алдаа гарлаа", 500);
  }
}
