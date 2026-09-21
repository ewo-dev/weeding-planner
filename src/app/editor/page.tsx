"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Plan } from "@/types/plan";
import { getRepository } from "@/lib/repo";

// Editor route. Reads the active plan id from localStorage, loads via the
// repository, and mounts the editor subtree. Full implementation lands in
// roadmap step 7 — this stub keeps the route reachable so the static export
// is complete and step 7 has a mount point. See docs/06-routing-and-pages.md
// § 6 and D-019.

const ACTIVE_PLAN_KEY = "weeding-planner:active-plan";

export default function EditorPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const activeId = localStorage.getItem(ACTIVE_PLAN_KEY);
    if (!activeId) {
      router.replace("/");
      return;
    }
    getRepository()
      .load(activeId)
      .then((loaded) => {
        if (!loaded) {
          router.replace("/");
          return;
        }
        setPlan(loaded);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      });
  }, [router]);

  if (error) {
    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold text-danger">
          Le plan n&apos;a pas pu être chargé.
        </h1>
        <p className="mt-2 text-sm text-text-muted">{error}</p>
        <button
          type="button"
          className="mt-4 underline"
          onClick={() => {
            setError(null);
            router.replace("/");
          }}
        >
          Retour à l&apos;accueil
        </button>
      </main>
    );
  }

  if (!plan) {
    return (
      <main className="p-8">
        <p className="text-sm text-text-muted">Chargement du plan…</p>
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">{plan.meta.name}</h1>
      <p className="mt-2 text-sm text-text-muted">
        L&apos;éditeur visuel arrive à l&apos;étape 7 de la roadmap. Le plan
        est chargé : {plan.guests.length} invités, {plan.tables.length}{" "}
        tables, {plan.assignments.length} places assignées.
      </p>
    </main>
  );
}
