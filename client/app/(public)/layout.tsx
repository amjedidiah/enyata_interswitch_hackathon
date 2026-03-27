import { type PropsWithChildren } from "react";
import Navbar from "@/components/ui/Navbar";

/**
 * Public layout
 */
function PublicLayout({ children }: Readonly<PropsWithChildren>) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

export default PublicLayout;
