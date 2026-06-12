"use client";

import { KeyboardEvent } from "react";

const EMAIL_DOMAIN = "@fatbearagency.com";

interface EmailUsernameInputProps {
  value: string;
  onChange: (email: string) => void;
  required?: boolean;
  className?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
}

// Input for FBA company email fields. Users type only the username; the
// @fatbearagency.com domain is appended automatically on change. If the
// user types a full email with a different domain, it's passed through
// unchanged.
export function EmailUsernameInput({ value, onChange, required, className, onKeyDown }: EmailUsernameInputProps) {
  const hasOtherDomain = value.includes("@") && !value.endsWith(EMAIL_DOMAIN);
  const username = hasOtherDomain ? value : value.slice(0, value.length - (value.endsWith(EMAIL_DOMAIN) ? EMAIL_DOMAIN.length : 0));

  const handleChange = (raw: string) => {
    if (!raw) { onChange(""); return; }
    onChange(raw.includes("@") ? raw : `${raw}${EMAIL_DOMAIN}`);
  };

  return (
    <div>
      <div className="relative">
        <input
          type="text"
          required={required}
          className={className ?? "sf-input pr-36"}
          value={username}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="username"
        />
        {!hasOtherDomain && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">
            {EMAIL_DOMAIN}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-600 mt-1">Enter the username only. {EMAIL_DOMAIN} will be added automatically.</p>
    </div>
  );
}
