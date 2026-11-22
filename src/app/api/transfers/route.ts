import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  fail,
  ok,
  messageFrom,
  serverError,
  toAmount,
  validOrigin,
} from "@/lib/api";
import {
  TransferError,
  parseAccountNumber,
  performTransfer,
  verifyPassword,
} from "@/lib/transfer";

const schema = z.object({
  accountNumber: z.string(),
  amount: z.string(),
  password: z.string().min(1, "Нууц үгээ оруулна уу"),
  note: z.string().trim().max(200).optional(),
});

export async function POST(req: NextRequest) {
  if (!validOrigin(req))
    return fail("Хүсэлтийн эх сурвалж баталгаажаагүй", 403);
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү", 401);

  try {
    const input = schema.parse(await req.json());
    const to = parseAccountNumber(input.accountNumber);
    if (to === null) return fail("Дансны дугаар буруу байна", 400);
    const amount = toAmount(input.amount);
    if (amount === null) return fail("Дүн буруу байна", 400);

    await verifyPassword(user.account_id, input.password);
    const balance = await performTransfer({
      fromUserId: user.account_id,
      toAccountNumber: to,
      amount,
      note: input.note,
    });
    return ok(
      { success: true, balance: balance ? balance.toFixed(0) : "0" },
      201,
    );
  } catch (e) {
    if (e instanceof TransferError) return fail(e.message, e.status);
    if (e instanceof z.ZodError) return fail(messageFrom(e), 400);
    return serverError("Шилжүүлэхэд алдаа гарлаа", e);
  }
}
