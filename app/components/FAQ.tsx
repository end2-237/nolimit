'use client';

import { useState } from 'react';
import { Reveal } from './Reveal';

const FAQS = [
  { q: "Vos produits sont-ils vraiment 100 % naturels ?", a: "Oui. Tous nos compléments alimentaires, ampoules buvables et produits de santé sont fabriqués uniquement à partir d'ingrédients naturels, sans additifs chimiques ni conservateurs de synthèse. Nos fournisseurs sont soigneusement sélectionnés en Chine, Inde, Thaïlande, Bénin, Maroc et Afrique du Sud." },
  { q: "D'où viennent vos produits ?", a: "Nous importons nos produits depuis plusieurs pays reconnus pour leur expertise en médecine naturelle : la Chine et l'Inde pour leurs traditions millénaires en phytothérapie, la Thaïlande pour ses extraits tropicaux, ainsi que le Bénin, le Maroc et l'Afrique du Sud pour les plantes médicinales africaines." },
  { q: "Faut-il un bilan avant d'acheter un produit ?", a: "Ce n'est pas obligatoire, mais fortement recommandé. Notre médecin principal est disponible du lundi au samedi (09h00–18h00) pour établir un bilan de santé personnalisé et vous orienter vers les produits les plus adaptés à votre situation." },
  { q: "Quels sont vos horaires d'ouverture ?", a: "Nos centres sont ouverts du lundi au samedi. À Douala et Yaoundé : 09h00–19h00. À Bafoussam : 08h00–17h30. Le samedi, tous les centres ferment entre 15h00 et 16h00 (journée continue plus courte). Les consultations avec le médecin ont lieu de 09h00 à 18h00." },
  { q: "Puis-je utiliser vos produits en cas de maladie chronique ?", a: "Oui, nos produits naturels peuvent être utilisés en complément d'un traitement médical conventionnel. Notre médecin est là pour vous conseiller sur les associations possibles et les précautions à prendre." },
  { q: "Les produits sont-ils adaptés aux enfants et femmes enceintes ?", a: "Certains de nos produits sont adaptés. Nous vous recommandons de consulter notre médecin avant tout achat pour un enfant ou une femme enceinte, afin de s'assurer que le produit est approprié et dosé correctement." },
  { q: "Quels sont les moyens de paiement acceptés ?", a: "Espèces, Orange Money et MTN Mobile Money dans tous nos centres. Nous vous remettons systématiquement une facture pour chaque achat." },
  { q: "Proposez-vous des services en plus des produits ?", a: "Oui. En partenariat avec Pharaon depuis août 2025, nous proposons des massages des méridiens, des bilans de santé complets (check-up) et des soins d'alcalinisation dans nos centres. Renseignez-vous auprès de votre centre pour la disponibilité." },
  { q: "No Limit recrute-t-il ?", a: "Oui ! No Limit a une dimension sociale forte : nous recrutons et formons régulièrement des jeunes pour travailler dans nos centres à Douala, Yaoundé et Bafoussam. Contactez-nous pour en savoir plus sur les opportunités disponibles." },
  { q: "Comment commander ou passer à retirer des produits ?", a: "Vous pouvez venir directement dans l'un de nos trois centres pendant nos heures d'ouverture. Vous pouvez aussi nous contacter pour anticiper votre commande et vous assurer que les produits souhaités sont disponibles." },
];

function FAQItem({ f, isOpen, onToggle }: { f: typeof FAQS[0]; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="faq-item" style={{ borderBottom: '1px solid rgba(26,26,26,0.15)' }}>
      <button onClick={onToggle} style={{ width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, padding: '28px 0' }}>
        <span style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(20px, 2.2vw, 26px)', fontWeight: 400, letterSpacing: '-0.01em' }}>{f.q}</span>
        <span style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
          <span style={{ position: 'absolute', width: 16, height: 1, background: 'var(--ink)', transition: 'transform .35s' }} />
          <span style={{ position: 'absolute', width: 16, height: 1, background: 'var(--ink)', transform: isOpen ? 'rotate(0)' : 'rotate(90deg)', transition: 'transform .35s' }} />
        </span>
      </button>
      <div style={{ maxHeight: isOpen ? 300 : 0, overflow: 'hidden', transition: 'max-height .5s cubic-bezier(.2,.7,.2,1)' }}>
        <p style={{ paddingBottom: 28, fontSize: 16, lineHeight: 1.75, color: 'var(--ink-soft)', maxWidth: 680 }}>{f.a}</p>
      </div>
    </div>
  );
}

export function FAQ() {
  const [open, setOpen] = useState<number>(0);
  return (
    <section style={{ padding: 'var(--sec-pad) 0', background: 'var(--cream-warm)' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '4fr 8fr', gap: 80 }} className="faq-grid">
          <div>
            <Reveal><span className="eyebrow">07 — FAQ</span></Reveal>
            <Reveal delay={100}>
              <h2 style={{ fontSize: 'clamp(40px, 5vw, 76px)', marginTop: 28, fontWeight: 300 }}>
                Vos <em>questions</em>,<br /> nos réponses.
              </h2>
            </Reveal>
            <Reveal delay={200}>
              <p style={{ marginTop: 24, color: 'var(--muted)', fontSize: 15, lineHeight: 1.7, maxWidth: 320 }}>
                Une autre question ? Contactez-nous directement, nous répondons sous 24h ouvrées.
              </p>
            </Reveal>
          </div>
          <div>
            {FAQS.map((f, i) => (
              <Reveal key={i} delay={i * 50}>
                <FAQItem f={f} isOpen={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
              </Reveal>
            ))}
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .faq-grid { grid-template-columns: 1fr !important; gap: 40px !important; } }`}</style>
    </section>
  );
}
