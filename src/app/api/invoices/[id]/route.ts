import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { serializeInvoice } from "@/lib/serializers";

const nameSelect = {
  firstname: true,
  lastname: true,
  business_name: true,
} as const;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d{1,18}$/.test(id)) return fail("Нэхэмжлэл олдсонгүй", 404);

  const inv = await db.qr_codes.findUnique({
    where: { qr_id: BigInt(id) },
    include: {
      users: { select: nameSelect },
      receiver: { select: nameSelect },
    },
  });
  if (!inv) return fail("Нэхэмжлэл олдсонгүй", 404);

  const user = await getCurrentUser();

  if (inv.receiver_id !== null) {
    if (!user) return fail("Нэвтэрнэ үү", 401);
    if (
      inv.receiver_id !== user.account_id &&
      inv.account_id !== user.account_id
    )
      return fail("Нэхэмжлэл олдсонгүй", 404);
  }

  return ok({ invoice: serializeInvoice(inv, user?.account_id) });
}
