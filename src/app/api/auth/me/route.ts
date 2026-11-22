import { getCurrentUser } from "@/lib/auth";
import { fail, ok, publicUser } from "@/lib/api";
export async function GET() {
  const user = await getCurrentUser();
  return user ? ok({ user: publicUser(user) }) : fail("Нэвтэрнэ үү", 401);
}
