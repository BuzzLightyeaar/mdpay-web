import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { fail, ok, messageFrom, publicUser, validOrigin } from "@/lib/api";
import { z } from "zod";
import { hash } from "bcryptjs";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Нэрээ оруулна уу").max(100),
  email: z.email("И-мэйл хаяг буруу байна").transform(x => x.toLowerCase()),
  password: z.string().min(10, "Нууц үг хамгийн багадаа 10 тэмдэгттэй байна").max(128),
  type: z.enum(["PERSONAL", "BUSINESS"]),
  businessName: z.string().trim().max(120).optional(),
}).refine(v => v.type !== "BUSINESS" || (v.businessName?.length ?? 0) >= 2,
  { message: "Байгууллагын нэр шаардлагатай", path: ["businessName"] });

export async function POST(req: NextRequest) {
  if (!validOrigin(req)) return fail("Хүсэлтийн эх сурвалж баталгаажаагүй", 403);

  try {
    const data = registerSchema.parse(await req.json());
    const passwordhash = await hash(data.password, 12);

    // Nested create нь нэг transaction: хэрэглэгч + данс хамт үүснэ
    const user = await db.users.create({
      data: {
        firstname: data.name,
        email: data.email,
        passwordhash,
        type: data.type,
        business_name: data.type === "BUSINESS" ? data.businessName! : null,
        accounts: {
          create: { account_token: crypto.randomUUID().slice(0, 20) },
        },
      },
    });

    return ok({ user: publicUser(user) }, 201);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
      return fail("Энэ и-мэйл хаяг бүртгэлтэй байна", 409);
    if (error instanceof z.ZodError) return fail(messageFrom(error), 400);
    console.error("Registration error", error);
    return fail("Бүртгэхэд алдаа гарлаа", 500);
  }
}