import { NextRequest } from "next/server";
import { clearSession } from "@/lib/auth";
import { fail, ok, validOrigin } from "@/lib/api";
export async function POST(req: NextRequest) {
  if (!validOrigin(req)) return fail("Хүсэлтийн эх сурвалж баталгаажаагүй", 403);
  await clearSession();
  return ok({ success: true });
}
