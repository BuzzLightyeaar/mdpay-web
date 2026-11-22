# MDPay — Бодит банкны/QR төлбөрийн интеграцийн дараагийн шат

## Одоогийн хэрэгжилт
`/api/invoices/:id`-ийн QR нь `https://<MDPAY_DOMAIN>/pay/<invoice_id>` холбоос кодолдог. Хэрэглэгч вэбээр нэвтэрч, **MDPay дотоод демо хэтэвчээр** төлнө. Одоо банкны merchant API, Монголбанкны QR стандартыг хэрэгжүүлээгүй.

## Банк/төлбөрийн провайдертай холбох урсгал

1. Банк/PSP-тэй merchant гэрээ байгуулах; sandbox account, client credentials, callback URL авах.
2. `Invoice`-ийг банкны provider invoice ID, status, expiration, merchant account info хадгалдаг болгох.
3. Invoice `PENDING` үед **backend** provider API-д нэхэмжлэл үүсгэх хүсэлт илгээх; QR payload эсвэл hosted checkout URL-г албан ёсны API-с авч хадгалах.
4. Provider-ийн өгсөн QR payload-г л хэрэглэгчид харуулах — self-generated URL QR нь банкны QR биш.
5. Банк/PSP callback (webhook) хүлээн авах endpoint нэмэх. Signature, timestamp, nonce, event ID-г шалгана.
6. Хүлээн авсан transaction reference-ийг provider API-р backend-аас дахин шалгана (боломжтой бол).
7. Давхар webhook болон давтан хүсэлтэд **idempotency** (unique provider transaction ID) хэрэглэж, pending -> paid transition-ийг атомикаар хийнэ.
8. Дансны төлөв, банкны тайланг reconcile хийх давтамжтай service/cron ажиллуулна.
9. Payment refunds, settlement, service fees, tax receipts, reconciliation, disputes тусад нь өгөгдлийн загвартай байх ёстой.

## Ledger шаардлага
Бодит мөнгөний хэтэвч нээхээс өмнө double-entry account/ledger, reserve, pending balance, settlement balance, clearing account загвар гаргах. `Wallet.balance` талбарыг зөвхөн дотоод демо мөнгөний үзүүлэлт гэж үз. Банкны confirmation ирээгүй байхад merchant balance өсгөж болохгүй.

## Security / compliance checklist
- HTTPS, managed secrets, rotation, audit logs, centralized monitoring, verified callbacks.
- Хэрэглэгчийн MFA, төхөөрөмж/сэшн хяналт, reset-flow, throttle/rate limit, RBAC.
- Картын мэдээлэл хадгалахгүй; PCI DSS applicability-ийг шалгах.
- KYC/AML, Монголбанкны зөвшөөрөл болон үйлчилгээний ангиллын зохицуулалтыг хуульч/мэргэжлийн байгууллагаар тодруулах.
- Бүртгэлтэй хэрэглэгчийн эрх болон үйлчилгээний нөхцөлийг production deployment-ээс өмнө боловсруулах.
