import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, validOrigin } from "@/lib/api";

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

  const result = await db.qr_codes.updateMany({
    where: {
      qr_id: BigInt(id),
      account_id: user.account_id,
      status: "PENDING",
    },
    data: { status: "CANCELLED" },
  });
  if (result.count === 0)
    return fail("Нэхэмжлэл олдсонгүй эсвэл цуцлах боломжгүй", 404);
  return ok({ success: true });
}
