import React, { useState, useEffect, useCallback } from 'react';
import { Vegetable, Language } from '@common/types';
import { getAllVegetablesForAdmin, deleteVegetable } from '@common/api';
import LoadingSpinner from '@common/components/LoadingSpinner';
import VegetableEditModal from './VegetableEditModal';

const RefreshIcon: React.FC<{className: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
    </svg>
);

const ManageVegetables: React.FC = () => {
  const [vegetables, setVegetables] = useState<Vegetable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVegetable, setEditingVegetable] = useState<Vegetable | null>(null);

  const fetchVeggies = useCallback(async () => {
    try {
      setIsLoading(true);
      const veggiesData = await getAllVegetablesForAdmin();
      setVegetables(veggiesData);
    } catch (error) {
      console.error("Failed to fetch vegetables:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVeggies();
  }, [fetchVeggies]);

  const handleAddNew = () => {
    setEditingVegetable(null);
    setIsModalOpen(true);
  };

  const handleEdit = (veg: Vegetable) => {
    setEditingVegetable(veg);
    setIsModalOpen(true);
  };

  const handleDelete = async (vegId: number) => {
    if (window.confirm("Are you sure you want to delete this vegetable?")) {
      try {
        await deleteVegetable(vegId);
        fetchVeggies(); // Refresh list after deleting
      } catch (error) {
        console.error("Failed to delete vegetable:", error);
        alert("Could not delete vegetable.");
      }
    }
  };
  
  const handleModalSave = () => {
    setIsModalOpen(false);
    fetchVeggies(); // Refresh list after saving
  }

  return (
    <div>
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold text-gray-800">Vegetable List</h2>
              <button onClick={fetchVeggies} disabled={isLoading} className="text-blue-600 hover:text-blue-800 disabled:text-gray-400">
                  <RefreshIcon className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <button
                onClick={handleAddNew}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
                + Add New
            </button>
        </div>
        {isLoading ? <LoadingSpinner /> : (
            <div className="bg-white rounded-lg shadow">
                <ul className="divide-y divide-gray-200">
                    {vegetables.map(veg => (
                        <li key={veg.id} className={`p-4 flex justify-between items-center transition-opacity ${!veg.isAvailable ? 'opacity-60 bg-gray-50' : ''}`}>
                            <div className="flex items-center space-x-4">
                                <img src={veg.image} alt={veg.name[Language.EN]} className="w-16 h-16 rounded-md object-cover" loading="lazy"/>
                                <div>
                                    <p className="font-semibold text-gray-900">{veg.name[Language.EN]} / {veg.name[Language.HI]}</p>
                                    <p className="text-sm text-gray-600">
                                        Market: <span className="line-through">₹{veg.marketPrice}</span> | SabziMate: <span className="font-bold text-green-600">₹{veg.price}</span>
                                    </p>
                                     <p className={`text-xs font-bold mt-1 px-2 py-0.5 rounded-full inline-block ${veg.isAvailable ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                                        {veg.isAvailable ? 'Available Today' : 'Not Available'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex space-x-2">
                                <button onClick={() => handleEdit(veg)} className="text-blue-600 hover:text-blue-800 font-semibold">Edit</button>
                                <button onClick={() => handleDelete(veg.id)} className="text-red-600 hover:text-red-800 font-semibold">Delete</button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        )}
        {isModalOpen && (
            <VegetableEditModal
                vegetable={editingVegetable}
                onClose={() => setIsModalOpen(false)}
                onSave={handleModalSave}
            />
        )}
    </div>
  );
};

export default ManageVegetables;