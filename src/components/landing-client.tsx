"use client";

import dynamic from "next/dynamic";

const Landing = dynamic(() => import("@/components/landing"), {
  ssr: false,
  loading: () => <main style={{ padding: 40 }}>MDPay ачааллаж байна...</main>,
});

export default function LandingClient() {
  return <Landing />;
}
