"use client";

import { ArrowRight, Layers, Plus, Search } from "lucide-react";
import Link from "next/link";
import CreatePodModal from "@/components/pods/CreatePodModal";
import { useState } from "react";

function CreatePodBanner() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/pods"
          className="feature-card bg-brand-card border border-brand-border rounded-2xl p-6 flex items-center gap-4 group"
        >
          <div className="w-11 h-11 rounded-xl bg-brand-primary/8 flex items-center justify-center shrink-0 group-hover:bg-brand-primary/15 transition-colors">
            <Search size={20} className="text-brand-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-brand-text">Browse Pods</p>
            <p className="text-sm text-brand-muted mt-0.5">
              Discover and join savings circles
            </p>
          </div>
          <ArrowRight
            size={16}
            className="text-brand-muted shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>

        <Link
          href="/my-pods"
          className="feature-card bg-brand-card border border-brand-border rounded-2xl p-6 flex items-center gap-4 group"
        >
          <div className="w-11 h-11 rounded-xl bg-brand-accent/10 flex items-center justify-center shrink-0 group-hover:bg-brand-accent/20 transition-colors">
            <Layers size={20} className="text-brand-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-brand-text">My Pods</p>
            <p className="text-sm text-brand-muted mt-0.5">
              View and manage your active pods
            </p>
          </div>
          <ArrowRight
            size={16}
            className="text-brand-muted shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>

        <button
          onClick={() => setCreateOpen(true)}
          className="feature-card bg-brand-card border border-brand-border rounded-2xl p-6 flex items-center gap-4 group text-left cursor-pointer"
        >
          <div className="w-11 h-11 rounded-xl bg-brand-success/10 flex items-center justify-center shrink-0 group-hover:bg-brand-success/20 transition-colors">
            <Plus size={20} className="text-brand-success" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-brand-text">Create a Pod</p>
            <p className="text-sm text-brand-muted mt-0.5">
              Start your own savings circle
            </p>
          </div>
          <ArrowRight
            size={16}
            className="text-brand-muted shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </button>
      </div>

      <CreatePodModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </>
  );
}

export default CreatePodBanner;
