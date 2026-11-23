import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  fail,
  ok,
  messageFrom,
  serverError,
  toAmount,
  validOrigin,
} from "@/lib/api";
import { serializeInvoice } from "@/lib/serializers";
import { TransferError } from "@/lib/transfer";
import { appBaseUrl, createInvoice } from "@/lib/invoice-create";

const nameSelect = {
  firstname: true,
  lastname: true,
  business_name: true,
} as const;

// GET /api/invoices            -> авлага (миний нэхэмжилсэн)
// GET /api/invoices?box=payable -> өглөг (надад ирсэн)
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү", 401);

  const payable = req.nextUrl.searchParams.get("box") === "payable";
  const items = await db.qr_codes.findMany({
    where: payable
      ? { receiver_id: user.account_id }
      : { account_id: user.account_id },
    include: {
      users: { select: nameSelect },
      receiver: { select: nameSelect },
    },
    orderBy: { created_at: "desc" },
    take: 100,
  });
  return ok({
    invoices: items.map((i) => serializeInvoice(i, user.account_id)),
  });
}

const createSchema = z.object({
  amount: z.string(),
  description: z.string().trim().max(200).optional(),
  receiverAccountNumber: z.string().trim().optional(),
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

    const created = await createInvoice({
      userId: user.account_id,
      amount,
      description: input.description,
      receiverAccountNumber: input.receiverAccountNumber,
      baseUrl: appBaseUrl(req),
    });
    return ok({ invoice: serializeInvoice(created, user.account_id) }, 201);
  } catch (e) {
    if (e instanceof TransferError) return fail(e.message, e.status);
    if (e instanceof z.ZodError) return fail(messageFrom(e), 400);
    return serverError("Нэхэмжлэл үүсгэхэд алдаа гарлаа", e);
  }
}
