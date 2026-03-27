"use client";

import { useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import Motion from "@/components/shared/Motion";
import Section from "@/components/ui/Section";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" as const },
  },
};

const faqs = [
  {
    q: "What is a Pod?",
    a: "A Pod is AjoFlow's name for a savings circle (Ajo group). Each Pod has a fixed number of members who contribute a set amount on a regular schedule — daily, weekly, or monthly. Members take turns receiving the full pool. You can browse available Pods, join one, or create your own from the dashboard.",
  },
  {
    q: "What is Ajo / Esusu?",
    a: "Ajo (also called Esusu, Adashe, or Osusu depending on your region) is a traditional Nigerian savings circle where a group of trusted people contribute a fixed amount regularly, and each member takes turns receiving the full pool. It has been practised for generations across West Africa. AjoFlow digitises this tradition with secure wallets and AI-powered fairness — no more chasing contributions or worrying about missing funds.",
  },
  {
    q: "How does AjoFlow work?",
    a: "AjoFlow digitises the traditional Ajo entirely: contributions are collected by card debit or bank transfer, funds are held in a secure wallet (not anyone's personal account), and payouts are sent directly to your bank account. An AI trust agent scores every member's reliability and reorders the payout queue to protect the group — all without a human admin touching the money.",
  },
  {
    q: "How is my money kept safe?",
    a: "Your contributions never pass through anyone's personal account. All pooled funds are held in a dedicated wallet — a secure, ring-fenced account tied to your pod and managed by Interswitch. Money only leaves the wallet when it's your turn to receive, and every payment confirmation is verified with a digital signature to prevent tampering. Think of it as a vault that only opens when it's your turn.",
  },
  {
    q: "When will I get paid out?",
    a: "Your payout position is determined when you join the pod. Our AI trust agent continuously monitors every member's payment reliability and may reorder the queue — members with a trust score below 50 are moved to the end to protect the group. You can always see your current queue position and estimated payout date on the pod detail page.",
  },
  {
    q: "What happens if someone misses a payment?",
    a: "Missed payments are automatically flagged and factored into that member's AI trust score, which may drop their position in the payout queue. Scheduled card debits are retried by our payment processor. Persistent non-payment will continue to push the member toward the back of the queue, protecting members who are reliably contributing.",
  },
  {
    q: "How does the AI trust score affect me?",
    a: "AjoFlow's AI looks at your payment record — how often you paid on time, how much you contributed, and any payments you missed. It gives you a score from 0 to 100 and a plain explanation of why. A score of 50 or above keeps your place in the queue. Below 50, you're moved further back until your record improves. You can always see your score and the reason on the pod page — no guesswork.",
  },
  {
    q: "What payment methods are accepted?",
    a: "AjoFlow accepts any Verve, Mastercard, or Visa card issued by a Nigerian bank, processed securely through Interswitch. On your first contribution, your card details are saved securely so future payments are deducted automatically — you don't need to re-enter anything each cycle.",
  },
  {
    q: "Can I be in multiple pods at once?",
    a: "Yes. You can join as many pods as you like, each with its own contribution amount, frequency, and payout queue. Your dashboard shows all your active pods, your contribution history per pod, and your current queue position in each one.",
  },
  {
    q: "How do I start my own pod?",
    a: `Create a free account, go to your dashboard, and click "Create Pod". You'll set the pod name, contribution amount, payment frequency (daily / weekly / monthly), and the maximum number of members. Once the pod is live, share the link with your circle. As the creator you're the pod admin — you can trigger the AI evaluation and, when the wallet is fully funded, initiate the payout to the next member in queue.`,
  },
  {
    q: "Are AjoFlow payouts tax-exempt?",
    a: "Yes. Pods on AjoFlow are structured as Micro-Cooperatives under the 2026 Nigeria Tax Act, which classifies rotating savings payouts as non-taxable cooperative distributions. Every naira collected goes to the recipient — no withholding, no deductions.",
  },
];

function FAQItem({ q, a }: Readonly<{ q: string; a: string }>) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all duration-300 ${open ? "border-brand-accent/35" : "border-brand-border"}`}
      style={open ? { boxShadow: "0 4px 20px color-mix(in srgb, var(--color-brand-accent) 7%, transparent)" } : undefined}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left bg-brand-card hover:bg-brand-surface transition-colors"
        aria-expanded={open}
      >
        <span className="font-semibold text-brand-text text-sm leading-snug">
          {q}
        </span>
        <span
          className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${open ? "bg-brand-accent/12 text-brand-accent" : "bg-brand-primary/6 text-brand-muted"}`}
        >
          {open ? <Minus size={14} /> : <Plus size={14} />}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 py-5 bg-brand-surface border-t border-brand-border">
              <p className="text-brand-muted text-sm leading-relaxed">{a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  return (
    <section className="py-24 px-6 bg-brand-card">
      <Section className="max-w-3xl mx-auto">
        <Motion variants={fadeUp} className="text-center mb-12">
          <p className="text-brand-accent text-sm font-semibold uppercase tracking-widest mb-3">
            Got questions?
          </p>
          <h2 className="text-4xl font-black text-brand-primary">
            Frequently asked questions
          </h2>
        </Motion>

        <Motion variants={fadeUp} className="flex flex-col gap-3">
          {faqs.map((item) => (
            <FAQItem key={item.q} q={item.q} a={item.a} />
          ))}
        </Motion>
      </Section>
    </section>
  );
}
