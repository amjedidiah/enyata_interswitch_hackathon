import { type PropsWithChildren } from "react";
import Navbar from "@/components/ui/Navbar";

/**
 * Protected layout — auth gate is handled by middleware.ts (Edge runtime).
 * This is a plain server component: no client-side token check needed.
 */
function ProtectedLayout({ children }: Readonly<PropsWithChildren>) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

export default ProtectedLayout;
