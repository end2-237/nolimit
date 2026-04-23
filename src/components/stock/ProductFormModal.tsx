import { useState } from 'react';
import { X, Package, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { db, generateSKU } from '../../services/database';
import { APP_CONFIG } from '../../config/app.config';

interface ProductFormModalProps {
  product?: any;
  onClose: () => void;
}

export function ProductFormModal({ product, onClose }: ProductFormModalProps) {
  const isEdit = !!product;
  const [form, setForm] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    category: product?.category || 'plante',
    sub_type: product?.sub_type || '',
    custom_category: product?.custom_category || '',
    description: product?.description || '',
    unit: product?.unit || 'unité',
    price: product?.price?.toString() || '',
    threshold: product?.threshold?.toString() || '',
    expiry_date: product?.expiry_date || '',
  });
  const [skuAuto, setSkuAuto] = useState(!isEdit || !product?.sku);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(product?.custom_category ? true : false);

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  // When name or category changes, auto-update SKU
  const handleNameChange = (val: string) => {
    set('name', val);
    if (skuAuto && val.trim()) {
      const sku = generateSKU(form.category, val, db.getExistingSkus().filter(s => s !== form.sku));
      set('sku', sku);
    }
  };

  const handleCategoryChange = (val: string) => {
    if (val === 'autre') {
      setShowCustomCategory(true);
      set('custom_category', '');
    } else {
      setShowCustomCategory(false);
      set('category', val);
      set('custom_category', '');
      set('sub_type', '');
      if (skuAuto && form.name.trim()) {
        const sku = generateSKU(val, form.name, db.getExistingSkus().filter(s => s !== form.sku));
        set('sku', sku);
      }
    }
  };

  const regenerateSku = () => {
    if (form.name.trim()) {
      const sku = generateSKU(form.category, form.name, db.getExistingSkus().filter(s => s !== form.sku));
      set('sku', sku);
      setSkuAuto(true);
    }
  };

  const needsSubType = form.category === 'test' || form.category === 'materiel';
  const subTypeOptions = form.category === 'test'
    ? (APP_CONFIG as any).testTypes || []
    : (APP_CONFIG as any).materialTypes || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.threshold) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (showCustomCategory && !form.custom_category.trim()) {
      setError('Veuillez entrer une catégorie personnalisée');
      return;
    }
    if (needsSubType && !form.sub_type) {
      setError('Veuillez sélectionner un sous-type');
      return;
    }

    const finalCategory = showCustomCategory ? form.custom_category : form.category;
    const data = {
      name: form.name,
      sku: form.sku || generateSKU(finalCategory, form.name, db.getExistingSkus()),
      category: finalCategory,
      custom_category: showCustomCategory ? form.custom_category : undefined,
      sub_type: form.sub_type || undefined,
      description: form.description,
      unit: form.unit,
      price: parseFloat(form.price),
      threshold: parseInt(form.threshold),
      expiry_date: form.expiry_date || null,
      count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isEdit) {
      db.updateProduct(product.id, data);
    } else {
      db.createProduct(data);
    }

    setIsSuccess(true);
    setTimeout(onClose, 1200);
  };

  const categoryColors: Record<string, string> = {
    plante: 'bg-emerald-100 text-emerald-700',
    huile: 'bg-amber-100 text-amber-700',
    complement_alimentaire: 'bg-cyan-100 text-cyan-700',
    cosmetique: 'bg-pink-100 text-pink-700',
    ampoule_buvable: 'bg-blue-100 text-blue-700',
    poudre: 'bg-yellow-100 text-yellow-700',
    creme: 'bg-rose-100 text-rose-700',
    the: 'bg-teal-100 text-teal-700',
    boisson: 'bg-orange-100 text-orange-700',
    colis: 'bg-gray-100 text-gray-700',
    materiel: 'bg-slate-100 text-slate-700',
    test: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100 rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
              <Package className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold">{isEdit ? 'Modifier le Produit' : 'Nouveau Produit'}</h2>
              <p className="text-xs text-gray-500">{isEdit ? product.name : 'Créer une nouvelle référence'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {isSuccess ? (
          <div className="px-6 py-12 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">{isEdit ? 'Produit mis à jour !' : 'Produit créé !'}</h3>
            {!isEdit && <p className="text-xs text-gray-400 mt-1">SKU attribué : <span className="font-mono font-bold">{form.sku}</span></p>}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">{error}</div>}

            {/* Name */}
            <div className="col-span-2">
              <Label>Nom du Produit <span className="text-red-500">*</span></Label>
              <Input className="mt-1" value={form.name} onChange={e => handleNameChange(e.target.value)} placeholder="ex: Artémisia Premium" required />
            </div>

            {/* SKU */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Matricule / SKU <span className="text-gray-400 text-xs">(auto-généré)</span></Label>
                <button type="button" onClick={regenerateSku}
                  className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 transition-colors">
                  <RefreshCw className="w-3 h-3" /> Régénérer
                </button>
              </div>
              <Input
                className="font-mono uppercase bg-gray-50"
                value={form.sku}
                onChange={e => { set('sku', e.target.value.toUpperCase()); setSkuAuto(false); }}
                placeholder="Auto-généré"
              />
              <p className="text-xs text-gray-400 mt-0.5">Laissez vide pour génération automatique</p>
            </div>

            {/* Category + sub-type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Catégorie</Label>
                <Select value={showCustomCategory ? 'autre' : form.category} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APP_CONFIG.categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${c.color}`}>{c.name}</span>
                      </SelectItem>
                    ))}
                    <SelectItem value="autre">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">Autre / Personnalisé</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {showCustomCategory ? (
                <div>
                  <Label>Nom de la catégorie <span className="text-red-500">*</span></Label>
                  <Input
                    className="mt-1"
                    placeholder="ex: Herbes rares, Supplément"
                    value={form.custom_category}
                    onChange={e => set('custom_category', e.target.value)}
                  />
                </div>
              ) : needsSubType ? (
                <div>
                  <Label>Sous-type <span className="text-red-500">*</span></Label>
                  <Select value={form.sub_type} onValueChange={v => set('sub_type', v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                      {subTypeOptions.map((st: string) => (
                        <SelectItem key={st} value={st}>{st}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label>Unité</Label>
                  <Select value={form.unit} onValueChange={v => set('unit', v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['unité', 'sachet', 'flacon', 'boîte', 'pot', 'ampoule', 'tube', 'kg', 'g', 'L', 'mL', 'comprimé', 'gélule'].map(u => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {needsSubType && (
              <div>
                <Label>Unité</Label>
                <Select value={form.unit} onValueChange={v => set('unit', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['unité', 'sachet', 'flacon', 'boîte', 'pot', 'ampoule', 'tube', 'kg', 'g', 'L', 'mL', 'comprimé', 'gélule', 'carton'].map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prix Unitaire (XAF) <span className="text-red-500">*</span></Label>
                <Input className="mt-1 font-mono" type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="2500" min="0" required />
              </div>
              <div>
                <Label>Seuil d'Alerte <span className="text-red-500">*</span></Label>
                <Input className="mt-1 font-mono" type="number" value={form.threshold} onChange={e => set('threshold', e.target.value)} placeholder="50" min="1" required />
                <p className="text-xs text-gray-400 mt-0.5">Alerte si stock total &lt; seuil</p>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Input className="mt-1" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Description courte" />
            </div>

            <div>
              <Label>Date d'Expiration</Label>
              <Input className="mt-1" type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
              <Button type="submit" className="flex-1 bg-[#0284C7] hover:bg-[#0369A1]">
                {isEdit ? 'Enregistrer' : 'Créer le Produit'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
