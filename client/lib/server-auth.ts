import { headers } from "next/headers";
import { USER_ID_HEADER, USER_EMAIL_HEADER } from "@/lib/auth-constants";

export interface ServerUser {
  id: string;
  email: string;
}

/**
 * Reads the verified user identity forwarded by the proxy via request headers.
 * Returns null for unauthenticated requests (no cookie or invalid/expired token).
 * Must only be called from Server Components or Route Handlers.
 */
export async function getServerUser(): Promise<ServerUser | null> {
  const headersList = await headers();
  const id = headersList.get(USER_ID_HEADER);
  const email = headersList.get(USER_EMAIL_HEADER);
  if (!id || !email) return null;
  return { id, email };
}
