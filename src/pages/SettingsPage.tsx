import { useState } from 'react';
import { Settings, Database, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { db } from '../services/database';
import { useAuth } from '../stores/authStore';
import { APP_CONFIG } from '../config/app.config';

export function SettingsPage() {
  const { user } = useAuth();
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const handleReset = () => {
    if (!resetConfirm) { setResetConfirm(true); return; }
    db.reset();
    setResetDone(true);
    setTimeout(() => window.location.reload(), 1500);
  };

  const storageSize = (() => {
    try {
      const raw = localStorage.getItem('snl_db_v2') || '';
      return (new Blob([raw]).size / 1024).toFixed(1) + ' KB';
    } catch { return '—'; }
  })();

  const stats = db.getDashboardStats();

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-[#F1F5F9] bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <Settings className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Paramètres</h1>
            <p className="text-gray-500 text-sm">Configuration de l'application</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6 space-y-6 max-w-2xl">
        {/* App Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations de l'Application</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Nom', value: APP_CONFIG.name },
              { label: 'Version', value: `v${APP_CONFIG.version}` },
              { label: 'Entreprise', value: APP_CONFIG.company.name },
              { label: 'Email', value: APP_CONFIG.company.email },
              { label: 'Sites configurés', value: APP_CONFIG.sites.map(s => s.name).join(', ') },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-500">{item.label}</span>
                <span className="text-sm font-medium text-gray-900">{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Database Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="w-4 h-4" />
              Base de Données Locale
            </CardTitle>
            <CardDescription>Données stockées dans le navigateur (localStorage)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Produits', value: stats.totalProducts },
                { label: 'Taille', value: storageSize },
                { label: 'Utilisateurs', value: db.getUsers().length },
                { label: 'Mouvements', value: db.getMovements().length },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500">{s.label}</div>
                  <div className="font-bold text-gray-900 font-mono">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Reset */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Réinitialisation</h4>
              <p className="text-xs text-gray-500 mb-3">
                Supprime toutes les données (produits, mouvements, alertes) et restaure les données de démonstration.
                Les utilisateurs sont conservés.
              </p>
              {resetDone ? (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Réinitialisation effectuée, rechargement...
                </div>
              ) : (
                <Button
                  variant={resetConfirm ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={handleReset}
                  className="gap-2"
                >
                  {resetConfirm ? (
                    <><AlertTriangle className="w-3.5 h-3.5" />Confirmer la réinitialisation</>
                  ) : (
                    <><RefreshCw className="w-3.5 h-3.5" />Réinitialiser les données</>
                  )}
                </Button>
              )}
              {resetConfirm && !resetDone && (
                <button onClick={() => setResetConfirm(false)} className="ml-3 text-xs text-gray-400 hover:text-gray-600">
                  Annuler
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current User */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Session Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0284C7] flex items-center justify-center text-white font-bold text-sm">
                {user?.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <div className="font-semibold text-gray-900">{user?.full_name}</div>
                <div className="text-xs text-gray-500">{user?.email} · {user?.role}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}