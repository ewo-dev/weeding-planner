"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Plan } from "@/types/plan";
import { getRepository } from "@/lib/repo";

// Print view. Reads the active plan id from localStorage, loads via the
// repository, and renders a print-friendly layout. Full implementation lands
// in roadmap step 13 — this stub keeps the route reachable. See
// docs/06-routing-and-pages.md § 7 and D-019.

const ACTIVE_PLAN_KEY = "weeding-planner:active-plan";

export default function PrintPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    const activeId = localStorage.getItem(ACTIVE_PLAN_KEY);
    if (!activeId) {
      router.replace("/");
      return;
    }
    getRepository().load(activeId).then((loaded) => {
      if (!loaded) {
        router.replace("/");
        return;
      }
      setPlan(loaded);
    });
  }, [router]);

  if (!plan) {
    return null;
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">{plan.meta.name}</h1>
      <ul className="mt-4 space-y-2">
        {plan.tables.map((table) => {
          const seated = plan.assignments.filter(
            (a) => a.tableId === table.id,
          );
          return (
            <li key={table.id}>
              <strong>
                {table.name} ({table.capacity} places, forme{" "}
                {table.shape === "round" ? "ronde" : "rectangulaire"})
              </strong>
              <ul className="ml-4 mt-1 text-sm">
                {seated.length === 0 ? (
                  <li className="text-text-muted">— aucune place assignée</li>
                ) : (
                  seated.map((a) => {
                    const guest = plan.guests.find((g) => g.id === a.guestId);
                    return (
                      <li key={a.guestId}>
                        {guest?.name ?? "(invité inconnu)"}
                      </li>
                    );
                  })
                )}
              </ul>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 text-sm text-text-muted">
        Mise en page d&apos;impression complète à l&apos;étape 13 de la
        roadmap.
      </p>
    </main>
  );
}
