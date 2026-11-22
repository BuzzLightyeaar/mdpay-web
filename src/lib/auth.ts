import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";

const COOKIE_NAME = "mdpay_session";
const secret = () => {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32)
    throw new Error("AUTH_SECRET must be set to >= 32 characters");
  return new TextEncoder().encode(value);
};

export async function setSession(userId: string | number) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime("7d")
    .setIssuer("mdpay-demo")
    .sign(secret());
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: "mdpay-demo",
      algorithms: ["HS256"],
    });
    const accountId = Number(payload.sub);
    if (!payload.sub || !Number.isInteger(accountId)) return null;
    return await db.users.findUnique({
      where: { account_id: accountId },
      select: {
        account_id: true,
        email: true,
        firstname: true,
        lastname: true,
        type: true,
        business_name: true,
        created_at: true,
      },
    });
  } catch {
    return null;
  }
}
