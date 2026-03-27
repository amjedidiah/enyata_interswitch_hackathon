import { type PropsWithChildren } from "react";
import Navbar from "@/components/ui/Navbar";

/**
 * Auth layout — middleware.ts redirects users with a valid refresh cookie
 * away from /login and /register to /dashboard.
 * This is a plain server component: no client-side token check needed.
 */
function AuthLayout({ children }: Readonly<PropsWithChildren>) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

export default AuthLayout;
