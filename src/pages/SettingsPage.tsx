import { useState } from 'react';
import { Settings, Building2, Users, Database, Bell, Palette, Globe, Shield, Save } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { APP_CONFIG } from '../config/app.config';

export function SettingsPage() {
  const [companyName, setCompanyName] = useState(APP_CONFIG.company.name);
  const [email, setEmail] = useState(APP_CONFIG.company.email);
  const [phone, setPhone] = useState(APP_CONFIG.company.phone);
  const [currency, setCurrency] = useState(APP_CONFIG.settings.currency);
  const [lowStockAlert, setLowStockAlert] = useState(true);
  const [expiryAlert, setExpiryAlert] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-[#F1F5F9] bg-white px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
            <Settings className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
            <p className="text-gray-500 text-sm mt-1">Configurez votre application</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="general" className="gap-2">
              <Building2 className="w-4 h-4" />
              Général
            </TabsTrigger>
            <TabsTrigger value="sites" className="gap-2">
              <Globe className="w-4 h-4" />
              Sites
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="database" className="gap-2">
              <Database className="w-4 h-4" />
              Base de Données
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="w-4 h-4" />
              Apparence
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general">
            <div className="grid gap-6 max-w-2xl">
              <Card>
                <CardHeader>
                  <CardTitle>Informations de l&apos;entreprise</CardTitle>
                  <CardDescription>Ces informations apparaîtront sur vos rapports et documents</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nom de l&apos;entreprise</Label>
                    <Input 
                      id="companyName" 
                      value={companyName} 
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        type="email"
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input 
                        id="phone" 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Préférences régionales</CardTitle>
                  <CardDescription>Configurez la devise et le format de date</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Devise</Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="XAF">XAF - Franc CFA</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="USD">USD - Dollar US</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Fuseau horaire</Label>
                      <Select defaultValue="Africa/Douala">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Africa/Douala">Africa/Douala (UTC+1)</SelectItem>
                          <SelectItem value="Europe/Paris">Europe/Paris (UTC+1/+2)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button className="bg-[#0284C7] hover:bg-[#0369A1]">
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Sites Settings */}
          <TabsContent value="sites">
            <Card className="max-w-2xl">
              <CardHeader>
                <CardTitle>Gestion des Sites</CardTitle>
                <CardDescription>Configurez vos différents points de stockage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {APP_CONFIG.sites.map(site => (
                    <div key={site.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
                          style={{ backgroundColor: site.color }}
                        >
                          {site.shortName}
                        </div>
                        <div>
                          <div className="font-medium">{site.name}</div>
                          <div className="text-sm text-gray-500">ID: {site.id}</div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">Modifier</Button>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full mt-4">
                    + Ajouter un site
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications">
            <Card className="max-w-2xl">
              <CardHeader>
                <CardTitle>Préférences de notifications</CardTitle>
                <CardDescription>Configurez quand et comment vous souhaitez être alerté</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Alertes de stock faible</div>
                    <div className="text-sm text-gray-500">Notification quand un produit passe sous le seuil</div>
                  </div>
                  <Switch checked={lowStockAlert} onCheckedChange={setLowStockAlert} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Alertes d&apos;expiration</div>
                    <div className="text-sm text-gray-500">Notification avant expiration des produits</div>
                  </div>
                  <Switch checked={expiryAlert} onCheckedChange={setExpiryAlert} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Notifications par email</div>
                    <div className="text-sm text-gray-500">Recevoir les alertes par email</div>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>

                <div className="pt-4 border-t">
                  <Label className="mb-2 block">Seuils d&apos;alerte</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-500">Stock faible (%)</Label>
                      <Input type="number" defaultValue="30" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-500">Jours avant expiration</Label>
                      <Input type="number" defaultValue="30" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Settings */}
          <TabsContent value="users">
            <Card className="max-w-2xl">
              <CardHeader>
                <CardTitle>Gestion des Utilisateurs</CardTitle>
                <CardDescription>Gérez les accès et les rôles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'Jean Dupont', email: 'jean@nolimit.cm', role: 'Admin', site: 'Tous' },
                    { name: 'Marie Kamga', email: 'marie@nolimit.cm', role: 'Manager', site: 'Douala' },
                    { name: 'Paul Nkomo', email: 'paul@nolimit.cm', role: 'Opérateur', site: 'Yaoundé' },
                  ].map((user, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#0284C7] flex items-center justify-center text-white font-semibold">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">{user.role}</div>
                          <div className="text-xs text-gray-500">{user.site}</div>
                        </div>
                        <Button variant="outline" size="sm">Modifier</Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full mt-4">
                    <Users className="w-4 h-4 mr-2" />
                    Ajouter un utilisateur
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Database Settings */}
          <TabsContent value="database">
            <Card className="max-w-2xl">
              <CardHeader>
                <CardTitle>Base de Données SQLite</CardTitle>
                <CardDescription>Informations et maintenance de la base de données locale</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-500">Nom du fichier</div>
                    <div className="font-mono text-sm">{APP_CONFIG.database.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Version du schéma</div>
                    <div className="font-mono text-sm">v{APP_CONFIG.database.version}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Taille</div>
                    <div className="font-mono text-sm">2.4 MB</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Dernière sauvegarde</div>
                    <div className="font-mono text-sm">2026-04-09 08:00</div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline">
                    <Database className="w-4 h-4 mr-2" />
                    Sauvegarder
                  </Button>
                  <Button variant="outline">
                    Restaurer
                  </Button>
                  <Button variant="outline" className="text-red-600 hover:bg-red-50">
                    Réinitialiser
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance">
            <Card className="max-w-2xl">
              <CardHeader>
                <CardTitle>Personnalisation de l&apos;interface</CardTitle>
                <CardDescription>Ajustez l&apos;apparence de votre application</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Couleur principale</Label>
                  <div className="flex gap-3">
                    {['#0284C7', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'].map(color => (
                      <button
                        key={color}
                        className="w-10 h-10 rounded-lg border-2 border-transparent hover:border-gray-300 transition-colors"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Mode sombre</div>
                    <div className="text-sm text-gray-500">Activer le thème sombre</div>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Animations</div>
                    <div className="text-sm text-gray-500">Activer les animations de l&apos;interface</div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
