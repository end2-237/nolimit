// FAQ — accordions with + → ×
const FAQS = [
  { q: "Faut-il une ordonnance pour consulter ?", a: "Aucune ordonnance n'est nécessaire pour consulter nos praticiens. Nous restons cependant à l'écoute de votre médecin traitant si vous souhaitez une coordination de votre suivi." },
  { q: "Les soins sont-ils remboursés par la CNPS ou mes assurances ?", a: "Nos prestations relèvent de médecines complémentaires et ne sont pas remboursées par la CNPS. La plupart des mutuelles privées au Cameroun (Activa, Saham, Allianz) proposent un forfait médecines douces : nous remettons systématiquement une facture détaillée." },
  { q: "À quelle fréquence venir ?", a: "Cela dépend du soin et de votre objectif. À titre indicatif : un bilan naturopathique tous les 2 à 3 mois, une cure d'acupuncture sur 4 à 6 séances rapprochées puis espacées, un cycle de sophrologie sur 8 à 10 séances hebdomadaires." },
  { q: "Comment se passe une première séance ?", a: "La première consultation commence toujours par un long temps d'anamnèse : antécédents, mode de vie, attentes. Le soin lui-même n'occupe parfois que la seconde moitié de la séance. Vous repartez avec un plan clair." },
  { q: "Puis-je consulter en cas de pathologie chronique ?", a: "Oui, en complément d'un suivi médical conventionnel — jamais en remplacement. Nos praticiens travaillent volontiers en lien avec votre médecin." },
  { q: "Acceptez-vous les enfants et les femmes enceintes ?", a: "Plusieurs de nos praticiens sont spécifiquement formés à la périnatalité et à la pédiatrie. Précisez-le lors de la prise de rendez-vous." },
  { q: "Quels sont les moyens de paiement ?", a: "Carte bancaire (Visa, Mastercard), espèces, Orange Money, MTN Mobile Money, virement. Le règlement se fait à la fin de la séance ou directement à la commande en ligne." },
  { q: "Annulation et report ?", a: "L'annulation est gratuite jusqu'à 24h avant le rendez-vous. Passé ce délai, la séance est due — sauf cas de force majeure." },
  { q: "Proposez-vous des forfaits ou des abonnements ?", a: "Oui — des cartes de 5 et 10 séances (-10 % et -15 %) ainsi qu'un abonnement annuel « Cercle No Limit » offrant un bilan trimestriel, l'accès aux ateliers dans nos trois centres et 20 % sur l'ensemble des soins et de la boutique." },
  { q: "Avez-vous un parking ?", a: "Le centre de Douala dispose d'un parking privé sécurisé de 14 places. À Yaoundé, la résidence partenaire propose 8 places gratuites sur présentation de votre confirmation. À Bafoussam, parking de l'avenue de l'Indépendance, à 50 mètres." },
];

function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section style={{ padding: '160px 0', background: 'var(--cream-warm)' }}>
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

function FAQItem({ f, isOpen, onToggle }) {
  return (
    <div className="faq-item" style={{ borderBottom: '1px solid rgba(26,26,26,0.15)' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', textAlign: 'left',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24,
          padding: '28px 0',
        }}
      >
        <span style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(20px, 2.2vw, 26px)', fontWeight: 400, letterSpacing: '-0.01em' }}>{f.q}</span>
        <span style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
          <span style={{ position: 'absolute', width: 16, height: 1, background: 'var(--ink)', transition: 'transform .35s' }} />
          <span style={{ position: 'absolute', width: 16, height: 1, background: 'var(--ink)', transform: isOpen ? 'rotate(0)' : 'rotate(90deg)', transition: 'transform .35s' }} />
        </span>
      </button>
      <div style={{
        maxHeight: isOpen ? 300 : 0, overflow: 'hidden',
        transition: 'max-height .5s cubic-bezier(.2,.7,.2,1)',
      }}>
        <p style={{ paddingBottom: 28, fontSize: 16, lineHeight: 1.75, color: 'var(--ink-soft)', maxWidth: 680 }}>
          {f.a}
        </p>
      </div>
    </div>
  );
}

Object.assign(window, { FAQ });
