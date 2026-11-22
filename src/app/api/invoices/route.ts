import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, ok, toAmount, validOrigin } from "@/lib/api";
import { serializeInvoice } from "@/lib/serializers";

const schema = z.object({ amount: z.string(), description: z.string().trim().min(3).max(200) });
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү", 401);
  const items = await db.invoice.findMany({ where: { issuerId: user.id },
    include: { issuer: { select: { name: true, businessName: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  return ok({ invoices: items.map(serializeInvoice) });
}
export async function POST(req: NextRequest) {
  if (!validOrigin(req)) return fail("Хүсэлтийн эх сурвалж баталгаажаагүй", 403);
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү", 401);
  let input: z.infer<typeof schema>;
  try { input = schema.parse(await req.json()); } catch { return fail("Нэхэмжлэлийн мэдээлэл буруу байна"); }
  const amount = toAmount(input.amount);
  if (!amount) return fail("Нэхэмжлэлийн дүн буруу байна");
  const invoice = await db.invoice.create({ data: {
    issuerId: user.id, amount, description: input.description,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  }, include: { issuer: { select: { name: true, businessName: true } } } });
  return ok({ invoice: serializeInvoice(invoice) }, 201);
}
