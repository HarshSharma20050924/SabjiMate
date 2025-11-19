// import React, { useMemo } from 'react';
// import { useStore, AppState } from '@client/store';

// interface VirtualGardenProps {
//     harvest: boolean;
// }

// const VirtualGarden: React.FC<VirtualGardenProps> = ({ harvest }) => {
//     const wishlist = useStore((state: AppState) => state.wishlist);
//     const vegetables = useStore((state: AppState) => state.vegetables);

//     const gardenItems = useMemo(() => {
//         return wishlist.map(item => {
//             const vegetable = vegetables.find(v => v.id === item.id);
//             if (!vegetable) return null;
//             return {
//                 id: item.id,
//                 image: vegetable.image,
//                 name: vegetable.name.EN,
//             };
//         }).filter(Boolean);
//     }, [wishlist, vegetables]);

//     if (gardenItems.length === 0) {
//         return (
//             <div className="h-24 bg-gradient-to-b from-sky-100 to-emerald-50 flex items-center justify-center">
//                 <p className="text-sm font-semibold text-gray-500 italic">Your garden awaits! Add veggies to see it grow.</p>
//             </div>
//         );
//     }

//     return (
//         <div className="relative h-24 bg-gradient-to-b from-sky-100 to-emerald-50 overflow-hidden border-b-4 border-yellow-800 border-dashed">
//             <div className="absolute inset-0 flex items-end justify-center px-4 space-x-2">
//                 {gardenItems.map((item, index) => (
//                     <div
//                         key={item!.id}
//                         className="relative"
//                         style={{
//                             animation: `${harvest ? 'harvest-bounce' : 'none'} 1s ${index * 0.05}s ease-in-out`
//                         }}
//                     >
//                         <img
//                             src={item!.image}
//                             alt={item!.name}
//                             className="h-12 w-12 object-contain drop-shadow-lg"
//                             style={{
//                                 animation: `sprout 0.5s ${index * 0.1}s cubic-bezier(0.175, 0.885, 0.32, 1.275) backwards`
//                             }}
//                         />
//                     </div>
//                 ))}
//             </div>
//         </div>
//     );
// };

// export default VirtualGarden;