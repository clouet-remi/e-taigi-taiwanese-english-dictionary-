"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="hero" aria-label="App header">
      <Link
        href="/"
        className="brand-link"
        onClick={() => {
          if (pathname === "/") {
            window.dispatchEvent(new CustomEvent("etai-gi:reset-search"));
          }
        }}
      >
        <div className="brand">
          <Image
            src="/logo.e-taigi.png"
            alt="E-Taigi logo"
            width={56}
            height={56}
            className="logo"
            priority
          />
          <div>
            <h1 className="logo-title">E-Taigi</h1>
            <p className="logo-subtitle">Taiwanese dictionary with audio preview</p>
          </div>
        </div>
      </Link>

      <p className="subtitle">Type Hanzi or English and get fast POJ results.</p>
    </header>
  );
}
