import React, { useState, useEffect, useMemo } from 'react';
import { Vegetable, Language, VegetableAdminPayload } from '@common/types';
import { addVegetable, updateVegetable } from '@common/api';

interface VegetableEditModalProps {
  vegetable: Vegetable | null;
  onClose: () => void;
  onSave: () => void;
}

const initialFormState: VegetableAdminPayload = {
  name: { [Language.EN]: '', [Language.HI]: '' },
  sabzimatePrice: 0,
  marketPrice: 0,
  unit: { [Language.EN]: 'kg', [Language.HI]: 'किलो' },
  image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=1740&auto=format=fit=crop', // Default placeholder
  isAvailable: true,
  offerTag: '',
  description: '',
  category: 'OTHER',
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const VegetableEditModal: React.FC<VegetableEditModalProps> = ({ vegetable, onClose, onSave }) => {
  const [formData, setFormData] = useState<VegetableAdminPayload>(initialFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // State for discount calculation
  const [discountPercent, setDiscountPercent] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');

  useEffect(() => {
    if (vegetable) {
      setFormData({
          name: vegetable.name,
          marketPrice: vegetable.marketPrice,
          sabzimatePrice: vegetable.price,
          unit: vegetable.unit,
          image: vegetable.image,
          isAvailable: vegetable.isAvailable,
          offerTag: vegetable.offerTag || '',
          description: vegetable.description || '',
          category: vegetable.category || 'OTHER',
      });
      setImagePreview(vegetable.image);
    } else {
      setFormData(initialFormState);
      setImagePreview(initialFormState.image);
    }
  }, [vegetable]);

  // Effect to handle dynamic discount calculation
  useEffect(() => {
      const marketP = parseFloat(String(formData.marketPrice));
      const sabzimateP = parseFloat(String(formData.sabzimatePrice));

      if (!isNaN(marketP) && marketP > 0 && !isNaN(sabzimateP)) {
          const diff = marketP - sabzimateP;
          const perc = (diff / marketP) * 100;
          setDiscountAmount(diff >= 0 ? diff.toFixed(2) : '');
          setDiscountPercent(perc >= 0 ? perc.toFixed(1) : '');
      } else {
          setDiscountAmount('');
          setDiscountPercent('');
      }
  }, [formData.marketPrice, formData.sabzimatePrice]);

  const handleDiscountPercentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const perc = parseFloat(e.target.value);
      setDiscountPercent(e.target.value);
      const marketP = parseFloat(String(formData.marketPrice));
      if (!isNaN(perc) && !isNaN(marketP) && marketP > 0) {
          const newSabzimatePrice = marketP - (marketP * (perc / 100));
          setFormData(prev => ({ ...prev, sabzimatePrice: parseFloat(newSabzimatePrice.toFixed(2)) }));
      }
  };

  const handleDiscountAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const amount = parseFloat(e.target.value);
      setDiscountAmount(e.target.value);
      const marketP = parseFloat(String(formData.marketPrice));
      if (!isNaN(amount) && !isNaN(marketP) && marketP > 0) {
          const newSabzimatePrice = marketP - amount;
          setFormData(prev => ({ ...prev, sabzimatePrice: parseFloat(newSabzimatePrice.toFixed(2)) }));
      }
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    const isCheckbox = type === 'checkbox';
    const checked = (e.target as HTMLInputElement).checked;

    if (name.startsWith('name.')) {
      const lang = name.split('.')[1] as Language;
      setFormData(prev => ({...prev, name: {...prev.name, [lang]: value}}));
    } else if (name.startsWith('unit.')) {
        const lang = name.split('.')[1] as Language;
        setFormData(prev => ({...prev, unit: {...prev.unit, [lang]: value}}));
    } else {
        setFormData(prev => ({ ...prev, [name]: isCheckbox ? checked : value }));
    }
  };
  
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const base64 = await fileToBase64(file);
        setFormData(prev => ({ ...prev, image: base64 }));
        setImagePreview(base64);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    // Prepare the payload, ensuring prices are numbers
    const payload: VegetableAdminPayload = {
      ...formData,
      marketPrice: parseFloat(String(formData.marketPrice)),
      sabzimatePrice: parseFloat(String(formData.sabzimatePrice)),
    };
    
    try {
      if (vegetable) {
        await updateVegetable({ id: vegetable.id, ...payload });
      } else {
        await addVegetable(payload);
      }
      onSave();
    } catch (error: any) {
      console.error('Failed to save vegetable', error);
      alert(error.message || 'Could not save vegetable.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">{vegetable ? 'Edit Vegetable' : 'Add New Vegetable'}</h2>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {/* Image & Availability */}
              <div className="flex items-center space-x-4">
                  {imagePreview && <img src={imagePreview} alt="preview" className="w-20 h-20 rounded-lg object-cover" loading="lazy" />}
                  <div className="flex-grow">
                    <label className="block text-sm font-medium text-gray-700">Image</label>
                    <input type="file" name="image" onChange={handleImageChange} accept="image/*" className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"/>
                  </div>
                   <div className="flex items-center space-x-2">
                        <input type="checkbox" name="isAvailable" id="isAvailable" checked={formData.isAvailable} onChange={handleChange} className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                        <label htmlFor="isAvailable" className="font-medium text-gray-700">Available Today</label>
                    </div>
              </div>
              {/* Names */}
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name (English)</label>
                    <input type="text" name="name.EN" value={formData.name[Language.EN]} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name (Hindi)</label>
                    <input type="text" name="name.HI" value={formData.name[Language.HI]} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
                  </div>
              </div>
              {/* Units */}
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Unit (English)</label>
                    <input type="text" name="unit.EN" value={formData.unit[Language.EN]} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Unit (Hindi)</label>
                    <input type="text" name="unit.HI" value={formData.unit[Language.HI]} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
                  </div>
              </div>
              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Market Price (₹)</label>
                  <input type="number" step="0.01" name="marketPrice" value={formData.marketPrice} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">SabziMate Price (₹)</label>
                  <input type="number" step="0.01" name="sabzimatePrice" value={formData.sabzimatePrice} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
                </div>
              </div>
              {/* Discount Calculator */}
              <div className="bg-gray-50 p-3 rounded-md grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-medium text-gray-700">Discount (%)</label>
                      <input type="number" step="0.1" value={discountPercent} onChange={handleDiscountPercentChange} placeholder="e.g. 15" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"/>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700">Discount (₹)</label>
                      <input type="number" step="0.01" value={discountAmount} onChange={handleDiscountAmountChange} placeholder="e.g. 5" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"/>
                  </div>
              </div>
              {/* Details */}
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Offer Tag (Optional)</label>
                    <input type="text" name="offerTag" value={formData.offerTag} onChange={handleChange} placeholder="+100g Free" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select name="category" value={formData.category} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm">
                        <option value="ROOT">Root</option>
                        <option value="LEAFY">Leafy</option>
                        <option value="FRUIT">Fruit</option>
                        <option value="OTHER">Other</option>
                    </select>
                  </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                <textarea name="description" rows={3} value={formData.description} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
            <button type="button" onClick={onClose} disabled={isSaving} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
            <button type="submit" disabled={isSaving} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400">
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VegetableEditModal;