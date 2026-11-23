import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, messageFrom, serverError, validOrigin } from "@/lib/api";
import { TransferError, verifyPassword } from "@/lib/transfer";
import { payInvoice } from "@/lib/invoice-pay";

const bodySchema = z.object({
  password: z.string().min(1, "Нууц үгээ оруулна уу"),
});

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
    const { password } = bodySchema.parse(await req.json().catch(() => ({})));
    await verifyPassword(user.account_id, password);
    const balance = await payInvoice(user.account_id, BigInt(id));
    return ok({ success: true, balance: balance ? balance.toFixed(0) : "0" });
  } catch (e) {
    if (e instanceof TransferError) return fail(e.message, e.status);
    if (e instanceof z.ZodError) return fail(messageFrom(e), 400);
    return serverError("Төлөхөд алдаа гарлаа", e);
  }
}
