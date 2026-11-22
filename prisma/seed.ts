import { PrismaClient, Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";

const db = new PrismaClient();

const demoUsers = [
  {
    email: "merchant@mdpay.mn",
    firstname: "Demo Merchant",
    type: "BUSINESS",
    business_name: "MDPay Demo Shop",
    balance: 250000,
  },
  {
    email: "customer@mdpay.mn",
    firstname: "Demo Customer",
    type: "PERSONAL",
    business_name: null,
    balance: 1000000,
  },
];

async function main() {
  const passwordhash = await hash("Demo12345!", 12);

  for (const d of demoUsers) {
    const user = await db.users.upsert({
      where: { email: d.email },
      update: {},
      create: {
        email: d.email,
        passwordhash,
        firstname: d.firstname,
        type: d.type,
        business_name: d.business_name,
      },
    });

    const existing = await db.accounts.findFirst({
      where: { account_id: user.account_id },
    });
    if (existing) continue;

    const balance = new Prisma.Decimal(d.balance);
    const account = await db.accounts.create({
      data: {
        account_id: user.account_id,
        account_token: randomUUID().slice(0, 20),
        balance,
      },
    });
    await db.transactions.create({
      data: {
        account_id: user.account_id,
        default_account_id: account.account_number,
        amount: balance,
        transaction_type: "DEPOSIT",
        description: "Нээлтийн үлдэгдэл",
        balance,
      },
    });
  }
  console.log("Seed дууслаа");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
