import React, { useState, useEffect, useCallback } from 'react';
import { DeliveryArea, Vegetable, Language, LocationPrice } from '@common/types';
import { getDeliveryAreas, createDeliveryArea, updateDeliveryArea, getAllVegetablesForAdmin, getLocationPrices, setLocationPrice } from '@common/api';
import LoadingSpinner from '@common/components/LoadingSpinner';
import { indianStatesAndDistricts } from '@common/data/indian-states-districts';

const ManageAreasAndPricing: React.FC = () => {
    const [view, setView] = useState<'areas' | 'pricing'>('areas');

    return (
        <div>
            <div className="flex border-b mb-6">
                <button onClick={() => setView('areas')} className={`flex-1 py-2 text-lg font-semibold ${view === 'areas' ? 'text-green-700 border-b-2 border-green-700' : 'text-gray-500'}`}>
                    Manage Delivery Areas
                </button>
                <button onClick={() => setView('pricing')} className={`flex-1 py-2 text-lg font-semibold ${view === 'pricing' ? 'text-green-700 border-b-2 border-green-700' : 'text-gray-500'}`}>
                    Manage Location Pricing
                </button>
            </div>

            {view === 'areas' ? <ManageAreas /> : <ManagePricing />}
        </div>
    );
};


const ManageAreas: React.FC = () => {
    const [areas, setAreas] = useState<DeliveryArea[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedState, setSelectedState] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const states = Object.keys(indianStatesAndDistricts).sort();
    const districts = selectedState ? indianStatesAndDistricts[selectedState].sort() : [];

    const fetchAreas = useCallback(async () => {
        setIsLoading(true);
        const areasData = await getDeliveryAreas();
        setAreas(areasData);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchAreas();
    }, [fetchAreas]);

    const handleCreateArea = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await createDeliveryArea({ city: selectedCity, state: selectedState });
            setSelectedCity('');
            setSelectedState('');
            fetchAreas();
        } catch(err) {
            console.error("Failed to create area", err);
            alert("Failed to create area. It might already exist.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleToggleActive = async (area: DeliveryArea) => {
        await updateDeliveryArea({ ...area, isActive: !area.isActive });
        fetchAreas();
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Active Delivery Areas</h3>
                {isLoading ? <LoadingSpinner/> : (
                    <div className="bg-white rounded-lg shadow">
                        <ul className="divide-y divide-gray-200">
                            {areas.map(area => (
                                <li key={area.id} className="p-4 flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">{area.city}, {area.state}</p>
                                    </div>
                                    <button onClick={() => handleToggleActive(area)} className={`px-3 py-1 text-sm font-bold rounded-full ${area.isActive ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                        {area.isActive ? 'Active' : 'Inactive'}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            <div>
                 <h3 className="text-xl font-bold text-gray-800 mb-4">Add New Area</h3>
                <form onSubmit={handleCreateArea} className="bg-white p-6 rounded-lg shadow space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">State</label>
                         <select value={selectedState} onChange={e => { setSelectedState(e.target.value); setSelectedCity(''); }} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm">
                            <option value="" disabled>Select a state</option>
                            {states.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">District / City</label>
                        <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} required disabled={!selectedState} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm disabled:bg-gray-100">
                            <option value="" disabled>Select a district</option>
                            {districts.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <button type="submit" disabled={isSubmitting || !selectedCity || !selectedState} className="w-full bg-green-600 text-white font-bold py-2 rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400">
                        {isSubmitting ? 'Adding...' : '+ Add Area'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const ManagePricing: React.FC = () => {
    const [vegetables, setVegetables] = useState<Vegetable[]>([]);
    const [areas, setAreas] = useState<DeliveryArea[]>([]);
    const [prices, setPrices] = useState<Map<string, { marketPrice: number; sabzimatePrice: number }>>(new Map());
    const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [savingStatus, setSavingStatus] = useState<Record<string, boolean>>({});
    const [localPrices, setLocalPrices] = useState<Record<string, { marketPrice: string; sabzimatePrice: string }>>({});

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [vegData, areasData] = await Promise.all([getAllVegetablesForAdmin(), getDeliveryAreas()]);
            const activeAreas = areasData.filter(a => a.isActive);
            setVegetables(vegData);
            setAreas(activeAreas);

            if (activeAreas.length > 0 && !selectedAreaId) {
                setSelectedAreaId(activeAreas[0].id);
            }
            
            const pricePromises = vegData.map(v => getLocationPrices(v.id));
            const allPrices = (await Promise.all(pricePromises)).flat();
            
            const priceMap = new Map<string, { marketPrice: number; sabzimatePrice: number }>();
            allPrices.forEach(p => {
                priceMap.set(`${p.vegetableId}-${p.areaId}`, { marketPrice: p.marketPrice, sabzimatePrice: p.sabzimatePrice });
            });
            setPrices(priceMap);
        } catch (error) {
            console.error("Failed to fetch pricing data", error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedAreaId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (!selectedAreaId) return;

        const newLocalPrices: Record<string, { marketPrice: string; sabzimatePrice: string }> = {};
        vegetables.forEach(veg => {
            const priceKey = `${veg.id}-${selectedAreaId}`;
            const locationPrice = prices.get(priceKey);
            
            newLocalPrices[veg.id] = {
                marketPrice: locationPrice?.marketPrice?.toString() ?? '',
                sabzimatePrice: locationPrice?.sabzimatePrice?.toString() ?? ''
            };
        });
        setLocalPrices(newLocalPrices);
    }, [selectedAreaId, vegetables, prices]);

    const handleLocalPriceChange = (vegId: number, priceType: 'marketPrice' | 'sabzimatePrice', value: string) => {
        setLocalPrices(prev => ({
            ...prev,
            [vegId]: {
                ...prev[vegId],
                [priceType]: value,
            }
        }));
    };

    const handleSave = async (vegId: number) => {
        if (!selectedAreaId) return;
        const veg = vegetables.find(v => v.id === vegId);
        if (!veg) return;

        setSavingStatus(prev => ({ ...prev, [vegId]: true }));

        const marketPriceInput = localPrices[vegId].marketPrice;
        const sabzimatePriceInput = localPrices[veg.id].sabzimatePrice;

        const marketPrice = marketPriceInput === '' ? (veg.marketPrice || 0) : parseFloat(marketPriceInput);
        const sabzimatePrice = sabzimatePriceInput === '' ? (veg.price || 0) : parseFloat(sabzimatePriceInput);

        if (isNaN(marketPrice) || isNaN(sabzimatePrice) || marketPrice < 0 || sabzimatePrice < 0) {
            alert('Please enter valid, non-negative prices.');
            setSavingStatus(prev => ({ ...prev, [vegId]: false }));
            return;
        }

        try {
            const updatedPrice = await setLocationPrice(vegId, selectedAreaId, marketPrice, sabzimatePrice);
            setPrices(prev => new Map(prev.set(`${vegId}-${selectedAreaId}`, {
                marketPrice: updatedPrice.marketPrice,
                sabzimatePrice: updatedPrice.sabzimatePrice,
            })));
        } catch (error) {
            console.error("Failed to save price", error);
            alert("Failed to save price. Please try again.");
        } finally {
            setSavingStatus(prev => ({ ...prev, [vegId]: false }));
        }
    };
    
    const handleReset = (vegId: number) => {
        if (!selectedAreaId) return;
        const veg = vegetables.find(v => v.id === vegId);
        if (veg) {
             setLocalPrices(prev => ({
                ...prev,
                [vegId]: { marketPrice: '', sabzimatePrice: '' }
            }));
            // We save the base prices to effectively reset the override
            setLocationPrice(veg.id, selectedAreaId, veg.marketPrice || 0, veg.price || 0).then(() => {
                const priceKey = `${vegId}-${selectedAreaId}`;
                // We delete the key from our local price map so it falls back to the base price placeholder
                setPrices(prev => {
                    const newPrices = new Map(prev);
                    newPrices.delete(priceKey);
                    return newPrices;
                });
            }).catch(e => alert("Could not reset price."));
        }
    };

    return (
        <div>
            {isLoading ? <LoadingSpinner /> : (
                <>
                    <div className="mb-6 max-w-md">
                        <label htmlFor="area-select" className="block text-sm font-medium text-gray-700">Select an Area to Manage Prices</label>
                        <select
                            id="area-select"
                            value={selectedAreaId || ''}
                            onChange={(e) => setSelectedAreaId(Number(e.target.value))}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                        >
                            {areas.map(area => (
                                <option key={area.id} value={area.id}>{area.city}, {area.state}</option>
                            ))}
                        </select>
                    </div>

                    {selectedAreaId && (
                        <div className="bg-white rounded-lg shadow">
                            <ul className="divide-y divide-gray-200">
                                {vegetables.map(veg => (
                                    <li key={veg.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                        <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                                            <img src={veg.image} alt={veg.name[Language.EN]} className="w-16 h-16 rounded-md object-cover" />
                                            <div>
                                                <p className="font-semibold text-gray-900">{veg.name[Language.EN]}</p>
                                                <p className="text-sm text-gray-500">
                                                    Base Price: <span className="line-through">₹{(veg.marketPrice || 0).toFixed(2)}</span> → ₹{(veg.price || 0).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Market Price</label>
                                                <input
                                                    type="number" step="0.01"
                                                    placeholder={`Base: ${(veg.marketPrice || 0).toFixed(2)}`}
                                                    value={localPrices[veg.id]?.marketPrice || ''}
                                                    onChange={(e) => handleLocalPriceChange(veg.id, 'marketPrice', e.target.value)}
                                                    className="w-full sm:w-28 mt-1 px-2 py-1 border border-gray-300 rounded-md shadow-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">SabziMate Price</label>
                                                <input
                                                    type="number" step="0.01"
                                                    placeholder={`Base: ${(veg.price || 0).toFixed(2)}`}
                                                    value={localPrices[veg.id]?.sabzimatePrice || ''}
                                                    onChange={(e) => handleLocalPriceChange(veg.id, 'sabzimatePrice', e.target.value)}
                                                    className="w-full sm:w-28 mt-1 px-2 py-1 border border-gray-300 rounded-md shadow-sm"
                                                />
                                            </div>
                                            <div className="flex items-end space-x-2">
                                                <button onClick={() => handleReset(veg.id)} className="h-9 px-3 bg-gray-200 text-gray-700 font-semibold rounded-md text-sm hover:bg-gray-300">Reset</button>
                                                <button
                                                    onClick={() => handleSave(veg.id)}
                                                    disabled={savingStatus[veg.id]}
                                                    className="h-9 px-4 bg-blue-600 text-white font-semibold rounded-md text-sm hover:bg-blue-700 disabled:bg-gray-400"
                                                >
                                                    {savingStatus[veg.id] ? 'Saving...' : 'Save'}
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ManageAreasAndPricing;