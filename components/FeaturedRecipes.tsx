
import React from 'react';
import { Recipe } from '../types';
import RecipeCard from './RecipeCard';
import { RecipeCardSkeleton } from './RecipeCardSkeleton';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface FeaturedRecipesProps {
  recipes: Recipe[];
  isLoading: boolean;
  onSelectRecipe: (recipe: Recipe) => void;
  onAddToShoppingList: (items: string[]) => void;
  fridgeIngredients: string[];
  onLoadMore: () => void;
  isMoreLoading: boolean;
  shoppingList: string[];
}

const FeaturedRecipes: React.FC<FeaturedRecipesProps> = ({ recipes, isLoading, onSelectRecipe, onAddToShoppingList, fridgeIngredients, onLoadMore, isMoreLoading, shoppingList }) => {
  const hasContent = !isLoading && recipes.length > 0;

  return (
    <div className="mt-16">
      <h2 className="text-3xl font-orbitron font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-8">Popular Right Now</h2>
      
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <RecipeCardSkeleton />
            <RecipeCardSkeleton />
            <RecipeCardSkeleton />
        </div>
      )}

      {hasContent && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
            {recipes.map((recipe, index) => (
                <RecipeCard
                    key={`${recipe.recipeName}-${index}`}
                    recipe={recipe}
                    onSelect={onSelectRecipe}
                    onAddToShoppingList={onAddToShoppingList}
                    fridgeIngredients={fridgeIngredients.length > 0 ? fridgeIngredients : ['common pantry staples']}
                    shoppingList={shoppingList}
                />
            ))}
        </div>
      )}

      {hasContent && (
        <div className="text-center mt-12">
            <button
                onClick={onLoadMore}
                disabled={isMoreLoading}
                className="px-8 py-3 bg-purple-700 text-white font-bold rounded-md hover:bg-purple-600 transition-all duration-200 transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
            >
                {isMoreLoading ? (
                    <>
                        <SpinnerIcon className="w-5 h-5 mr-2" />
                        Loading...
                    </>
                ) : (
                    "Show Me More"
                )}
            </button>
        </div>
      )}
    </div>
  );
};

export default FeaturedRecipes;
