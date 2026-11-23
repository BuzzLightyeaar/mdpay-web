import { NextRequest } from "next/server";
import { z } from "zod";
import { SignJWT, jwtVerify } from "jose";
import { compare, hash } from "bcryptjs";
import { db } from "@/lib/db";
import { fail, ok, messageFrom, publicUser, toAmount } from "@/lib/api";
import { serializeEntry, serializeInvoice } from "@/lib/serializers";
import {
  TransferError,
  lookupAccount,
  parseAccountNumber,
  performTransfer,
  verifyPassword,
} from "@/lib/transfer";

const ISSUER = "mdpay";
const AUDIENCE = "mobile";

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

function ownerDisplayName(
  u: {
    firstname: string | null;
    lastname: string | null;
    business_name: string | null;
  } | null,
) {
  if (!u) return "MDPay хэрэглэгч";
  return (
    u.business_name ||
    [u.firstname, u.lastname].filter(Boolean).join(" ") ||
    "MDPay хэрэглэгч"
  );
}

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
  z.object({ action: z.literal("invoices") }),
  z.object({
    action: z.literal("create_invoice"),
    amount: z.string(),
    description: z.string().trim().max(200).optional(),
  }),
  z.object({
    action: z.literal("create_quick_qr"),
    description: z.string().trim().max(200).optional(),
  }),
  z.object({
    action: z.literal("resolve_qr"),
    qrText: z.string().trim().min(1, "QR код хоосон байна"),
  }),
  z.object({
    action: z.literal("pay_invoice"),
    invoiceId: z.string().trim().min(1),
  }),
  z.object({
    action: z.literal("cancel_invoice"),
    invoiceId: z.string().trim().min(1),
  }),
  z.object({
    action: z.literal("quick_pay"),
    accountNumber: z.string(),
    amount: z.string(),
    note: z.string().trim().max(200).optional(),
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
              orderBy: { created_at: "desc" },
              take: 4,
            }),
            db.qr_codes.count({
              where: { account_id: user.account_id, status: "PENDING" },
            }),
          ]);
        return ok({
          user: publicUser(user),
          balance: account?.balance ? account.balance.toFixed(0) : "0",
          walletId: account?.account_number.toString() ?? "",
          pendingInvoices: invoiceCount,
          recentTransactions: recentTransactions.map(serializeEntry),
          recentInvoices: recentInvoices.map(serializeInvoice),
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
          where: { account_id: user.account_id },
          orderBy: { created_at: "desc" },
          take: 100,
        });
        const origin = (
          process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
        ).replace(/\/$/, "");
        return ok({
          invoices: rows.map((row) => ({
            ...serializeInvoice(row),
            qrText: `${origin}/pay/${row.qr_id.toString()}`,
          })),
        });
      }

      case "create_invoice": {
        const amount = toAmount(input.amount);
        if (amount === null) return fail("Дүн буруу байна", 400);

        const account = await db.accounts.findFirst({
          where: { account_id: user.account_id },
          orderBy: { id: "asc" },
        });
        if (!account) return fail("Данс олдсонгүй", 404);

        const origin = (
          process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
        ).replace(/\/$/, "");

        const created = await db.qr_codes.create({
          data: {
            account_id: user.account_id,
            account_number: account.account_number,
            qr_text: "",
            amount: amount.toString(),
            description: input.description ?? null,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });

        const qrText = `${origin}/pay/${created.qr_id.toString()}`;
        const updated = await db.qr_codes.update({
          where: { qr_id: created.qr_id },
          data: { qr_text: qrText },
        });

        return ok({ invoice: serializeInvoice(updated), qrText }, 201);
      }

      case "create_quick_qr": {
        const account = await db.accounts.findFirst({
          where: { account_id: user.account_id },
          orderBy: { id: "asc" },
        });
        if (!account) return fail("Данс олдсонгүй", 404);

        const note = (input.description ?? "").trim();
        const params = new URLSearchParams({
          to: account.account_number.toString(),
          ...(note ? { note } : {}),
        });
        const qrText = `mdpay://quickpay?${params.toString()}`;
        return ok({
          qrText,
          accountNumber: account.account_number.toString(),
          receiverName: ownerDisplayName(user),
        });
      }

      case "resolve_qr": {
        const raw = input.qrText.trim();

        // 1) QuickPay QR: mdpay://quickpay?to=100001&note=...
        if (raw.toLowerCase().startsWith("mdpay://quickpay")) {
          const parsed = new URL(raw);
          const toStr = parsed.searchParams.get("to") ?? "";
          const note = parsed.searchParams.get("note") ?? "QuickPay төлбөр";
          const num = parseAccountNumber(toStr);
          if (num === null) return fail("QuickPay QR буруу байна", 400);
          const acc = await lookupAccount(num);
          if (!acc) return fail("Хүлээн авагчийн данс олдсонгүй", 404);
          return ok({
            kind: "QUICKPAY",
            accountNumber: acc.accountNumber,
            receiverName: acc.name,
            description: note,
          });
        }

        // 2) Нэхэмжлэлийн ID олох (Вэб URL: .../pay/15, эсвэл MDPAY_INV_15)
        let invoiceId: string | null = null;
        const payUrlMatch = raw.match(/\/pay\/(\d{1,18})(?:[/?#]|$)/);
        if (payUrlMatch) {
          invoiceId = payUrlMatch[1];
        } else {
          const legacyInvMatch = raw.match(/^MDPAY_INV_(\d{1,18})$/i);
          if (legacyInvMatch) invoiceId = legacyInvMatch[1];
        }

        let invoice = invoiceId
          ? await db.qr_codes.findUnique({
              where: { qr_id: BigInt(invoiceId) },
            })
          : await db.qr_codes.findFirst({
              where: { qr_text: raw },
              orderBy: { created_at: "desc" },
            });

        // 3) Хуучин mdpay://pay?to=...&amount=... формат
        if (!invoice && raw.toLowerCase().startsWith("mdpay://pay")) {
          const parsed = new URL(raw);
          const idParam = parsed.searchParams.get("id");
          if (idParam && /^\d{1,18}$/.test(idParam)) {
            invoice = await db.qr_codes.findUnique({
              where: { qr_id: BigInt(idParam) },
            });
          } else {
            const toStr = parsed.searchParams.get("to") ?? "";
            const amtParam = parsed.searchParams.get("amount") ?? "";
            const num = parseAccountNumber(toStr);
            if (num !== null) {
              const acc = await lookupAccount(num);
              if (acc) {
                return ok({
                  kind: "QUICKPAY",
                  accountNumber: acc.accountNumber,
                  receiverName: acc.name,
                  presetAmount: amtParam,
                  description: "QR төлбөр",
                });
              }
            }
          }
        }

        if (invoice) {
          const owner = invoice.account_id
            ? await db.users.findUnique({
                where: { account_id: invoice.account_id },
                select: {
                  firstname: true,
                  lastname: true,
                  business_name: true,
                },
              })
            : null;
          return ok({
            kind: "INVOICE",
            isOwn: invoice.account_id === user.account_id,
            invoice: {
              ...serializeInvoice(invoice),
              issuerName: ownerDisplayName(owner),
            },
          });
        }

        // 4) Шууд дансны дугаар агуулсан QR байвал QuickPay гэж үзнэ
        const directNum = parseAccountNumber(raw);
        if (directNum !== null) {
          const acc = await lookupAccount(directNum);
          if (acc) {
            return ok({
              kind: "QUICKPAY",
              accountNumber: acc.accountNumber,
              receiverName: acc.name,
              description: "Шууд QR төлбөр",
            });
          }
        }

        return fail("Энэ QR код MDPay системд бүртгэлгүй байна", 404);
      }

      case "pay_invoice": {
        if (!/^\d{1,18}$/.test(input.invoiceId)) {
          return fail("Нэхэмжлэл олдсонгүй", 404);
        }
        const balance = await db.$transaction(async (tx) => {
          const invoice = await tx.qr_codes.findUnique({
            where: { qr_id: BigInt(input.invoiceId) },
          });
          if (!invoice) throw new TransferError("Нэхэмжлэл олдсонгүй", 404);
          if (invoice.account_id === user.account_id)
            throw new TransferError("Өөрийн нэхэмжлэлийг төлөх боломжгүй", 400);
          if ((invoice.status ?? "PENDING") !== "PENDING")
            throw new TransferError(
              "Энэ нэхэмжлэл төлөх боломжгүй төлөвтэй байна",
              409,
            );
          if (invoice.expires_at && invoice.expires_at.getTime() <= Date.now())
            throw new TransferError("Нэхэмжлэлийн хугацаа дууссан", 410);
          if (!invoice.amount || invoice.account_number === null)
            throw new TransferError("Нэхэмжлэлийн мэдээлэл дутуу байна", 400);

          const amount = invoice.amount;

          const [from, to] = await Promise.all([
            tx.accounts.findFirst({
              where: { account_id: user.account_id },
              orderBy: { id: "asc" },
            }),
            tx.accounts.findUnique({
              where: { account_number: invoice.account_number },
            }),
          ]);
          if (!from) throw new TransferError("Таны данс олдсонгүй", 404);
          if (!to) throw new TransferError("Хүлээн авагчийн данс олдсонгүй", 404);
          if (from.id === to.id)
            throw new TransferError("Өөрийн данс руу төлөх боломжгүй", 400);

          await tx.$queryRaw`SELECT id FROM accounts WHERE id IN (${from.id}, ${to.id}) ORDER BY id FOR UPDATE`;

          const marked = await tx.qr_codes.updateMany({
            where: { qr_id: invoice.qr_id, status: "PENDING" },
            data: {
              status: "PAID",
              paid_at: new Date(),
              payer_id: user.account_id,
            },
          });
          if (marked.count !== 1)
            throw new TransferError("Энэ нэхэмжлэл аль хэдийн төлөгдсөн", 409);

          const debit = await tx.accounts.updateMany({
            where: { id: from.id, balance: { gte: amount } },
            data: { balance: { decrement: amount } },
          });
          if (debit.count !== 1)
            throw new TransferError("Үлдэгдэл хүрэлцэхгүй байна", 400);

          await tx.accounts.update({
            where: { id: to.id },
            data: { balance: { increment: amount } },
          });

          const [sender, receiver] = await Promise.all([
            tx.accounts.findUniqueOrThrow({ where: { id: from.id } }),
            tx.accounts.findUniqueOrThrow({ where: { id: to.id } }),
          ]);

          const description = invoice.description || "Нэхэмжлэлийн төлбөр";
          await tx.transactions.createMany({
            data: [
              {
                account_id: user.account_id,
                default_account_id: from.account_number,
                secondary_account_id: to.account_number,
                amount,
                transaction_type: "TRANSFER_OUT",
                description,
                balance: sender.balance,
              },
              {
                account_id: invoice.account_id,
                default_account_id: from.account_number,
                secondary_account_id: to.account_number,
                amount,
                transaction_type: "TRANSFER_IN",
                description,
                balance: receiver.balance,
              },
            ],
          });

          return sender.balance;
        });

        return ok({
          success: true,
          message: "Нэхэмжлэл амжилттай төлөгдлөө!",
          balance: balance ? balance.toFixed(0) : "0",
        });
      }

      case "cancel_invoice": {
        if (!/^\d{1,18}$/.test(input.invoiceId)) {
          return fail("Нэхэмжлэл олдсонгүй", 404);
        }
        const result = await db.qr_codes.updateMany({
          where: {
            qr_id: BigInt(input.invoiceId),
            account_id: user.account_id,
            status: "PENDING",
          },
          data: { status: "CANCELLED" },
        });
        if (result.count === 0)
          return fail("Нэхэмжлэл олдсонгүй эсвэл цуцлах боломжгүй", 404);
        return ok({ success: true, message: "Нэхэмжлэл цуцлагдлаа" });
      }

      case "quick_pay": {
        const to = parseAccountNumber(input.accountNumber);
        if (to === null) return fail("Дансны дугаар буруу байна", 400);
        const amount = toAmount(input.amount);
        if (amount === null) return fail("Дүн буруу байна", 400);
        const balance = await performTransfer({
          fromUserId: user.account_id,
          toAccountNumber: to,
          amount,
          note: input.note?.trim() || "QuickPay QR төлбөр",
        });
        return ok(
          {
            success: true,
            message: "QuickPay төлбөр амжилттай хийгдлээ!",
            balance: balance ? balance.toFixed(0) : "0",
          },
          201,
        );
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
    console.error("Mobile API error", error);
    return fail("Серверийн алдаа гарлаа", 500);
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204 });
}