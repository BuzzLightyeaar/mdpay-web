# MDPay — Next.js + TypeScript + PostgreSQL

**MDPay** нь QPay шиг хэрэглэгчийн урсгалтай, бие даасан загвартай **туршилтын төлбөрийн платформ** юм. Энэ репо frontend болон backend-ийг нэг Next.js App Router төслөөр ажиллуулдаг. **Банкны бодит мөнгө / банкны QR холболт хийгдээгүй.** QR нь зөвхөн MDPay-ийн `/pay/:id` хуудсын URL-ийг кодолдог.

## Технологи
- Node.js **22.16.0**, Next.js **16**, React 19, TypeScript.
- Next.js Route Handlers (`app/api/**`) — backend.
- PostgreSQL 16, Prisma ORM 6, Prisma transactions.
- HTTP-only JWT session (`jose`), `bcryptjs` password hashing.
- `qrcode.react` — checkout холбоосын QR үүсгэнэ.

## Эхлүүлэх (Windows / Linux / macOS)

### 1. Node.js шалгах
```bash
node -v
# v22.16.0
```

### 2. PostgreSQL асаах
Docker Desktop суусан бол:
```bash
docker compose up -d
```
Эсвэл байгаа PostgreSQL дээрээ `mdpay` database болон хэрэглэгч үүсгэж, `DATABASE_URL`-ээ тохируулна.

### 3. Environment variables
```powershell
Copy-Item .env.example .env
```
Linux/macOS:
```bash
cp .env.example .env
```
**Заавал:** `.env` доторх `AUTH_SECRET`-ийг өөрийн санамсаргүй 32+ тэмдэгттэй утгаар солино. Жишээлбэл:
```bash
openssl rand -base64 48
```
Windows PowerShell-д:
```powershell
$b = New-Object byte[] 48; [System.Security.Cryptography.RandomNumberGenerator]::Fill($b); [Convert]::ToBase64String($b)
```
Үр дүнг `AUTH_SECRET="..."` болгож оруулна. `NEXT_PUBLIC_APP_URL` нээж буй origin-той **яг адил** байна (анхдагчаар `http://localhost:3000`).

### 4. Суулгах + schema үүсгэх + демо хэрэглэгч
```bash
npm install
npx prisma generate
npx prisma db push
npm run db:seed
```

### 5. Веб асаах
```bash
npm run dev
```
`http://localhost:3000` нээнэ.

## Туршилтын эрхүүд

| Төрөл | И-мэйл | Нууц үг | Демо үлдэгдэл |
|---|---|---|---:|
| Байгууллага | `merchant@mdpay.mn` | `Demo12345!` | 1,850,000 ₮ |
| Иргэн | `customer@mdpay.mn` | `Demo12345!` | 980,000 ₮ |

Нэвтрэх хуудасны демо хэрэглэгчийн и-мэйл дээр дарж талбаруудыг бөглөж болно. **Эдгээр нууц үгийг бодит орчинд ашиглахгүй.** `db:seed` дахин ажиллуулахад өмнө үүссэн хэтэвчийн үлдэгдэл reset хийхгүй.

## Ажиллах боломжууд

1. `/` — landing page, MDPay бүтээгдэхүүний танилцуулга, QR тайлбар.
2. `/register` — иргэн/байгууллага бүртгэх; 0 ₮ үлдэгдэлтэй шинэ хэтэвч.
3. `/login` — и-мэйл, нууц үгээр нэвтрэх.
4. `/dashboard` — демо үлдэгдэл, сүүлийн гүйлгээ, нэхэмжлэл.
5. `/dashboard/invoices` — нэхэмжлэл үүсгэх, QR харах, төлбөрийн холбоос хуулах, цуцлах.
6. `/pay/:id` — QR-аас орох төлбөрийн хуудас; MDPay хэрэглэгчийн тест хэтэвчээр төлбөр хийж болно.
7. `/dashboard/transfers` — MDPay хэрэглэгчийн и-мэйлээр дотоод демо шилжүүлэг.
8. `/dashboard/transactions` — орлого, зарлагын гүйлгээ, үлдэгдлийн бичилт.

### QR-н жишээ ажиллуулах
1. `merchant@mdpay.mn`-ээр нэвтэрч **Нэхэмжлэл** → **Шинэ нэхэмжлэл**.
2. 25000 ₮ нэхэмжлэл үүсгэж QR/modal-аас холбоосыг хуул.
3. Инкогнито цонхонд холбоосыг нээ. `customer@mdpay.mn`-ээр нэвтэр.
4. **MDPay-ээр төлөх** дарснаар хэрэглэгчийн тест үлдэгдлээс хасагдаж, мерчантын тест үлдэгдэл дээр нэмэгдэнэ, 2 ledger бичилт үүснэ.

## API endpoints

| HTTP | Path | Үүрэг |
|---|---|---|
| POST | `/api/auth/register` | бүртгэх |
| POST | `/api/auth/login` | нэвтрэх |
| POST | `/api/auth/logout` | гарах |
| GET | `/api/auth/me` | хэрэглэгч |
| GET | `/api/dashboard/summary` | dashboard summary |
| GET | `/api/transactions` | гүйлгээний түүх |
| POST | `/api/transfers` | дотоод шилжүүлэг |
| GET/POST | `/api/invoices` | жагсаах / үүсгэх |
| GET | `/api/invoices/:id` | нийтийн нэхэмжлэлийн мэдээлэл |
| POST | `/api/invoices/:id/pay` | демо төлбөр |
| POST | `/api/invoices/:id/cancel` | нэхэмжлэл цуцлах |

## Өгөгдлийн загвар
`User` → `Wallet` → `WalletEntry`, `User` → `Invoice` (issuer, payer).

Мөнгөн дүн PostgreSQL `BIGINT`, нэгж нь **бүхэл төгрөг**, floating-point ашиглахгүй. Хоёр талын үлдэгдлийг **Serializable transaction** дотор өөрчилж, хэтэвч хоосрох тохиолдолд `updateMany balance >= amount` шалгана. Нэхэмжлэл төлөх үед `PENDING -> PAID` нөхцөлт update хийдэг тул дахин төлөх боломжгүй. Prisma `P2034` давхцал гарвал хэрэглэгч дахин оролдож болно.

## Production-д шилжихээс өмнө

Энэ бол санхүүгийн **MVP прототип**, production төлбөрийн үйлчилгээ **биш**. Бодит банкны төлбөр хийхдээ дараах зүйлс шаардлагатай:
- Банк эсвэл лицензтэй төлбөрийн үйлчилгээний албан ёсны merchant API гэрээ, credential, webhook, sandbox.
- Гүйлгээний баталгаажуулалт, webhook signature, idempotency key, retry / reconciliation, double-entry ledger, audit trail.
- KYC/AML, Монголбанкны холбогдох шаардлагын үнэлгээ, аудит, PCI DSS хүрээ (карт ашиглах бол).
- Rate limiting, session/device security, CSRF хамгаалалтын нэмэлт хяналт, MFA, password reset, account lockout, monitoring.
- RBAC, байгууллагын олон эрхтэй хэрэглэгчид, нэхэмжлэлийн дугаарлалт, тайлан, export, refund/dispute, банкны дансны холболт.
- Нийтийн production орчинд демо seed хэзээ ч ашиглахгүй; мөнгөн үлдэгдэл системээс шууд mint хийхгүй.

> **Анхаар:** `.env` ба PostgreSQL password зөвхөн local development-д зориулсан. Бодит орчинд санамсаргүй нууц, HTTPS, managed secret storage, database backup хэрэгтэй.
