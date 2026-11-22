import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, messageFrom, toAmount, validOrigin } from "@/lib/api";

const schema = z.object({
  email: z
    .email("И-мэйл хаяг буруу байна")
    .transform((x) => x.trim().toLowerCase()),
  amount: z.string(),
  note: z.string().trim().max(200).optional(),
});

class TransferError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function POST(req: NextRequest) {
  if (!validOrigin(req))
    return fail("Хүсэлтийн эх сурвалж баталгаажаагүй", 403);
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү", 401);

  try {
    const input = schema.parse(await req.json());
    const amount = toAmount(input.amount);
    if (amount === null) return fail("Дүн буруу байна", 400);
    const amt = new Prisma.Decimal(amount.toString());

    const receiver = await db.users.findUnique({
      where: { email: input.email },
    });
    if (!receiver) return fail("Хүлээн авагч олдсонгүй", 404);
    if (receiver.account_id === user.account_id)
      return fail("Өөр рүүгээ шилжүүлэх боломжгүй", 400);

    const result = await db.$transaction(async (tx) => {
      const [from, to] = await Promise.all([
        tx.accounts.findFirst({
          where: { account_id: user.account_id },
          orderBy: { id: "asc" },
        }),
        tx.accounts.findFirst({
          where: { account_id: receiver.account_id },
          orderBy: { id: "asc" },
        }),
      ]);
      if (!from) throw new TransferError("Таны данс олдсонгүй", 404);
      if (!to) throw new TransferError("Хүлээн авагчийн данс олдсонгүй", 404);

      // Хоёр дансыг тогтмол дарааллаар түгжинэ (deadlock-оос сэргийлнэ)
      await tx.$queryRaw`SELECT id FROM accounts WHERE id IN (${from.id}, ${to.id}) ORDER BY id FOR UPDATE`;

      const fresh = await tx.accounts.findUniqueOrThrow({
        where: { id: from.id },
      });
      if ((fresh.balance ?? new Prisma.Decimal(0)).lt(amt))
        throw new TransferError("Үлдэгдэл хүрэлцэхгүй байна", 400);

      const sender = await tx.accounts.update({
        where: { id: from.id },
        data: { balance: { decrement: amt } },
      });
      const recipient = await tx.accounts.update({
        where: { id: to.id },
        data: { balance: { increment: amt } },
      });

      const description = input.note || "Мөнгөн шилжүүлэг";
      await tx.transactions.createMany({
        data: [
          {
            account_id: user.account_id,
            default_account_id: from.account_number,
            secondary_account_id: to.account_number,
            amount: amt,
            transaction_type: "TRANSFER_OUT",
            description,
            balance: sender.balance,
          },
          {
            account_id: receiver.account_id,
            default_account_id: from.account_number,
            secondary_account_id: to.account_number,
            amount: amt,
            transaction_type: "TRANSFER_IN",
            description,
            balance: recipient.balance,
          },
        ],
      });
      return sender.balance;
    });

    return ok(
      { success: true, balance: result ? result.toFixed(0) : "0" },
      201,
    );
  } catch (e) {
    if (e instanceof TransferError) return fail(e.message, e.status);
    if (e instanceof z.ZodError) return fail(messageFrom(e), 400);
    console.error("Transfer error", e);
    return fail("Шилжүүлэхэд алдаа гарлаа", 500);
  }
}
