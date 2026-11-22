import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { serializeInvoice } from "@/lib/serializers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d{1,18}$/.test(id)) return fail("Нэхэмжлэл олдсонгүй", 404);

  const invoice = await db.qr_codes.findUnique({
    where: { qr_id: BigInt(id) },
  });
  if (!invoice) return fail("Нэхэмжлэл олдсонгүй", 404);

  // Нэхэмжлэл төлөх хуудас нэвтрээгүй хүнд ч нээгдэж болно (хуучин логик),
  // гэхдээ эзэмшигчийн нэрийг зөвхөн нийтэд харуулах хэмжээнд өгнө.
  const owner = invoice.account_id
    ? await db.users.findUnique({
        where: { account_id: invoice.account_id },
        select: { firstname: true, lastname: true, business_name: true },
      })
    : null;

  const issuerName =
    owner?.business_name ||
    [owner?.firstname, owner?.lastname].filter(Boolean).join(" ") ||
    "";

  return ok({ invoice: { ...serializeInvoice(invoice), issuerName } });
}
