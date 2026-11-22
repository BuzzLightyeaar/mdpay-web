import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, validOrigin } from "@/lib/api";
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!validOrigin(req)) return fail("Хүсэлтийн эх сурвалж баталгаажаагүй", 403);
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү", 401);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Нэхэмжлэл олдсонгүй", 404);
  const result = await db.invoice.updateMany({ where: { id, issuerId: user.id, status: "PENDING" }, data: { status: "CANCELLED" } });
  if (!result.count) return fail("Цуцлах боломжгүй нэхэмжлэл", 409);
  return ok({ success: true });
}
