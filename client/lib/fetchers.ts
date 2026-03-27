import { notFound } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Server-side fetch helper for a single pod.
 * Generic so each server component can type the result against its own Pod interface.
 * Calls notFound() on 404 so Next.js renders the nearest not-found boundary.
 */
export async function getPod<T>(id: string): Promise<T> {
  const res = await fetch(`${API}/api/pods/${id}`, { cache: "no-store" });
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(`Failed to load pod (${res.status})`);
  return res.json() as Promise<T>;
}
