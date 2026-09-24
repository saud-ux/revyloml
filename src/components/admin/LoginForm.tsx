"use client";

import { useActionState } from "react";
import { signIn } from "@/app/actions";
import { fill, type Dict, type Locale } from "@/lib/i18n";

export function LoginForm({ locale, dict }: { locale: Locale; dict: Dict }) {
  const [state, action, pending] = useActionState(signIn, undefined);

  return (
    <form action={action} className="form">
      <input type="hidden" name="locale" value={locale} />
      <label className="field">
        <span className="field__label">{dict.password}</span>
        <input
          className="input"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          autoFocus
          aria-describedby={state?.error ? "login-error" : undefined}
        />
      </label>
      {state?.error && (
        <p id="login-error" className="field__error" role="alert">
          {state.error === "wrong"
            ? dict.wrongPassword
            : state.error === "rate"
              ? fill(dict.tooManyTries, { n: Math.ceil((state.retryAfterSeconds ?? 0) / 60) })
              : state.error}
        </p>
      )}
      <button type="submit" className="btn btn--primary btn--block" disabled={pending}>
        {pending ? dict.saving : dict.signIn}
      </button>
    </form>
  );
}
