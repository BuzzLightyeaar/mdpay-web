import { db } from "@/lib/db";
import { TransferError, parseAccountNumber } from "@/lib/transfer";

const nameSelect = {
  firstname: true,
  lastname: true,
  business_name: true,
} as const;

export function appBaseUrl(req: { nextUrl: { origin: string } }) {
  return (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(
    /\/$/,
    "",
  );
}

export async function createInvoice(opts: {
  userId: number;
  amount: bigint;
  description?: string | null;
  receiverAccountNumber?: string | null;
  baseUrl: string;
}) {
  const account = await db.accounts.findFirst({
    where: { account_id: opts.userId },
    orderBy: { id: "asc" },
  });
  if (!account) throw new TransferError("Данс олдсонгүй", 404);

  let receiverId: number | null = null;
  if (opts.receiverAccountNumber) {
    const num = parseAccountNumber(opts.receiverAccountNumber);
    if (num === null) throw new TransferError("Дансны дугаар буруу байна", 400);
    const target = await db.accounts.findUnique({
      where: { account_number: num },
    });
    if (!target || target.account_id === null)
      throw new TransferError("Данс олдсонгүй", 404);
    if (target.account_id === opts.userId)
      throw new TransferError("Өөртөө нэхэмжлэл үүсгэх боломжгүй", 400);
    receiverId = target.account_id;
  }

  return db.$transaction(async (tx) => {
    const created = await tx.qr_codes.create({
      data: {
        account_id: opts.userId,
        account_number: account.account_number,
        receiver_id: receiverId,
        qr_text: "",
        amount: opts.amount.toString(),
        description: opts.description || null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    return tx.qr_codes.update({
      where: { qr_id: created.qr_id },
      data: { qr_text: `${opts.baseUrl}/pay/${created.qr_id}` },
      include: {
        users: { select: nameSelect },
        receiver: { select: nameSelect },
      },
    });
  });
}
