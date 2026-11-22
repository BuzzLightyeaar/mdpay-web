import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, validOrigin } from "@/lib/api";
import { lookupAccount, parseAccountNumber } from "@/lib/transfer";

export async function POST(req: NextRequest) {
  if (!validOrigin(req))
    return fail("Хүсэлтийн эх сурвалж баталгаажаагүй", 403);
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү", 401);

  const body = await req.json().catch(() => ({}));
  const num = parseAccountNumber(body.accountNumber);
  if (num === null) return fail("Дансны дугаар буруу байна", 400);

  const account = await lookupAccount(num);
  if (!account) return fail("Данс олдсонгүй", 404);
  return ok({ account });
}
