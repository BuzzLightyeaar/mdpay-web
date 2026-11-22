import "dotenv/config";
import { PrismaClient, UserType, EntryKind } from "@prisma/client";
import { hash } from "bcryptjs";

const db = new PrismaClient();

async function createDemo(email: string, name: string, businessName: string | null, openingBalance: bigint) {
  const passwordHash = await hash("Demo12345!", 12);
  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: { email, name, passwordHash, type: businessName ? UserType.BUSINESS : UserType.PERSONAL, businessName },
  });
  const existingWallet = await db.wallet.findUnique({ where: { userId: user.id } });
  if (!existingWallet) {
    await db.$transaction(async (tx) => {
      const wallet = await tx.wallet.create({ data: { userId: user.id, balance: openingBalance } });
      await tx.walletEntry.create({
        data: { walletId: wallet.id, amount: openingBalance, balanceAfter: openingBalance,
          kind: EntryKind.OPENING_BALANCE, note: "Зөвхөн демо эхний үлдэгдэл", referenceId: `seed:${user.id}` },
      });
    });
  }
  return user;
}

async function main() {
  await createDemo("merchant@mdpay.mn", "Бат-Эрдэнэ", "MD Coffee", 1850000n);
  await createDemo("customer@mdpay.mn", "Номин", null, 980000n);
  console.log("Demo seeded. merchant@mdpay.mn / customer@mdpay.mn | password: Demo12345!");
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => db.$disconnect());
