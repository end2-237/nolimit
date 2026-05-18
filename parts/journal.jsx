// Journal — 3 featured articles
const ARTICLES = [
  { id: 1, cat: 'Rituel saisonnier', title: 'Une cure de printemps qui ne fatigue pas le foie', date: '12 mai 2026', read: '6 min', tone: 'sage' },
  { id: 2, cat: 'Sommeil',           title: "Le rôle silencieux du magnésium dans l'endormissement", date: '28 avril 2026', read: '4 min', tone: '' },
  { id: 3, cat: 'Médecine chinoise', title: "Méridien du foie : pourquoi le printemps est sa saison", date: '14 avril 2026', read: '7 min', tone: 'warm' },
];

function Journal() {
  return (
    <section id="journal" style={{ padding: 'var(--sec-pad) 0' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 40, marginBottom: 60 }}>
          <div>
            <Reveal><span className="eyebrow">06 — Journal</span></Reveal>
            <Reveal delay={100}>
              <h2 style={{ fontSize: 'clamp(40px, 5vw, 80px)', marginTop: 28, fontWeight: 300 }}>
                Le savoir de nos praticiens,<br />en accès <em>libre</em>.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <button className="btn btn-outline">Tous les articles <Arrow /></button>
          </Reveal>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 28 }} className="articles-grid">
          {ARTICLES.map((a, i) => (
            <ArticleCard key={a.id} a={a} featured={i === 0} delay={i * 100} />
          ))}
        </div>
      </div>

      <style>{`@media (max-width: 900px) { .articles-grid { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}

function ArticleCard({ a, featured, delay }) {
  const [hover, setHover] = useState(false);
  return (
    <Reveal delay={delay}>
      <a
        href="#"
        className="article-card"
        onClick={(e) => e.preventDefault()}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ display: 'block' }}
      >
        <div className={`ph ${a.tone}`} style={{ aspectRatio: featured ? '4/5' : '4/4', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, transition: 'transform .9s ease', transform: hover ? 'scale(1.06)' : 'scale(1)' }}>
            <div className={`ph ${a.tone}`} style={{ width: '100%', height: '100%' }}>
              <span className="ph-label">[ illustration — {a.title.toLowerCase().slice(0, 40)}… ]</span>
            </div>
          </div>
          <div style={{ position: 'absolute', top: 18, left: 18, background: 'rgba(245,241,234,0.92)', padding: '6px 12px', borderRadius: 999, fontFamily: 'var(--sans)', fontSize: 12, letterSpacing: '0.04em', }}>
            {a.cat}
          </div>
        </div>
        <div style={{ marginTop: 22 }}>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 13, letterSpacing: '0.05em', color: 'var(--muted)', display: 'flex', gap: 14 }}>
            <span>{a.date}</span>
            <span>·</span>
            <span>{a.read}</span>
          </div>
          <h3 style={{ fontSize: featured ? 'clamp(28px, 3vw, 42px)' : 'clamp(22px, 2vw, 28px)', marginTop: 12, fontWeight: 400, letterSpacing: '-0.01em', position: 'relative', display: 'inline-block' }}>
            {a.title}
            <span style={{
              position: 'absolute', left: 0, bottom: -4, height: 1, background: 'var(--ink)',
              width: hover ? '100%' : '0%', transition: 'width .5s cubic-bezier(.2,.7,.2,1)',
            }} />
          </h3>
        </div>
      </a>
    </Reveal>
  );
}

Object.assign(window, { Journal });
