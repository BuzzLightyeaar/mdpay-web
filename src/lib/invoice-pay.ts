import { db } from "@/lib/db";
import { TransferError } from "@/lib/transfer";

export async function payInvoice(userId: number, invoiceId: bigint) {
  return db.$transaction(async (tx) => {
    const invoice = await tx.qr_codes.findUnique({
      where: { qr_id: invoiceId },
    });
    if (!invoice) throw new TransferError("Нэхэмжлэл олдсонгүй", 404);
    if (invoice.account_id === userId)
      throw new TransferError("Өөрийн нэхэмжлэлийг төлөх боломжгүй", 400);
    if (invoice.receiver_id !== null && invoice.receiver_id !== userId)
      throw new TransferError("Энэ нэхэмжлэл таньд хаягласан биш байна", 403);
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
        where: { account_id: userId },
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
      data: { status: "PAID", paid_at: new Date(), payer_id: userId },
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
          account_id: userId,
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
}
