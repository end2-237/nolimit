import { X, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface MovementHistoryPanelProps {
  onClose: () => void;
}

const mockMovements = [
  {
    id: 1,
    type: 'in',
    product: 'Artémisia Premium',
    quantity: 50,
    site: 'DLA',
    user: 'Marie Kamdem',
    timestamp: '2026-04-09 14:30',
    notes: 'Réapprovisionnement mensuel',
  },
  {
    id: 2,
    type: 'transfer',
    product: 'Huile de Moringa',
    quantity: 30,
    fromSite: 'DLA',
    toSite: 'YDE',
    user: 'Jean Fotso',
    timestamp: '2026-04-09 11:15',
    notes: 'Transfert pour demande urgente',
  },
  {
    id: 3,
    type: 'out',
    product: 'Complément Baobab',
    quantity: 10,
    site: 'YDE',
    user: 'Sophie Nkeng',
    timestamp: '2026-04-09 09:45',
    notes: 'Vente client',
  },
  {
    id: 4,
    type: 'in',
    product: 'Tisane Kinkeliba',
    quantity: 75,
    site: 'BAF',
    user: 'Paul Tchami',
    timestamp: '2026-04-08 16:20',
    notes: 'Livraison fournisseur',
  },
  {
    id: 5,
    type: 'out',
    product: 'Poudre de Neem',
    quantity: 5,
    site: 'DLA',
    user: 'Marie Kamdem',
    timestamp: '2026-04-08 14:00',
    notes: 'Ajustement inventaire',
  },
  {
    id: 6,
    type: 'transfer',
    product: 'Huile de Karité Bio',
    quantity: 20,
    fromSite: 'YDE',
    toSite: 'BAF',
    user: 'Jean Fotso',
    timestamp: '2026-04-08 10:30',
    notes: 'Équilibrage des stocks',
  },
];

export function MovementHistoryPanel({ onClose }: MovementHistoryPanelProps) {
  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'out':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'transfer':
        return <RefreshCw className="w-4 h-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'in':
        return <Badge className="bg-green-100 text-green-700">Entrée</Badge>;
      case 'out':
        return <Badge className="bg-red-100 text-red-700">Sortie</Badge>;
      case 'transfer':
        return <Badge className="bg-blue-100 text-blue-700">Transfert</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-end z-50">
      <div
        className="bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right"
        style={{ width: '480px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F5F9]">
          <div>
            <h2 className="text-lg font-semibold">Historique des Mouvements</h2>
            <p className="text-sm text-gray-500">
              Traçabilité complète des opérations
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="space-y-4">
            {mockMovements.map((movement, index) => (
              <div
                key={movement.id}
                className="relative pl-6 pb-6 border-l-2 border-gray-200 last:border-0 last:pb-0"
              >
                {/* Icon */}
                <div className="absolute left-0 top-0 -translate-x-1/2 bg-white p-1 rounded-full border-2 border-gray-200">
                  {getMovementIcon(movement.type)}
                </div>

                {/* Content */}
                <div className="bg-gray-50 rounded-lg p-4 border border-[#F1F5F9]">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 mb-1">
                        {movement.product}
                      </div>
                      {getMovementBadge(movement.type)}
                    </div>
                    <div
                      className="text-lg font-bold text-gray-900"
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {movement.type === 'out' ? '-' : '+'}{movement.quantity}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 text-sm">
                    {movement.type === 'transfer' ? (
                      <div className="text-gray-600">
                        <span className="font-medium">{movement.fromSite}</span>
                        {' → '}
                        <span className="font-medium">{movement.toSite}</span>
                      </div>
                    ) : (
                      <div className="text-gray-600">
                        Site: <span className="font-medium">{movement.site}</span>
                      </div>
                    )}
                    
                    <div className="text-gray-600">
                      Par: <span className="font-medium">{movement.user}</span>
                    </div>
                    
                    <div className="text-gray-500 text-xs">
                      {movement.timestamp}
                    </div>

                    {movement.notes && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="text-xs text-gray-500 italic">
                          {movement.notes}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#F1F5F9]">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full"
          >
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
