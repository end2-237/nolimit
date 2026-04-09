import { useState } from 'react';
import { FileText, Download, Calendar, BarChart3, PieChart, TrendingUp, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { APP_CONFIG } from '../config/app.config';

// Mock reports data
const recentReports = [
  { id: 1, title: 'Rapport Mensuel - Mars 2026', type: 'monthly', date: '2026-04-01', status: 'completed' },
  { id: 2, title: 'Rapport Hebdomadaire S14', type: 'weekly', date: '2026-04-07', status: 'completed' },
  { id: 3, title: 'Inventaire Q1 2026', type: 'quarterly', date: '2026-04-01', status: 'completed' },
  { id: 4, title: 'Rapport Journalier', type: 'daily', date: '2026-04-09', status: 'pending' },
];

const reportTypes = [
  { id: 'inventory', name: 'État des Stocks', icon: BarChart3, description: 'Vue détaillée de tous les stocks par site et catégorie' },
  { id: 'movements', name: 'Mouvements', icon: TrendingUp, description: 'Analyse des entrées, sorties et transferts' },
  { id: 'alerts', name: 'Alertes & Anomalies', icon: FileText, description: 'Récapitulatif des alertes et actions correctives' },
  { id: 'valuation', name: 'Valorisation', icon: PieChart, description: 'Valeur totale du stock par catégorie' },
];

export function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedSite, setSelectedSite] = useState('all');

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-[#F1F5F9] bg-white px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
              <p className="text-gray-500 text-sm mt-1">Générez et consultez vos rapports d&apos;inventaire</p>
            </div>
          </div>
          
          <Button className="bg-[#0284C7] hover:bg-[#0369A1]">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Rapport
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Aujourd&apos;hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedSite} onValueChange={setSelectedSite}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les sites</SelectItem>
              {APP_CONFIG.sites.map(site => (
                <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {/* Quick Report Types */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Générer un rapport</h2>
          <div className="grid grid-cols-4 gap-4">
            {reportTypes.map(report => {
              const Icon = report.icon;
              return (
                <Card key={report.id} className="cursor-pointer hover:border-[#0284C7] hover:shadow-md transition-all group">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-[#0284C7] transition-colors">
                      <Icon className="w-6 h-6 text-[#0284C7] group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{report.name}</h3>
                    <p className="text-sm text-gray-500">{report.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Reports */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Rapports récents</h2>
          <Card>
            <CardHeader className="border-b border-[#F1F5F9] py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Historique</CardTitle>
                <Button variant="ghost" size="sm" className="text-[#0284C7]">
                  Voir tout
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#F1F5F9] bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Titre</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Statut</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReports.map(report => (
                    <tr key={report.id} className="border-b border-[#F1F5F9] hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <span className="font-medium text-gray-900">{report.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="capitalize">{report.type}</Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{report.date}</td>
                      <td className="px-6 py-4">
                        <Badge className={report.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                          {report.status === 'completed' ? 'Terminé' : 'En cours'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {report.status === 'completed' && (
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Télécharger
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Stats Preview */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Aperçu du mois</h2>
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-sm text-gray-500 mb-1">Total Entrées</div>
                <div className="text-3xl font-bold text-green-600">+2,450</div>
                <div className="text-xs text-gray-400 mt-1">unités ce mois</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-sm text-gray-500 mb-1">Total Sorties</div>
                <div className="text-3xl font-bold text-red-600">-1,890</div>
                <div className="text-xs text-gray-400 mt-1">unités ce mois</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-sm text-gray-500 mb-1">Transferts</div>
                <div className="text-3xl font-bold text-blue-600">156</div>
                <div className="text-xs text-gray-400 mt-1">opérations ce mois</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-sm text-gray-500 mb-1">Valeur Stock</div>
                <div className="text-3xl font-bold text-[#0284C7]">45.2M</div>
                <div className="text-xs text-gray-400 mt-1">{APP_CONFIG.settings.currencySymbol}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
