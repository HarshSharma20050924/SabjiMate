import React from 'react';
import { Recipe } from '../../common/types';

// A simple loading skeleton
const LoadingSkeleton: React.FC = () => (
    <div className="animate-pulse">
        <div className="h-6 bg-gray-300 rounded-md w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-300 rounded-md w-full mb-2"></div>
        <div className="space-y-3 mt-6">
            <div className="h-5 bg-gray-300 rounded-md w-1/3 mb-2"></div>
            <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
        </div>
        <div className="space-y-3 mt-6">
            <div className="h-5 bg-gray-300 rounded-md w-1/3 mb-2"></div>
            <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
        </div>
    </div>
);

const RecipeIcon: React.FC<{className: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
);

interface RecipeCardProps {
  recipe: Recipe | null;
  isLoading: boolean;
  error: string | null;
  onGetNewRecipe: () => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, isLoading, error, onGetNewRecipe }) => {
    
    const renderContent = () => {
        if (isLoading) {
            return <LoadingSkeleton />;
        }
        if (error) {
            return (
                <div className="text-center">
                    <p className="text-red-600 font-semibold mb-4">{error}</p>
                    <button onClick={onGetNewRecipe} className="bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600">
                        Try Again
                    </button>
                </div>
            );
        }
        if (recipe) {
            return (
                <div>
                    <h3 className="text-2xl font-bold text-green-800">{recipe.recipeName}</h3>
                    <p className="text-gray-600 mt-1 italic">{recipe.description}</p>
                    <div className="mt-4">
                        <h4 className="font-bold text-lg text-gray-800">Ingredients</h4>
                        <ul className="list-disc list-inside mt-2 text-gray-700 space-y-1">
                            {recipe.ingredients.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                    </div>
                    <div className="mt-4">
                        <h4 className="font-bold text-lg text-gray-800">Instructions</h4>
                        <ol className="list-decimal list-inside mt-2 text-gray-700 space-y-2">
                            {recipe.instructions.map((item, index) => <li key={index}>{item}</li>)}
                        </ol>
                    </div>
                </div>
            );
        }
        return null; // Should not happen if logic is correct
    };

    return (
        <div className="bg-lime-50 border-2 border-lime-200 p-6 rounded-lg shadow-md relative">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                    <RecipeIcon className="w-8 h-8 text-lime-700" />
                    <h2 className="text-xl font-bold text-lime-800">Recipe of the Day</h2>
                </div>
                <button onClick={onGetNewRecipe} disabled={isLoading} className="text-sm bg-lime-600 text-white font-semibold py-1 px-3 rounded-full hover:bg-lime-700 disabled:bg-gray-400 transition-colors">
                    New Recipe
                </button>
            </div>
            
            {renderContent()}
        </div>
    );
};

export default RecipeCard;
