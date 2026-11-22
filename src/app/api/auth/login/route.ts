import { NextRequest } from "next/server";
import { z } from "zod";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { setSession } from "@/lib/auth";
import { fail, ok, validOrigin, publicUser } from "@/lib/api";

const schema = z.object({ email: z.email(), password: z.string().min(1) });

export async function POST(req: NextRequest) {
  if (!validOrigin(req))
    return fail("Хүсэлтийн эх сурвалж баталгаажаагүй", 403);
  try {
    const { email, password } = schema.parse(await req.json());
    const user = await db.users.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user || !(await compare(password, user.passwordhash)))
      return fail("И-мэйл эсвэл нууц үг буруу байна", 401);

    await setSession(user.account_id);
    return ok({ user: publicUser(user) });
  } catch (e) {
    if (e instanceof z.ZodError) return fail("Буруу мэдээлэл оруулсан байна");
    console.error(e);
    return fail("Нэвтрэхэд алдаа гарлаа", 500);
  }
}
