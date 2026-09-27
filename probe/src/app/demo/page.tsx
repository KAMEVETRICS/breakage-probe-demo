"use client";

import { FormEvent, useState } from "react";
import { fixHeaders } from "../../fixes";
import { useFixes } from "../use-fixes";

type SearchHit = {
  id: string;
  name: string;
  category: string;
  price: number;
};

export default function DemoPage() {
  const [cartTotal, setCartTotal] = useState<number | null>(null);
  const [cartExpected] = useState(35);
  const [loginMessage, setLoginMessage] = useState("");
  const [loginOk, setLoginOk] = useState<boolean | null>(null);
  const [password, setPassword] = useState("ship");
  const [category, setCategory] = useState("kitchen");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [error, setError] = useState("");
  const { fixes } = useFixes();
  const headers = fixHeaders(fixes);

  async function runCart() {
    setError("");
    try {
      const response = await fetch("/api/cart/total", {
        method: "POST",
        headers,
        body: JSON.stringify({
          items: [
            { id: "1", price: 10, qty: 2 },
            { id: "2", price: 15, qty: 1 },
          ],
        }),
      });
      const data = (await response.json()) as { total: number };
      setCartTotal(data.total);
    } catch {
      setError("Cart request failed. Is the app running?");
    }
  }

  async function runLogin(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers,
        body: JSON.stringify({ email: "buyer@demo.test", password }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      setLoginOk(Boolean(data.ok));
      setLoginMessage(
        data.ok
          ? "Login accepted. Full password is shipit-now, so a short prefix should fail."
          : data.error ?? "Login rejected",
      );
    } catch {
      setError("Login request failed. Is the app running?");
    }
  }

  async function runSearch() {
    setError("");
    try {
      const response = await fetch(
        `/api/search?q=&category=${encodeURIComponent(category)}`,
        { headers },
      );
      const data = (await response.json()) as { results: SearchHit[] };
      setHits(data.results);
    } catch {
      setError("Search request failed. Is the app running?");
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <p className="text-sm uppercase tracking-wide text-muted">Target app</p>
      <h1 className="mt-1 text-3xl font-semibold">Demo storefront with planted bugs</h1>
      <p className="mt-2 max-w-2xl text-muted">
        The fix switches on the dashboard are kept in the page address, so this storefront uses the same ones.
      </p>
      <p className="mt-2 max-w-2xl text-muted">
        Use these flows as the system under test. Breakage Probe&apos;s parallel agents
        hit the same APIs. Expected correct behavior is written next to each control.
      </p>
      {error ? (
        <p className="mt-4 border-l-4 border-fail bg-fail-bg px-3 py-2 text-fail" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <section className="border border-line bg-sheet p-4">
          <h2 className="text-xl font-semibold">Cart total</h2>
          <p className="mt-1 text-sm text-muted">
            Cart is 2×$10 + 1×$15. Expected total: ${cartExpected}.
          </p>
          <button
            type="button"
            onClick={runCart}
            className="mt-4 inline-flex min-h-11 items-center border border-accent bg-accent px-3 text-sheet"
          >
            Price this cart
          </button>
          {cartTotal !== null ? (
            <p className="mt-3 font-mono text-sm">
              API total: ${cartTotal}
              {cartTotal === cartExpected ? " (matches)" : " (should be $35)"}
            </p>
          ) : null}
        </section>

        <section className="border border-line bg-sheet p-4">
          <h2 className="text-xl font-semibold">Login</h2>
          <p className="mt-1 text-sm text-muted">
            Account: buyer@demo.test / shipit-now. A partial password must be rejected.
          </p>
          <form className="mt-4 space-y-3" onSubmit={runLogin}>
            <label className="block text-sm">
              Password attempt
              <input
                className="mt-1 w-full border border-line bg-paper px-2 py-2"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center border border-ink px-3"
            >
              Try login
            </button>
          </form>
          {loginOk !== null ? (
            <p
              className={`mt-3 text-sm ${loginOk ? "text-fail" : "text-pass"}`}
              role="status"
            >
              {loginMessage}
            </p>
          ) : null}
        </section>

        <section className="border border-line bg-sheet p-4">
          <h2 className="text-xl font-semibold">Search filter</h2>
          <p className="mt-1 text-sm text-muted">
            Category kitchen should return only Camp Mug and Spice Kit.
          </p>
          <label className="mt-4 block text-sm">
            Category
            <select
              className="mt-1 w-full border border-line bg-paper px-2 py-2"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="kitchen">kitchen</option>
              <option value="gear">gear</option>
            </select>
          </label>
          <button
            type="button"
            onClick={runSearch}
            className="mt-3 inline-flex min-h-11 items-center border border-ink px-3"
          >
            Search catalog
          </button>
          {hits.length > 0 ? (
            <ul className="mt-3 space-y-1 font-mono text-sm">
              {hits.map((hit) => (
                <li key={hit.id}>
                  {hit.name} ({hit.category})
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </main>
  );
}
