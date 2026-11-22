import Link from "next/link";
export function Brand({
  light = false,
  href = "/",
}: {
  light?: boolean;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={`brand ${light ? "brand-light" : ""}`}
      aria-label="MDPay home"
    >
      <span className="brand-mark">
        <span />
      </span>
      <span>
        MD<span className="brand-blue">pay</span>
      </span>
    </Link>
  );
}
