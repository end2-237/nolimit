import {
  Download, Shield, Package, Clock, CheckCircle,
  AlertCircle, Zap, Monitor,
} from 'lucide-react';
import { APP_CONFIG } from '../config/app.config';

interface Release {
  version: string;
  date: string;
  isLatest?: boolean;
  isBeta?: boolean;
  changelog: string[];
  filename: string;
  size: string;
}

const RELEASES: Release[] = [
  {
    version: '1.1.0',
    date: '2026-05-20',
    isLatest: true,
    changelog: [
      "Ajout des ordonnances avec mode hors-ligne et file d'attente",
      "Modification d'une ordonnance existante (mode édition)",
      "Dashboard vitrine avec recharts & design compact SaaS",
      "Navigation enrichie — wiring complet des pages Site Web",
      "Synchronisation WebSocket temps réel améliorée",
      "Page téléchargements avec releases versionnées",
      "Corrections de bugs et améliorations de performance",
    ],
    filename: 'SNL-Setup-1.1.0.exe',
    size: '~85 Mo',
  },
  {
    version: '1.0.0',
    date: '2026-01-15',
    changelog: [
      "Première version stable de SNL",
      "Gestion multi-sites (Douala, Yaoundé, Bafoussam)",
      "Mouvements de stock avec historique complet",
      "Alertes de stock bas et expiration",
      "Rapports et exports CSV / Excel",
      "Interface administrateur et gestion des rôles",
      "Mode hors-ligne avec synchronisation automatique",
    ],
    filename: 'SNL-Setup-1.0.0.exe',
    size: '~80 Mo',
  },
];

function triggerDownload(path: string, filename: string) {
  const a = document.createElement('a');
  a.href = path;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ── Release card ──────────────────────────────────────────────── */
function ReleaseCard({ release }: { release: Release }) {
  const dateStr = new Date(release.date).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div style={{
      border: `1px solid ${release.isLatest ? '#BBF7D0' : '#E2E8F0'}`,
      borderRadius: 14,
      background: release.isLatest ? '#F0FDF4' : 'white',
      overflow: 'hidden',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 24px', flexWrap: 'wrap', gap: 12,
        borderBottom: `1px solid ${release.isLatest ? '#BBF7D0' : '#F1F5F9'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: release.isLatest ? '#16A34A' : '#F1F5F9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Package size={18} color={release.isLatest ? 'white' : '#64748B'} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
                v{release.version}
              </span>
              {release.isLatest && (
                <span style={{
                  fontSize: 9.5, fontWeight: 800, color: '#16A34A',
                  background: '#DCFCE7', border: '1px solid #BBF7D0',
                  padding: '2px 8px', borderRadius: 99,
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>
                  LATEST
                </span>
              )}
              {release.isBeta && (
                <span style={{
                  fontSize: 9.5, fontWeight: 800, color: '#9333EA',
                  background: '#F3E8FF', border: '1px solid #E9D5FF',
                  padding: '2px 8px', borderRadius: 99,
                }}>
                  BETA
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <span style={{ fontSize: 11.5, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} color="#94A3B8" /> {dateStr}
              </span>
              <span style={{ color: '#CBD5E1' }}>·</span>
              <span style={{ fontSize: 11.5, color: '#94A3B8' }}>{release.size}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => triggerDownload(`/downloads/${release.filename}`, release.filename)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 20px', borderRadius: 8,
            background: release.isLatest ? '#16A34A' : '#F8FAFC',
            color: release.isLatest ? 'white' : '#374151',
            border: `1px solid ${release.isLatest ? '#16A34A' : '#E2E8F0'}`,
            fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
            transition: 'background 0.15s',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = release.isLatest ? '#15803D' : '#F1F5F9';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = release.isLatest ? '#16A34A' : '#F8FAFC';
          }}
        >
          <Download size={13} />
          Télécharger .exe
        </button>
      </div>

      {/* Changelog */}
      <div style={{ padding: '16px 24px' }}>
        <div style={{
          fontSize: 10.5, fontWeight: 700, color: '#94A3B8',
          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10,
        }}>
          Nouveautés
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {release.changelog.map((item, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: '#374151' }}>
              <CheckCircle size={13} color="#22C55E" style={{ flexShrink: 0, marginTop: 1 }} />
              {item}
            </li>
          ))}
        </ul>

        <div style={{
          marginTop: 14, padding: '10px 14px', borderRadius: 8,
          background: '#F8FAFC', border: '1px solid #F1F5F9',
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <AlertCircle size={12} color="#94A3B8" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 11.5, color: '#64748B', lineHeight: 1.55 }}>
            Fichier :{' '}
            <code style={{
              fontFamily: "'JetBrains Mono', monospace",
              background: '#E2E8F0', padding: '1px 5px', borderRadius: 3, fontSize: 10.5,
            }}>
              {release.filename}
            </code>
            {' '}· Windows 10/11 64-bit · Electron
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Recovery section ──────────────────────────────────────────── */
function RecoverySection() {
  return (
    <section>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #F1F5F9',
      }}>
        <Shield size={15} color="#64748B" />
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: 0, letterSpacing: '-0.01em' }}>
          Outil de récupération de données
        </h2>
        <span style={{
          fontSize: 10, fontWeight: 600, color: '#DC2626',
          background: '#FEF2F2', padding: '2px 7px', borderRadius: 99, border: '1px solid #FECACA',
        }}>
          Urgence
        </span>
      </div>

      <div style={{ border: '1px solid #FED7AA', borderRadius: 14, background: '#FFFBEB', overflow: 'hidden' }}>
        {/* Card header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #FED7AA',
          display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, background: '#F97316',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Shield size={20} color="white" />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 4 }}>
              SNL Recovery — Outil de récupération IndexedDB
            </div>
            <p style={{ fontSize: 13, color: '#78350F', lineHeight: 1.6, margin: 0 }}>
              Exporte les données de l'application SNL même si l'app ne s'ouvre plus.
              Fonctionne en mode standalone — Node.js requis, aucune installation nécessaire.
            </p>
          </div>
          <button
            onClick={() => triggerDownload('/downloads/snl-recuperation.zip', 'snl-recuperation.zip')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 20px', borderRadius: 8,
              background: '#F97316', color: 'white',
              border: 'none', fontSize: 12.5, fontWeight: 700,
              cursor: 'pointer', transition: 'background 0.15s',
              whiteSpace: 'nowrap', fontFamily: 'inherit', flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#EA580C'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F97316'; }}
          >
            <Download size={13} />
            Télécharger .zip
          </button>
        </div>

        {/* Details grid */}
        <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div style={{
              fontSize: 10.5, fontWeight: 700, color: '#92400E',
              letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10,
            }}>
              Contenu du dossier
            </div>
            {[
              ['lancer.bat',        "Double-cliquer pour démarrer"],
              ['electron-main.cjs', "Mode Electron (recommandé)"],
              ['serveur.cjs',       "Mode navigateur (Node.js)"],
              ['recuperer.html',    "Interface de récupération"],
            ].map(([file, desc]) => (
              <div key={file} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 7 }}>
                <code style={{
                  fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace",
                  background: '#FEF3C7', color: '#92400E',
                  padding: '1px 6px', borderRadius: 3, flexShrink: 0,
                }}>
                  {file}
                </code>
                <span style={{ fontSize: 11.5, color: '#78350F' }}>{desc}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{
              fontSize: 10.5, fontWeight: 700, color: '#92400E',
              letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10,
            }}>
              Prérequis & utilisation
            </div>
            {[
              ['Windows 10/11',      "Système requis"],
              ['Node.js LTS',        "nodejs.org — requis pour les deux modes"],
              ['Mode Electron',      "Accède aux vraies données de l'app SNL installée"],
              ['100 % lecture seule', "Ne modifie aucune donnée"],
            ].map(([label, desc]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 7 }}>
                <Zap size={11} color="#F97316" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 11.5, color: '#78350F', lineHeight: 1.5 }}>
                  <strong style={{ color: '#92400E' }}>{label}</strong> — {desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div style={{
          padding: '12px 24px', borderTop: '1px solid #FED7AA',
          background: '#FEF3C7', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertCircle size={13} color="#B45309" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 11.5, color: '#92400E', lineHeight: 1.5 }}>
            Après export : Paramètres → Importer une sauvegarde → sélectionner{' '}
            <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5 }}>
              snl-recovery-YYYY-MM-DD.json
            </code>
          </span>
        </div>
      </div>
    </section>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */
export function DownloadsPage() {
  return (
    <div style={{
      padding: '28px 32px', maxWidth: 960,
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    }}>
      {/* Page header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Download size={18} color="#16A34A" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', margin: 0 }}>
              Téléchargements
            </h1>
            <p style={{ fontSize: 12, color: '#94A3B8', margin: 0, marginTop: 2 }}>
              Application SNL · Version actuelle {APP_CONFIG.version} · Outil de récupération
            </p>
          </div>
        </div>
      </div>

      {/* Releases */}
      <section style={{ marginBottom: 48 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #F1F5F9',
        }}>
          <Monitor size={15} color="#64748B" />
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: 0, letterSpacing: '-0.01em' }}>
            Releases de l'application
          </h2>
          <span style={{
            fontSize: 10, fontWeight: 600, color: '#94A3B8',
            background: '#F1F5F9', padding: '2px 7px', borderRadius: 99,
          }}>
            Electron · Windows
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {RELEASES.map(r => <ReleaseCard key={r.version} release={r} />)}
        </div>
      </section>

      {/* Recovery */}
      <RecoverySection />
    </div>
  );
}
