"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function LoginErrorRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      router.push(`/auth/error?error=${errorParam}`);
    }
  }, [searchParams, router]);

  return null;
}
