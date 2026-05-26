"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";

type Variant = "dark" | "light";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  variant?: Variant;
}

const VARIANT_CLASSES: Record<Variant, { input: string; toggle: string }> = {
  dark: {
    input:
      "w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 pr-10 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
    toggle: "text-slate-400 hover:text-slate-200",
  },
  light: {
    input:
      "mt-1 block w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 pr-10 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500/20",
    toggle: "text-slate-500 hover:text-slate-700",
  },
};

const PasswordInput = forwardRef<HTMLInputElement, Props>(
  ({ variant = "dark", className, ...rest }, ref) => {
    const [visible, setVisible] = useState(false);
    const v = VARIANT_CLASSES[variant];

    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          className={className ?? v.input}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((s) => !s)}
          aria-label={visible ? "Nascondi password" : "Mostra password"}
          title={visible ? "Nascondi password" : "Mostra password"}
          tabIndex={-1}
          className={`absolute inset-y-0 right-0 flex items-center px-3 ${v.toggle}`}
        >
          {visible ? (
            // eye-off
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
              <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
              <line x1="2" y1="2" x2="22" y2="22" />
            </svg>
          ) : (
            // eye
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

export default PasswordInput;
