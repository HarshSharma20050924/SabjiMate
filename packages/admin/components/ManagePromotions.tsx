import React, { useState, useEffect, useCallback } from 'react';
import { Coupon } from '@common/types';
import { getPromotions, createPromotion, updatePromotion } from '@common/api';
import LoadingSpinner from '@common/components/LoadingSpinner';

const ManagePromotions: React.FC = () => {
    const [promotions, setPromotions] = useState<Coupon[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Form state for creating a new promotion
    const [newPromo, setNewPromo] = useState<Partial<Coupon>>({
        code: '',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        isActive: true,
        minOrderValue: 0,
        expiresAt: '',
    });

    const fetchPromotions = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getPromotions();
            setPromotions(data);
        } catch (err) {
            setError('Failed to load promotions.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPromotions();
    }, [fetchPromotions]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const checked = (e.target as HTMLInputElement).checked;

        setNewPromo(prev => ({
            ...prev,
            [name]: isCheckbox ? checked : value,
        }));
    };

    const handleCreatePromotion = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        try {
            const payload: Partial<Coupon> = {
                ...newPromo,
                code: newPromo.code?.toUpperCase(),
                discountValue: Number(newPromo.discountValue),
                minOrderValue: Number(newPromo.minOrderValue) || null,
                expiresAt: newPromo.expiresAt || null,
            };
            await createPromotion(payload);
            setNewPromo({ code: '', discountType: 'PERCENTAGE', discountValue: 10, isActive: true, minOrderValue: 0, expiresAt: '' });
            fetchPromotions();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleActive = async (promo: Coupon) => {
        try {
            await updatePromotion(promo.id, { isActive: !promo.isActive });
            fetchPromotions();
        } catch (err) {
            alert('Failed to update promotion status.');
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Manage Promotions</h2>
                {isLoading ? <LoadingSpinner /> : (
                    <div className="bg-white rounded-lg shadow">
                        <ul className="divide-y divide-gray-200">
                            {promotions.map(promo => (
                                <li key={promo.id} className="p-4 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-lg text-purple-700">{promo.code}</p>
                                        <p className="text-sm text-gray-600">
                                            {promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}% off` : `₹${promo.discountValue} off`}
                                            {promo.minOrderValue ? ` on orders > ₹${promo.minOrderValue}` : ''}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Used: {promo.usageCount} times
                                            {promo.expiresAt ? ` | Expires: ${new Date(promo.expiresAt).toLocaleDateString()}` : ''}
                                        </p>
                                    </div>
                                    <button onClick={() => handleToggleActive(promo)} className={`px-3 py-1 text-sm font-bold rounded-full ${promo.isActive ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                        {promo.isActive ? 'Active' : 'Inactive'}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Create New Coupon</h3>
                <form onSubmit={handleCreatePromotion} className="bg-white p-6 rounded-lg shadow space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Coupon Code</label>
                        <input type="text" name="code" value={newPromo.code} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm uppercase placeholder:normal-case"/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Type</label>
                            <select name="discountType" value={newPromo.discountType} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm">
                                <option value="PERCENTAGE">Percentage</option>
                                <option value="FIXED">Fixed Amount</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Value</label>
                            <input type="number" name="discountValue" value={newPromo.discountValue} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"/>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Min. Order (₹)</label>
                            <input type="number" name="minOrderValue" value={newPromo.minOrderValue} onChange={handleInputChange} placeholder="Optional" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                            <input type="date" name="expiresAt" value={newPromo.expiresAt?.split('T')[0] || ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"/>
                        </div>
                    </div>
                     <div className="flex items-center">
                        <input type="checkbox" name="isActive" checked={newPromo.isActive} onChange={handleInputChange} className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                        <label className="ml-2 block text-sm text-gray-900">Active</label>
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <button type="submit" disabled={isSubmitting} className="w-full bg-purple-600 text-white font-bold py-2 rounded-lg shadow-md hover:bg-purple-700 disabled:bg-gray-400">
                        {isSubmitting ? 'Creating...' : '+ Create Coupon'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ManagePromotions;