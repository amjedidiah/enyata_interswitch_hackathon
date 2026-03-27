import { Building2 } from "lucide-react";
import { authApi } from "@/lib/api";
import { HexPattern } from "@/components/home/HomeHero";
import SettingsForm from "@/components/settings/SettingsForm";

async function loadProfile() {
  try {
    const { data } = await authApi.me();

    return {
      bankCode: data.user.bankCode,
      bankAccountNumber: data.user.bankAccountNumber,
      hasSaved: data.user.bankCode && data.user.bankAccountNumber,
    };
  } catch {
    // Profile fetch failed — user can still fill the form
    return {};
  }
}

async function SettingsPage() {
  const { bankCode, bankAccountNumber, hasSaved } = await loadProfile();

  return (
    <main className="min-h-screen">
      {/* ── Hero header ── */}
      <div className="relative bg-brand-primary text-brand-card overflow-hidden">
        <HexPattern />
        <div className="absolute left-0 top-0 h-full w-1 bg-brand-accent" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 50%, color-mix(in srgb, var(--color-brand-accent) 7%, transparent) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-32 pb-10">
          <p className="text-brand-accent text-xs font-semibold uppercase tracking-widest mb-3">
            My Account
          </p>
          <h1 className="text-4xl md:text-5xl font-black leading-tight">
            Settings
          </h1>
          <p className="text-brand-card/60 mt-3 text-lg max-w-md leading-relaxed">
            Manage your payout details so you can receive funds.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* ── Bank Details Card ── */}
        <div className="bg-brand-card rounded-2xl border border-brand-border p-6 md:p-8 relative overflow-hidden max-w-xl">
          <div
            className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
            style={{
              background:
                "linear-gradient(180deg, var(--color-brand-accent), color-mix(in srgb, var(--color-brand-accent) 40%, var(--color-brand-primary)))",
            }}
          />

          <div className="pl-3">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center shrink-0">
                <Building2 size={20} className="text-brand-accent" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-brand-primary">
                  Bank Details
                </h2>
                <p className="text-xs text-brand-muted">
                  Where your pod payouts will be sent
                </p>
              </div>
            </div>

            <SettingsForm
              initBankCode={bankCode}
              initAccountNumber={bankAccountNumber}
              initHasSaved={hasSaved}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

export default SettingsPage;
