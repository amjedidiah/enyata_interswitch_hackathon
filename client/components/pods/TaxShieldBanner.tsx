import { Shield } from "lucide-react";

function TaxShieldBanner() {
  return (
    <div
      className="flex items-start gap-3 border rounded-2xl px-5 py-4"
      style={{
        background:
          "color-mix(in srgb, var(--color-brand-accent) 5%, var(--color-brand-card))",
        borderColor:
          "color-mix(in srgb, var(--color-brand-accent) 25%, transparent)",
      }}
    >
      <div className="w-8 h-8 rounded-lg bg-brand-accent/15 flex items-center justify-center shrink-0 mt-0.5">
        <Shield size={16} className="text-brand-accent" />
      </div>
      <div>
        <p className="text-sm font-semibold text-brand-primary">
          Tax Shield Active
        </p>
        <p className="text-xs text-brand-muted mt-0.5 leading-relaxed">
          This pod is registered as a Micro-Cooperative under the 2026 Nigeria
          Tax Act. Payouts are fully tax-exempt.
        </p>
      </div>
    </div>
  );
}

export default TaxShieldBanner;
