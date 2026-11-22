import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export function fail(message: string, status = 400) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

// Browser form submissions must originate from our own site. Reject missing Origin for mutations.
export function validOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function messageFrom(error: unknown) {
  if (error instanceof ZodError)
    return error.issues[0]?.message || "Оруулсан мэдээлэл буруу байна";
  return "Хүсэлт боловсруулахад алдаа гарлаа";
}
export function toAmount(raw: unknown): bigint | null {
  // Accept only whole tugriks, no exponential notation or decimals.
  if (typeof raw !== "string" || !/^[1-9]\d{0,11}$/.test(raw)) return null;
  const amount = BigInt(raw);
  if (amount > 1_000_000_000_000n) return null;
  return amount;
}
export function currency(amount: bigint | string | number) {
  return Number(amount).toLocaleString("en-US") + " ₮";
}
type DbUser = {
  account_id: number;
  email: string;
  firstname: string | null;
  lastname?: string | null;
  type: string | null;
  business_name: string | null;
  created_at?: Date | null;
};

export function publicUser(user: DbUser) {
  return {
    id: String(user.account_id),
    email: user.email,
    name: [user.firstname, user.lastname].filter(Boolean).join(" "),
    type: user.type ?? "PERSONAL",
    businessName: user.business_name,
    createdAt: user.created_at ?? null,
  };
}
