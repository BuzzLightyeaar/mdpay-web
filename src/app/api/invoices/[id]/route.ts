import { db } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { serializeInvoice } from "@/lib/serializers";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Нэхэмжлэл олдсонгүй", 404);
  const invoice = await db.invoice.findUnique({ where: { id }, include: {
    issuer: { select: { name: true, businessName: true } },
  } });
  if (!invoice) return fail("Нэхэмжлэл олдсонгүй", 404);
  return ok({ invoice: serializeInvoice(invoice) });
}
