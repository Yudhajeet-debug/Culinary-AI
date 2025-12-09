
import React, { useState, useEffect } from 'react';
import { Recipe } from '../types';
import { getIngredientSubstitution, generateRecipeImage } from '../services/geminiService';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { CheckIcon } from './icons/CheckIcon';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface RecipeCardProps {
  recipe: Recipe;
  onSelect: (recipe: Recipe) => void;
  onAddToShoppingList: (items: string[]) => void;
  fridgeIngredients: string[];
  shoppingList: string[];
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onSelect, onAddToShoppingList, fridgeIngredients, shoppingList }) => {
  const { recipeName, difficulty, prepTime, calorieCount, missingIngredients } = recipe;
  const [substitutions, setSubstitutions] = useState<Record<string, string>>({});
  const [loadingSub, setLoadingSub] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState(recipe.imageUrl);
  const [isImageLoading, setIsImageLoading] = useState(!recipe.imageUrl);

  useEffect(() => {
    let isMounted = true;
    if (!recipe.imageUrl) {
      setIsImageLoading(true);
      generateRecipeImage(recipe.recipeName)
        .then(url => {
          if (isMounted) {
            setCurrentImageUrl(url);
          }
        })
        .catch(err => {
          console.error(`Failed to load recipe image for ${recipe.recipeName}:`, err);
          if (isMounted) {
             setCurrentImageUrl(`https://picsum.photos/seed/${encodeURIComponent(recipe.recipeName)}/800/600`);
          }
        })
        .finally(() => {
            if(isMounted) setIsImageLoading(false);
        });
    }
    return () => { isMounted = false; };
  }, [recipe.imageUrl, recipe.recipeName]);

  const handleSuggestSubstitute = async (ingredient: string) => {
    setLoadingSub(ingredient);
    try {
        const suggestion = await getIngredientSubstitution(ingredient, recipe, fridgeIngredients);
        setSubstitutions(prev => ({ ...prev, [ingredient]: suggestion }));
    } catch (error) {
        console.error("Failed to get substitution:", error);
        setSubstitutions(prev => ({ ...prev, [ingredient]: "Could not get a suggestion." }));
    } finally {
        setLoadingSub(null);
    }
  };

  const isItemInList = (item: string) => {
    return shoppingList.some(listItem => listItem.toLowerCase() === item.toLowerCase());
  };

  const areAllItemsInList = missingIngredients.every(item => isItemInList(item));

  return (
    <div className="bg-gray-800/50 rounded-lg overflow-hidden shadow-lg shadow-purple-900/20 border border-gray-700 transform hover:scale-105 hover:border-purple-500 transition-all duration-300 flex flex-col">
      {isImageLoading ? (
        <div className="w-full h-48 bg-gray-700 animate-pulse"></div>
      ) : (
        <img src={currentImageUrl} alt={recipeName} className="w-full h-48 object-cover" />
      )}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-xl font-bold font-orbitron text-purple-300 mb-2 h-14">{recipeName}</h3>
        
        <div className="flex justify-between text-sm text-gray-400 mb-4 border-b border-t border-gray-700 py-2">
          <span>{difficulty}</span>
          <span>{prepTime}</span>
          <span>~{calorieCount} kcal</span>
        </div>

        {missingIngredients.length > 0 && (
            <div className="mb-4 flex-grow">
                <div className="flex justify-between items-center">
                    <h4 className="text-sm font-semibold text-amber-300">Missing Ingredients:</h4>
                    {areAllItemsInList ? (
                         <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded flex items-center gap-1">
                            <CheckIcon className="w-3 h-3" />
                            Added
                        </span>
                    ) : (
                        <button 
                        onClick={() => onAddToShoppingList(missingIngredients)} 
                        className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded hover:bg-amber-500/40 transition-colors"
                        >
                        Add All to List
                        </button>
                    )}
                </div>
                <ul className="text-sm text-gray-400 capitalize mt-2 space-y-2">
                    {missingIngredients.map(item => {
                        const inList = isItemInList(item);
                        return (
                        <li key={item}>
                            <div className="flex justify-between items-center gap-2">
                                <span>- {item}</span>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => handleSuggestSubstitute(item)}
                                        disabled={!!loadingSub}
                                        className="text-xs text-purple-300 hover:underline disabled:opacity-50 disabled:no-underline"
                                    >
                                        {loadingSub === item ? <SpinnerIcon className="w-3 h-3"/> : 'Substitute'}
                                    </button>
                                    
                                    {inList ? (
                                        <div className="flex items-center justify-center w-5 h-5 bg-green-500/20 rounded-full animate-[bounce_0.5s_ease-in-out]">
                                            <CheckIcon className="w-3 h-3 text-green-400" />
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => onAddToShoppingList([item])}
                                            className="flex items-center justify-center w-5 h-5 text-xs bg-amber-500/20 text-amber-300 rounded-full hover:bg-amber-500/40 transition-colors"
                                            title={`Add ${item} to shopping list`}
                                        >
                                        +
                                        </button>
                                    )}
                                </div>
                            </div>
                            {substitutions[item] && (
                                <div className="text-xs text-purple-200 bg-purple-900/30 p-2 rounded-md mt-1 normal-case prose prose-invert prose-sm max-w-full">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {substitutions[item]}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </li>
                    )})}
                </ul>
            </div>
        )}

        <div className="mt-auto">
            <button
            onClick={() => onSelect(recipe)}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-2 px-4 rounded-md hover:from-purple-500 hover:to-pink-500 transition-all duration-200 transform hover:shadow-lg hover:shadow-purple-500/50"
            >
            Start Cooking
            </button>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;
