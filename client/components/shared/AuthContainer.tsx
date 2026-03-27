import { FC, Suspense } from "react";
import Link from "next/link";
import { HexPattern } from "@/components/home/HomeHero";

interface AuthContainerProps {
  title: string;
  subTitle: string;
  Form: FC;
  inquiry: string;
  action: { href: string; text: string };
}

function AuthContainer({
  title,
  subTitle,
  Form,
  inquiry,
  action,
}: Readonly<AuthContainerProps>) {
  return (
    <main className="min-h-screen relative bg-brand-primary flex items-center justify-center px-4 overflow-hidden">
      <HexPattern />
      <div className="absolute left-0 top-0 h-full w-1 bg-brand-accent" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 50% 40%, color-mix(in srgb, var(--color-brand-accent) 10%, transparent) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div
          className="bg-brand-card rounded-2xl border border-brand-border p-8"
          style={{
            boxShadow:
              "0 24px 60px color-mix(in srgb, var(--color-foreground) 30%, transparent), 0 0 0 1px color-mix(in srgb, var(--color-brand-accent) 10%, transparent)",
          }}
        >
          <h1 className="text-2xl font-black text-brand-primary mb-1">
            {title}
          </h1>
          <p className="text-brand-muted text-sm mb-6">{subTitle}</p>

          <Suspense>
            <Form />
          </Suspense>

          <p className="text-sm text-brand-muted text-center mt-6">
            {inquiry}?{" "}
            <Link
              href={action.href}
              className="text-brand-accent font-semibold hover:underline"
            >
              {action.text}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default AuthContainer;
