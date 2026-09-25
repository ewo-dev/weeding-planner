// French message catalog (MVP is French-only per D-011).
// This is the single source of truth for user-facing copy. When another
// locale is added (e.g. `en.ts`), mirror this shape and register it in
// `src/lib/i18n/index.ts`.
export const fr = {
  a11y: {
    skipToContent: 'Aller au contenu',
  },
  home: {
    eyebrow: 'Plan de table',
    title: 'Votre mariage, bien assis.',
    subtitle: 'Créez et organisez votre plan de table en toute simplicité.',
    newPlan: 'Nouveau plan',
    listError: 'Impossible de charger vos plans. Réessayez.',
    createError: 'Impossible de créer un plan. Réessayez.',
    retry: 'Réessayer',
    emptyTitle: "Aucun plan pour l'instant",
    emptySubtitle: 'Créez votre premier plan de table pour commencer.',
    privacyNote:
      'Tout reste sur votre appareil — vos données ne sont pas envoyées en ligne.',
  },
} as const

export type Messages = typeof fr
