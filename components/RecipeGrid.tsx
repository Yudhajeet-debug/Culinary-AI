
import React from 'react';
import { Recipe } from '../types';
import RecipeCard from './RecipeCard';

interface RecipeGridProps {
  recipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
  onAddToShoppingList: (items: string[]) => void;
  onNewSearch: () => void;
  fridgeIngredients: string[];
  shoppingList: string[];
}

const RecipeGrid: React.FC<RecipeGridProps> = ({ recipes, onSelectRecipe, onAddToShoppingList, onNewSearch, fridgeIngredients, shoppingList }) => {
  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
        <h2 className="text-3xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-4 sm:mb-0">
          Your Culinary Suggestions
        </h2>
        <button 
          onClick={onNewSearch}
          className="px-6 py-2 bg-purple-600 text-white font-bold rounded-md hover:bg-purple-500 transition-all duration-200 transform hover:scale-105"
        >
          Scan Fridge Again
        </button>
      </div>

      {recipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {recipes.map((recipe) => (
            <RecipeCard 
              key={recipe.recipeName} 
              recipe={recipe} 
              onSelect={onSelectRecipe} 
              onAddToShoppingList={onAddToShoppingList}
              fridgeIngredients={fridgeIngredients}
              shoppingList={shoppingList}
            />
          ))}
        </div>
      ) : (
         <div className="text-center py-16">
            <p className="text-xl text-gray-400">Couldn't find any recipes. Try a different photo!</p>
         </div>
      )}
    </div>
  );
};

export default RecipeGrid;
