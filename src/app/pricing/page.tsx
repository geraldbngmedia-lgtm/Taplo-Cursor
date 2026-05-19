"use client";

import { useEffect } from "react";

export default function PricingRedirectPage() {
  useEffect(() => {
    const target = "./landing.html#pricing";
    window.location.replace(target);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f5f8] text-slate-600">
      <p>
        Redirecting to{" "}
        <a href="./landing.html#pricing" className="text-orange-600 underline">
          pricing
        </a>
        …
      </p>
    </div>
  );
}
