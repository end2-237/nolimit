import { useState } from 'react';
import { X, Package, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { db } from '../../services/database';
import { APP_CONFIG } from '../../config/app.config';

interface ProductFormModalProps {
  product?: any; // null = création, sinon édition
  onClose: () => void;
}

export function ProductFormModal({ product, onClose }: ProductFormModalProps) {
  const isEdit = !!product;
  const [form, setForm] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    category: product?.category || 'Plante',
    description: product?.description || '',
    unit: product?.unit || 'unité',
    price: product?.price?.toString() || '',
    threshold: product?.threshold?.toString() || '',
    expiry_date: product?.expiry_date || '',
  });
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.sku || !form.price || !form.threshold) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const data = {
      name: form.name,
      sku: form.sku.toUpperCase(),
      category: form.category,
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100 rounded-t-2xl">
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
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">{error}</div>}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nom du Produit <span className="text-red-500">*</span></Label>
                <Input className="mt-1" value={form.name} onChange={e => set('name', e.target.value)} placeholder="ex: Artémisia Premium" required />
              </div>
              <div>
                <Label>SKU <span className="text-red-500">*</span></Label>
                <Input className="mt-1 font-mono uppercase" value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="ART-001" required />
              </div>
              <div>
                <Label>Catégorie</Label>
                <Select value={form.category} onValueChange={v => set('category', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APP_CONFIG.categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unité</Label>
                <Select value={form.unit} onValueChange={v => set('unit', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['unité', 'sachet', 'flacon', 'boîte', 'pot', 'kg', 'g', 'L', 'mL'].map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prix Unitaire (XAF) <span className="text-red-500">*</span></Label>
                <Input className="mt-1 font-mono" type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="2500" min="0" required />
              </div>
              <div>
                <Label>Seuil d'Alerte <span className="text-red-500">*</span></Label>
                <Input className="mt-1 font-mono" type="number" value={form.threshold} onChange={e => set('threshold', e.target.value)} placeholder="50" min="1" required />
                <p className="text-xs text-gray-400 mt-0.5">Alerte quand stock total &lt; seuil</p>
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Input className="mt-1" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Description courte du produit" />
              </div>
              <div>
                <Label>Date d'Expiration</Label>
                <Input className="mt-1" type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} />
              </div>
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