import type { Metadata } from 'next';
import { AlmanachClient } from './AlmanachClient';

export const metadata: Metadata = {
  title: "L'Almanach No Limit — Mai 2026 · Saison sèche, le souffle",
  description:
    "Un rituel, une plante, une respiration. Chaque mois, en accès libre. L'Almanach No Limit : le seul espace du site qui n'attend rien de vous.",
  openGraph: {
    title: "L'Almanach No Limit — Mai 2026",
    description:
      "Un rituel, une plante, une respiration. Chaque mois, en accès libre.",
    locale: 'fr_FR',
    type: 'article',
  },
  alternates: {
    canonical: 'https://nolimit.cm/almanach',
  },
};

export default function AlmanachPage() {
  return <AlmanachClient />;
}
