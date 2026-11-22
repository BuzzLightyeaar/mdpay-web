import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { serializeEntry } from "@/lib/serializers";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү", 401);
  const rows = await db.walletEntry.findMany({ where: { wallet: { userId: user.id } }, orderBy: { createdAt: "desc" }, take: 100 });
  return ok({ transactions: rows.map(serializeEntry) });
}
