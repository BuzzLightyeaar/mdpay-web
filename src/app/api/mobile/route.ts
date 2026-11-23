import { NextRequest } from "next/server";
import { z } from "zod";
import { SignJWT, jwtVerify } from "jose";
import { compare, hash } from "bcryptjs";
import { db } from "@/lib/db";
import {
  fail,
  ok,
  messageFrom,
  publicUser,
  serverError,
  toAmount,
} from "@/lib/api";
import { serializeEntry, serializeInvoice } from "@/lib/serializers";
import {
  TransferError,
  lookupAccount,
  parseAccountNumber,
  performTransfer,
  verifyPassword,
} from "@/lib/transfer";
import { appBaseUrl, createInvoice } from "@/lib/invoice-create";
import { payInvoice } from "@/lib/invoice-pay";

/* ---------- Token ---------- */
const ISSUER = "mdpay-demo";
const AUDIENCE = "mobile";
const nameSelect = {
  firstname: true,
  lastname: true,
  business_name: true,
} as const;

const secret = () => {
  const v = process.env.AUTH_SECRET;
  if (!v || v.length < 32)
    throw new Error("AUTH_SECRET must be set to >= 32 characters");
  return new TextEncoder().encode(v);
};

const signToken = (accountId: number) =>
  new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(accountId))
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());

async function authUser(req: NextRequest) {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });
    const id = Number(payload.sub);
    if (!Number.isInteger(id)) return null;
    return await db.users.findUnique({
      where: { account_id: id },
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

/* ---------- Хүсэлтийн schema ---------- */
const body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("register"),
    name: z.string().trim().min(2, "Нэрээ оруулна уу").max(100),
    email: z.email("И-мэйл хаяг буруу байна").transform((x) => x.toLowerCase()),
    password: z
      .string()
      .min(10, "Нууц үг хамгийн багадаа 10 тэмдэгттэй байна")
      .max(128),
    type: z.enum(["PERSONAL", "BUSINESS"]).default("PERSONAL"),
    businessName: z.string().trim().max(120).optional(),
  }),
  z.object({
    action: z.literal("login"),
    email: z.email().transform((x) => x.trim().toLowerCase()),
    password: z.string().min(1),
  }),
  z.object({ action: z.literal("me") }),
  z.object({ action: z.literal("summary") }),
  z.object({ action: z.literal("transactions") }),
  z.object({
    action: z.literal("invoices"),
    box: z.enum(["receivable", "payable"]).optional(),
  }),
  z.object({
    action: z.literal("create_invoice"),
    amount: z.string(),
    description: z.string().trim().max(200).optional(),
    receiverAccountNumber: z.string().trim().optional(),
  }),
  z.object({
    action: z.literal("get_invoice"),
    code: z.string().min(1).max(500),
  }),
  z.object({
    action: z.literal("pay_invoice"),
    id: z.string(),
    password: z.string().min(1, "Нууц үгээ оруулна уу"),
  }),
  z.object({ action: z.literal("lookup_account"), accountNumber: z.string() }),
  z.object({
    action: z.literal("transfer"),
    accountNumber: z.string(),
    amount: z.string(),
    password: z.string().min(1, "Нууц үгээ оруулна уу"),
    note: z.string().trim().max(200).optional(),
  }),
]);

/* ---------- Handler ---------- */
export async function POST(req: NextRequest) {
  try {
    const input = body.parse(await req.json());

    if (input.action === "register") {
      if (input.type === "BUSINESS" && (input.businessName?.length ?? 0) < 2)
        return fail("Байгууллагын нэр шаардлагатай", 400);
      const user = await db.users.create({
        data: {
          firstname: input.name,
          email: input.email,
          passwordhash: await hash(input.password, 12),
          type: input.type,
          business_name: input.type === "BUSINESS" ? input.businessName! : null,
          accounts: {
            create: { account_token: crypto.randomUUID().slice(0, 20) },
          },
        },
      });
      return ok(
        { token: await signToken(user.account_id), user: publicUser(user) },
        201,
      );
    }

    if (input.action === "login") {
      const user = await db.users.findUnique({ where: { email: input.email } });
      if (!user || !(await compare(input.password, user.passwordhash)))
        return fail("И-мэйл эсвэл нууц үг буруу байна", 401);
      return ok({
        token: await signToken(user.account_id),
        user: publicUser(user),
      });
    }

    const user = await authUser(req);
    if (!user) return fail("Нэвтэрнэ үү", 401);

    switch (input.action) {
      case "me":
        return ok({ user: publicUser(user) });

      case "summary": {
        const [account, recentTransactions, recentInvoices, invoiceCount] =
          await Promise.all([
            db.accounts.findFirst({
              where: { account_id: user.account_id },
              orderBy: { id: "asc" },
            }),
            db.transactions.findMany({
              where: { account_id: user.account_id },
              orderBy: { created_at: "desc" },
              take: 5,
            }),
            db.qr_codes.findMany({
              where: { account_id: user.account_id },
              include: {
                users: { select: nameSelect },
                receiver: { select: nameSelect },
              },
              orderBy: { created_at: "desc" },
              take: 4,
            }),
            db.qr_codes.count({
              where: { receiver_id: user.account_id, status: "PENDING" },
            }),
          ]);
        return ok({
          user: publicUser(user),
          balance: account?.balance ? account.balance.toFixed(0) : "0",
          walletId: account?.account_number.toString() ?? "",
          pendingInvoices: invoiceCount,
          recentTransactions: recentTransactions.map(serializeEntry),
          recentInvoices: recentInvoices.map((i) =>
            serializeInvoice(i, user.account_id),
          ),
        });
      }

      case "transactions": {
        const rows = await db.transactions.findMany({
          where: { account_id: user.account_id },
          orderBy: { created_at: "desc" },
          take: 100,
        });
        return ok({ transactions: rows.map(serializeEntry) });
      }

      case "invoices": {
        const rows = await db.qr_codes.findMany({
          where:
            input.box === "payable"
              ? { receiver_id: user.account_id }
              : { account_id: user.account_id },
          include: {
            users: { select: nameSelect },
            receiver: { select: nameSelect },
          },
          orderBy: { created_at: "desc" },
          take: 100,
        });
        return ok({
          invoices: rows.map((r) => serializeInvoice(r, user.account_id)),
        });
      }

      case "create_invoice": {
        const amount = toAmount(input.amount);
        if (amount === null) return fail("Дүн буруу байна", 400);
        const created = await createInvoice({
          userId: user.account_id,
          amount,
          description: input.description,
          receiverAccountNumber: input.receiverAccountNumber,
          baseUrl: appBaseUrl(req),
        });
        return ok(
          {
            invoice: serializeInvoice(created, user.account_id),
            qrText: created.qr_text,
          },
          201,
        );
      }

      case "get_invoice": {
        const code = input.code.trim();
        const m = code.match(/\/pay\/(\d{1,18})(?:[/?#]|$)/);
        const inv = await db.qr_codes.findFirst({
          where: m ? { qr_id: BigInt(m[1]) } : { qr_text: code },
          include: {
            users: { select: nameSelect },
            receiver: { select: nameSelect },
          },
        });
        if (!inv) return fail("QR код танигдсангүй", 404);
        if (
          inv.receiver_id !== null &&
          inv.receiver_id !== user.account_id &&
          inv.account_id !== user.account_id
        )
          return fail("Энэ нэхэмжлэл таньд хаягласан биш байна", 403);
        return ok({ invoice: serializeInvoice(inv, user.account_id) });
      }

      case "pay_invoice": {
        if (!/^\d{1,18}$/.test(input.id))
          return fail("Нэхэмжлэл олдсонгүй", 404);
        await verifyPassword(user.account_id, input.password);
        const balance = await payInvoice(user.account_id, BigInt(input.id));
        return ok({
          success: true,
          balance: balance ? balance.toFixed(0) : "0",
        });
      }

      case "lookup_account": {
        const num = parseAccountNumber(input.accountNumber);
        if (num === null) return fail("Дансны дугаар буруу байна", 400);
        const account = await lookupAccount(num);
        if (!account) return fail("Данс олдсонгүй", 404);
        return ok({ account });
      }

      case "transfer": {
        const to = parseAccountNumber(input.accountNumber);
        if (to === null) return fail("Дансны дугаар буруу байна", 400);
        const amount = toAmount(input.amount);
        if (amount === null) return fail("Дүн буруу байна", 400);
        await verifyPassword(user.account_id, input.password);
        const balance = await performTransfer({
          fromUserId: user.account_id,
          toAccountNumber: to,
          amount,
          note: input.note,
        });
        return ok(
          { success: true, balance: balance ? balance.toFixed(0) : "0" },
          201,
        );
      }
    }
  } catch (error) {
    if (error instanceof TransferError)
      return fail(error.message, error.status);
    if (error instanceof z.ZodError) return fail(messageFrom(error), 400);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    )
      return fail("Энэ и-мэйл хаяг бүртгэлтэй байна", 409);
    return serverError("Серверийн алдаа гарлаа", error);
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204 });
}
