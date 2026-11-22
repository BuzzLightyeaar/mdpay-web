import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, messageFrom, toAmount, validOrigin } from "@/lib/api";
import { serializeInvoice } from "@/lib/serializers";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү", 401);
  const items = await db.qr_codes.findMany({
    where: { account_id: user.account_id },
    orderBy: { created_at: "desc" },
    take: 100,
  });
  return ok({ invoices: items.map(serializeInvoice) });
}

const createSchema = z.object({
  amount: z.string(),
  description: z.string().trim().max(200).optional(),
});

export async function POST(req: NextRequest) {
  if (!validOrigin(req))
    return fail("Хүсэлтийн эх сурвалж баталгаажаагүй", 403);
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү", 401);
  try {
    const input = createSchema.parse(await req.json());
    const amount = toAmount(input.amount);
    if (amount === null) return fail("Дүн буруу байна", 400);

    const account = await db.accounts.findFirst({
      where: { account_id: user.account_id },
      orderBy: { id: "asc" },
    });
    if (!account) return fail("Данс олдсонгүй", 404);

    const qrText = `mdpay://pay?to=${account.account_number}&amount=${amount}&ref=${crypto.randomUUID().slice(0, 8)}`;
    const created = await db.qr_codes.create({
      data: {
        account_id: user.account_id,
        account_number: account.account_number,
        qr_text: qrText,
        amount: amount.toString(),
        description: input.description ?? null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    return ok({ invoice: serializeInvoice(created) }, 201);
  } catch (e) {
    if (e instanceof z.ZodError) return fail(messageFrom(e), 400);
    console.error("Invoice create error", e);
    return fail("Нэхэмжлэл үүсгэхэд алдаа гарлаа", 500);
  }
}
