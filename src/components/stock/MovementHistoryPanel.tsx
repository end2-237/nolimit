import { useState } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, RefreshCw, Filter } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface MovementHistoryPanelProps {
  onClose: () => void;
}

// Mock movement data
const movements = [
  {
    id: 1,
    type: 'entry',
    product: 'Artémisia Premium',
    sku: 'ART-001',
    quantity: 50,
    site: 'DLA',
    date: '2026-04-09T10:30:00',
    user: 'Jean Kamga',
    note: 'Livraison fournisseur',
  },
  {
    id: 2,
    type: 'transfer',
    product: 'Huile de Moringa',
    sku: 'MOR-002',
    quantity: 30,
    fromSite: 'DLA',
    toSite: 'YDE',
    date: '2026-04-09T09:15:00',
    user: 'Marie Nkolo',
    note: 'Transfert demandé par YDE',
  },
  {
    id: 3,
    type: 'exit',
    product: 'Complément Baobab',
    sku: 'BAO-003',
    quantity: 15,
    site: 'BAF',
    date: '2026-04-08T16:45:00',
    user: 'Paul Fotso',
    note: 'Vente en gros',
  },
  {
    id: 4,
    type: 'entry',
    product: 'Tisane Kinkeliba',
    sku: 'KIN-004',
    quantity: 100,
    site: 'YDE',
    date: '2026-04-08T14:20:00',
    user: 'Jean Kamga',
    note: 'Nouvelle livraison',
  },
  {
    id: 5,
    type: 'transfer',
    product: 'Poudre de Neem',
    sku: 'NEE-005',
    quantity: 20,
    fromSite: 'YDE',
    toSite: 'BAF',
    date: '2026-04-08T11:00:00',
    user: 'Marie Nkolo',
    note: 'Équilibrage des stocks',
  },
  {
    id: 6,
    type: 'exit',
    product: 'Huile de Karité Bio',
    sku: 'KAR-006',
    quantity: 25,
    site: 'DLA',
    date: '2026-04-07T15:30:00',
    user: 'Paul Fotso',
    note: 'Commande client #1247',
  },
  {
    id: 7,
    type: 'entry',
    product: 'Gingembre Séché',
    sku: 'GIN-007',
    quantity: 75,
    site: 'DLA',
    date: '2026-04-07T10:00:00',
    user: 'Jean Kamga',
    note: 'Réapprovisionnement mensuel',
  },
  {
    id: 8,
    type: 'exit',
    product: 'Spiruline Premium',
    sku: 'SPI-008',
    quantity: 40,
    site: 'YDE',
    date: '2026-04-06T14:15:00',
    user: 'Marie Nkolo',
    note: 'Vente pharmacie partenaire',
  },
];

const typeConfig = {
  entry: {
    label: 'Entrée',
    color: 'bg-green-100 text-green-700',
    icon: ArrowDownLeft,
    iconColor: 'text-green-600',
  },
  exit: {
    label: 'Sortie',
    color: 'bg-red-100 text-red-700',
    icon: ArrowUpRight,
    iconColor: 'text-red-600',
  },
  transfer: {
    label: 'Transfert',
    color: 'bg-purple-100 text-purple-700',
    icon: RefreshCw,
    iconColor: 'text-purple-600',
  },
};

export function MovementHistoryPanel({ onClose }: MovementHistoryPanelProps) {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSite, setFilterSite] = useState<string>('all');

  const filteredMovements = movements.filter((m) => {
    if (filterType !== 'all' && m.type !== filterType) return false;
    if (filterSite !== 'all') {
      if (m.type === 'transfer') {
        if (m.fromSite !== filterSite && m.toSite !== filterSite) return false;
      } else {
        if (m.site !== filterSite) return false;
      }
    }
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-[#0284C7]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Historique des Mouvements</h2>
              <p className="text-sm text-gray-500">
                Suivez toutes les entrées, sorties et transferts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-[#F1F5F9] bg-gray-50">
          <div className="flex items-center gap-4">
            <Filter className="w-4 h-4 text-gray-500" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Type:</span>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="entry">Entrées</SelectItem>
                  <SelectItem value="exit">Sorties</SelectItem>
                  <SelectItem value="transfer">Transferts</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Site:</span>
              <Select value={filterSite} onValueChange={setFilterSite}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="DLA">Douala</SelectItem>
                  <SelectItem value="YDE">Yaoundé</SelectItem>
                  <SelectItem value="BAF">Bafoussam</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Movement List */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="space-y-3">
            {filteredMovements.map((movement) => {
              const config = typeConfig[movement.type as keyof typeof typeConfig];
              const Icon = config.icon;

              return (
                <div
                  key={movement.id}
                  className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-[#F1F5F9] hover:bg-gray-100 transition-colors"
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white border border-[#F1F5F9]`}>
                    <Icon className={`w-5 h-5 ${config.iconColor}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{movement.product}</span>
                      <Badge className={config.color}>{config.label}</Badge>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      {movement.type === 'transfer' ? (
                        <span>
                          {movement.fromSite} → {movement.toSite}
                        </span>
                      ) : (
                        <span>Site: {movement.site}</span>
                      )}
                      <span className="mx-2">|</span>
                      <span className="font-mono font-semibold text-[#0284C7]">
                        {movement.type === 'exit' ? '-' : '+'}
                        {movement.quantity} unités
                      </span>
                    </div>
                    {movement.note && (
                      <div className="text-sm text-gray-500">{movement.note}</div>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="text-right text-sm">
                    <div className="text-gray-900 font-medium">{movement.user}</div>
                    <div className="text-gray-500">
                      {new Date(movement.date).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                      })}
                      {' '}
                      {new Date(movement.date).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredMovements.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Aucun mouvement trouvé avec ces filtres
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#F1F5F9] bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {filteredMovements.length} mouvement{filteredMovements.length > 1 ? 's' : ''} affiché{filteredMovements.length > 1 ? 's' : ''}
            </span>
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
