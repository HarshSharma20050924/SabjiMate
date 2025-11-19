import React, { useState, useMemo, useRef } from 'react';
import { Language, Vegetable } from '../../common/types';
import { translations } from '../../common/constants';
import { calculateItemPrice } from '../../common/utils';
import StarRating from '../../common/components/StarRating';
import CollapsibleSection from '../../common/components/CollapsibleSection';

interface VegetableDetailModalProps {
  vegetable: Vegetable;
  language: Language;
  initialQuantity: string;
  onClose: () => void;
  onQuantityChange: (id: number, quantity: string) => void;
  isLocked?: boolean;
}

const QUANTITY_STEP = 50; // Grams

const parseQuantityToGrams = (quantity: string): number => {
    if (!quantity) return 0;
    const value = parseFloat(quantity);
    if (quantity.toLowerCase().includes('kg')) {
        return value * 1000;
    }
    if (quantity.toLowerCase().includes('g')) {
        return value;
    }
    return 0;
};

const formatGrams = (grams: number): string => {
    if (grams <= 0) return '';
    if (grams < 1000) return `${grams}g`;
    const kg = grams / 1000;
    // Use toFixed to avoid long decimals, then parseFloat to remove trailing zeros
    return `${parseFloat(kg.toFixed(2))}kg`;
};


// Sample data for demonstration purposes, as the API doesn't provide these details yet.
const sampleData = {
    images: [
        'https://images.unsplash.com/photo-1582515072040-3d5f99b0c768?q=80&w=1740&auto=format&fit=crop', // Carrots being washed
        'https://images.unsplash.com/photo-1599295660493-231a31a2a4b3?q=80&w=1740&auto=format&fit=crop', // Sliced carrots
    ],
    videoUrl: 'https://sample-videos.com/video123.mp4', // Placeholder URL
    highlights: [
        { title: 'Origin', content: 'Ujjain, MP' },
        { title: 'Storage', content: 'Refrigerate in a plastic bag for up to 2 weeks.' },
        { title: 'Best For', content: 'Salads, Juices, and Indian Curries' },
    ],
    nutritionalInfo: [
        { name: 'Energy', value: '41 kcal' },
        { name: 'Carbohydrates', value: '9.6g' },
        { name: 'Protein', value: '0.9g' },
        { name: 'Vitamin A', value: '334% DV' },
    ],
    fullDescription: 'Sweet and crunchy, our carrots are sourced locally to ensure maximum freshness. They are a rich source of beta carotene, fiber, vitamin K1, potassium, and antioxidants. Perfect for a healthy snack or as a versatile ingredient in your favorite dishes.',
};

const PlayIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
    </svg>
);

const VegetableDetailModal: React.FC<VegetableDetailModalProps> = ({ vegetable, language, initialQuantity, onClose, onQuantityChange, isLocked = false }) => {
  const t = translations[language];
  const [quantityInGrams, setQuantityInGrams] = useState(parseQuantityToGrams(initialQuantity));
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const galleryItems = useMemo(() => {
    const items = [vegetable.image, ...(vegetable.images || sampleData.images)];
    if (vegetable.videoUrl || sampleData.videoUrl) {
        items.push(items[0]); // Add a duplicate of the first image to represent the video thumbnail
    }
    return items;
  }, [vegetable]);

  const handleUpdate = () => {
    onQuantityChange(vegetable.id, formatGrams(quantityInGrams));
    onClose();
  };

  const handleScroll = () => {
      if (scrollRef.current) {
          const { scrollLeft, clientWidth } = scrollRef.current;
          const index = Math.round(scrollLeft / clientWidth);
          setCurrentIndex(index);
      }
  };
  
  const currentPrice = useMemo(() => {
      return (vegetable.price / 1000) * quantityInGrams;
  }, [quantityInGrams, vegetable.price]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-end z-50 p-0" onClick={onClose}>
      <div className="bg-slate-50 rounded-t-2xl shadow-2xl w-full max-w-md flex flex-col h-[95vh] animate-slide-in-bottom" onClick={(e) => e.stopPropagation()}>
        
        <header className="flex-shrink-0 p-4 flex justify-between items-center absolute top-0 left-0 right-0 z-20">
             <button onClick={onClose} className="bg-black bg-opacity-40 text-white rounded-full p-1.5 shadow-md hover:bg-opacity-60 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
        </header>

        <main className="flex-grow overflow-y-auto pb-28">
            {/* --- Image Gallery --- */}
            <div className="relative">
                <div ref={scrollRef} onScroll={handleScroll} className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide">
                    {galleryItems.map((item, index) => {
                         const isVideoItem = index === galleryItems.length - 1 && (vegetable.videoUrl || sampleData.videoUrl);
                         return (
                            <div key={index} className="w-full h-64 flex-shrink-0 snap-center relative bg-gray-200">
                                <img src={item} alt={`${vegetable.name[language]} view ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
                                {isVideoItem && (
                                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer" onClick={() => alert('Video playback coming soon!')}>
                                        <PlayIcon />
                                    </div>
                                )}
                            </div>
                         )
                    })}
                </div>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-2">
                    {galleryItems.map((_, index) => (
                        <div key={index} className={`w-2 h-2 rounded-full transition-colors ${currentIndex === index ? 'bg-white' : 'bg-white/50'}`} />
                    ))}
                </div>
            </div>

            {/* --- Main Info --- */}
            <div className="p-4 bg-white rounded-t-xl -mt-4 relative z-10 space-y-4">
                <h2 className="text-3xl font-extrabold text-gray-800">{vegetable.name[language]}</h2>
                <div className="flex justify-between items-center">
                    <div className="flex items-baseline space-x-2">
                        <p className="text-green-600 font-bold text-2xl">₹{vegetable.price}</p>
                        <p className="text-gray-500 font-semibold line-through">₹{vegetable.marketPrice}</p>
                        <p className="text-gray-700 font-semibold">/ {vegetable.unit[language]}</p>
                    </div>
                    {vegetable.averageRating && vegetable.ratingCount ? (
                        <StarRating rating={vegetable.averageRating} count={vegetable.ratingCount} size="md" />
                    ) : <div className="h-7" />}
                </div>

                {/* --- New Quantity Stepper --- */}
                <div className="pt-2">
                    <p className="text-sm font-semibold text-gray-600 mb-2">Select Quantity</p>
                    <div className="flex items-center justify-between p-2 bg-gray-100 rounded-lg">
                        <button onClick={() => setQuantityInGrams(q => Math.max(0, q - QUANTITY_STEP))} disabled={isLocked} className="w-10 h-10 bg-gray-200 rounded-full font-bold text-2xl flex items-center justify-center flex-shrink-0 disabled:opacity-50">-</button>
                        <div className="text-center">
                            <span className="font-bold text-2xl text-gray-800 w-24 inline-block">{formatGrams(quantityInGrams) || '0g'}</span>
                            <span className="block text-green-700 font-bold text-lg">≈ ₹{currentPrice.toFixed(2)}</span>
                        </div>
                        <button onClick={() => setQuantityInGrams(q => q + QUANTITY_STEP)} disabled={isLocked} className="w-10 h-10 bg-gray-200 rounded-full font-bold text-2xl flex items-center justify-center flex-shrink-0 disabled:opacity-50">+</button>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-3">
                        {[250, 500, 750, 1000].map(grams => (
                            <button key={grams} onClick={() => setQuantityInGrams(grams)} disabled={isLocked} className={`py-2 text-center font-semibold rounded-lg border-2 transition-all ${quantityInGrams === grams ? 'bg-green-100 border-green-500' : 'bg-white border-gray-200'}`}>
                                {formatGrams(grams)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* --- Collapsible Sections --- */}
            <div className="p-4 space-y-1">
                 <CollapsibleSection title="Highlights" defaultOpen>
                     <ul className="space-y-2">
                        {(vegetable.highlights || sampleData.highlights).map(item => (
                             <li key={item.title} className="flex text-sm">
                                <span className="w-24 flex-shrink-0 font-semibold text-gray-500">{item.title}</span>
                                <span className="text-gray-800">{item.content}</span>
                            </li>
                        ))}
                     </ul>
                </CollapsibleSection>
                <CollapsibleSection title="Product Description">
                    <p className="text-sm leading-relaxed text-gray-700">{vegetable.description || sampleData.fullDescription}</p>
                </CollapsibleSection>
                <CollapsibleSection title="Nutritional Information">
                    <p className="text-xs text-gray-500 mb-2">Approximate values per 100g serving.</p>
                     <ul className="space-y-2">
                        {(vegetable.nutritionalInfo || sampleData.nutritionalInfo).map(item => (
                             <li key={item.name} className="flex justify-between text-sm border-b pb-1">
                                <span className="font-semibold text-gray-500">{item.name}</span>
                                <span className="text-gray-800 font-medium">{item.value}</span>
                            </li>
                        ))}
                     </ul>
                </CollapsibleSection>
            </div>
        </main>
        
        {/* --- Sticky Footer --- */}
        <footer className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t p-4 rounded-t-xl z-20">
          <button onClick={handleUpdate} disabled={isLocked} className="w-full bg-green-600 text-white font-bold py-4 rounded-lg shadow-lg hover:bg-green-700 disabled:bg-gray-400 text-lg">
              {quantityInGrams > 0 ? t.updateOrder : 'Add to List'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default React.memo(VegetableDetailModal);