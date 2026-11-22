import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { serializeEntry } from "@/lib/serializers";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү", 401);
  const rows = await db.transactions.findMany({
    where: { account_id: user.account_id },
    orderBy: { created_at: "desc" },
    take: 100,
  });
  return ok({ transactions: rows.map(serializeEntry) });
}
