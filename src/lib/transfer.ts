import { Prisma } from "@prisma/client";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";

export class TransferError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function parseAccountNumber(raw: unknown): bigint | null {
  if (typeof raw !== "string" || !/^\d{1,18}$/.test(raw.trim())) return null;
  return BigInt(raw.trim());
}

const displayName = (u: {
  firstname: string | null;
  lastname: string | null;
  business_name: string | null;
}) =>
  u.business_name ||
  [u.firstname, u.lastname ? `${u.lastname[0]}.` : null]
    .filter(Boolean)
    .join(" ") ||
  "MDPay хэрэглэгч";

export async function lookupAccount(accountNumber: bigint) {
  const acc = await db.accounts.findUnique({
    where: { account_number: accountNumber },
    include: {
      users: {
        select: { firstname: true, lastname: true, business_name: true },
      },
    },
  });
  if (!acc || !acc.users) return null;
  return {
    accountNumber: acc.account_number.toString(),
    name: displayName(acc.users),
    currency: acc.currency ?? "MNT",
  };
}

export async function verifyPassword(userId: number, password: string) {
  const u = await db.users.findUnique({
    where: { account_id: userId },
    select: { passwordhash: true },
  });
  if (!u || !(await compare(password, u.passwordhash)))
    throw new TransferError("Нууц үг буруу байна", 403);
}

export async function performTransfer(opts: {
  fromUserId: number;
  toAccountNumber: bigint;
  amount: bigint;
  note?: string;
}) {
  const amt = new Prisma.Decimal(opts.amount.toString());

  return db.$transaction(
    async (tx) => {
      const from = await tx.accounts.findFirst({
        where: { account_id: opts.fromUserId },
        orderBy: { id: "asc" },
      });
      const to = await tx.accounts.findUnique({
        where: { account_number: opts.toAccountNumber },
      });
      if (!from) throw new TransferError("Таны данс олдсонгүй", 404);
      if (!to) throw new TransferError("Хүлээн авагчийн данс олдсонгүй", 404);
      if (from.id === to.id)
        throw new TransferError("Өөрийн данс руу шилжүүлэх боломжгүй", 400);

      // Тогтмол дарааллаар түгжинэ (deadlock-оос сэргийлнэ)
      await tx.$queryRaw`SELECT id FROM accounts WHERE id IN (${from.id}, ${to.id}) ORDER BY id FOR UPDATE`;

      const debit = await tx.accounts.updateMany({
        where: { id: from.id, balance: { gte: amt } },
        data: { balance: { decrement: amt } },
      });
      if (debit.count !== 1)
        throw new TransferError("Үлдэгдэл хүрэлцэхгүй байна", 400);

      await tx.accounts.update({
        where: { id: to.id },
        data: { balance: { increment: amt } },
      });

      const [sender, receiver] = await Promise.all([
        tx.accounts.findUniqueOrThrow({ where: { id: from.id } }),
        tx.accounts.findUniqueOrThrow({ where: { id: to.id } }),
      ]);

      const description = opts.note || "Мөнгөн шилжүүлэг";
      await tx.transactions.createMany({
        data: [
          {
            account_id: from.account_id,
            default_account_id: from.account_number,
            secondary_account_id: to.account_number,
            amount: amt,
            transaction_type: "TRANSFER_OUT",
            description,
            balance: sender.balance,
          },
          {
            account_id: to.account_id,
            default_account_id: from.account_number,
            secondary_account_id: to.account_number,
            amount: amt,
            transaction_type: "TRANSFER_IN",
            description,
            balance: receiver.balance,
          },
        ],
      });
      return sender.balance;
    },
    { maxWait: 10000, timeout: 20000 },
  );
}
