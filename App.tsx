
import React, { useState, useCallback, useEffect } from 'react';
import { analyzeFridge, generateRecipesWithImages, getFeaturedRecipes } from './services/geminiService';
import { Recipe, DietaryFilter } from './types';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import RecipeGrid from './components/RecipeGrid';
import CookingModeView from './components/CookingModeView';
import ShoppingListView from './components/ShoppingListView';
import FeaturedRecipes from './components/FeaturedRecipes';
import PantryInput from './components/PantryInput';
import { SpinnerIcon } from './components/icons/SpinnerIcon';

type View = 'upload' | 'recipes' | 'cooking' | 'shopping';

const App: React.FC = () => {
  const [view, setView] = useState<View>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [shoppingList, setShoppingList] = useState<string[]>([]);
  const [fridgeIngredients, setFridgeIngredients] = useState<string[]>([]);
  const [pantryIngredients, setPantryIngredients] = useState<string[]>([]);

  const [featuredRecipes, setFeaturedRecipes] = useState<Recipe[]>([]);
  const [isFeaturedLoading, setIsFeaturedLoading] = useState(true);
  const [isMoreFeaturedLoading, setIsMoreFeaturedLoading] = useState(false);
  const [animation, setAnimation] = useState('animate-fade-in');

  const navigate = (targetView: View) => {
    if (view === targetView) return;

    if (view === 'upload' && targetView === 'shopping') {
        setAnimation('slide-enter-left');
    } else if (view === 'shopping' && targetView === 'upload') {
        setAnimation('slide-enter-right');
    } else {
        setAnimation('animate-fade-in');
    }
    setView(targetView);
  };

  useEffect(() => {
    const fetchFeatured = async () => {
      setIsFeaturedLoading(true);
      try {
        const featured = await getFeaturedRecipes(6);
        setFeaturedRecipes(featured);
      } catch (err) {
        console.error("Failed to fetch featured recipes:", err);
      } finally {
        setIsFeaturedLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (isMoreFeaturedLoading) return;
    setIsMoreFeaturedLoading(true);
    try {
        const existingNames = featuredRecipes.map(r => r.recipeName);
        const moreRecipes = await getFeaturedRecipes(3, existingNames);
        setFeaturedRecipes(prev => [...prev, ...moreRecipes]);
    } catch (err) {
        console.error("Failed to load more featured recipes:", err);
        setError("Could not load more recipes at this time.");
    } finally {
        setIsMoreFeaturedLoading(false);
    }
  }, [featuredRecipes, isMoreFeaturedLoading]);

  const handleRunRecipeGeneration = useCallback(async (ingredients: string[]) => {
    if (ingredients.length === 0) {
        setError("Please add some ingredients first, either by photo or manually.");
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
        setLoadingMessage('Dreaming up delicious recipes...');
        const dietaryFilters: DietaryFilter[] = [];
        const generatedRecipes = await generateRecipesWithImages(ingredients, dietaryFilters);
        setRecipes(generatedRecipes);
        navigate('recipes');
    } catch (err) {
        console.error(err);
        setError('Sorry, I had trouble generating recipes. Please try again.');
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, []);

  const handleImageUpload = useCallback(async (imageBase64: string) => {
    setIsLoading(true);
    setError(null);
    setLoadingMessage('Scanning ingredients...');
    try {
        const ingredientsFromPhoto = await analyzeFridge(imageBase64);
        setFridgeIngredients(ingredientsFromPhoto);
        const allIngredients = [...new Set([...ingredientsFromPhoto, ...pantryIngredients])];
        await handleRunRecipeGeneration(allIngredients);
    } catch (err) {
        console.error(err);
        setError('Sorry, I had trouble analyzing your fridge. Please try another photo.');
        setIsLoading(false);
    }
  }, [pantryIngredients, handleRunRecipeGeneration]);
  
  const handleManualGenerate = useCallback(() => {
    const allIngredients = [...new Set([...fridgeIngredients, ...pantryIngredients])];
    handleRunRecipeGeneration(allIngredients);
  }, [fridgeIngredients, pantryIngredients, handleRunRecipeGeneration]);

  const handleAddPantryIngredient = (ingredient: string) => {
    const formattedIngredient = ingredient.trim().toLowerCase();
    if (formattedIngredient && !pantryIngredients.includes(formattedIngredient)) {
        setPantryIngredients(prev => [...prev, formattedIngredient]);
    }
  };

  const handleRemovePantryIngredient = (ingredientToRemove: string) => {
    setPantryIngredients(prev => prev.filter(ing => ing !== ingredientToRemove));
  };

  const handleClearPantry = () => {
    setPantryIngredients([]);
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    navigate('cooking');
  };

  const handleAddToShoppingList = useCallback((items: string[] | string) => {
    const itemsToAdd = (Array.isArray(items) ? items : [items])
      .map(item => item.trim().toLowerCase())
      .filter(Boolean);

    if (itemsToAdd.length === 0) return;

    setShoppingList(prev => {
        const prevSet = new Set(prev);
        const newItems = itemsToAdd.filter(item => !prevSet.has(item));
        if (newItems.length === 0) return prev;
        return [...prev, ...newItems].sort();
    });
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <SpinnerIcon className="w-24 h-24 text-purple-400" />
          <h2 className="text-2xl font-orbitron mt-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">{loadingMessage}</h2>
          <p className="mt-2 text-gray-400">The Culinary AI is hard at work...</p>
        </div>
      );
    }

    switch (view) {
      case 'upload':
        return (
          <>
            <ImageUploader onImageUpload={handleImageUpload} error={error} />
            <PantryInput
              pantryIngredients={pantryIngredients}
              onAddIngredient={handleAddPantryIngredient}
              onRemoveIngredient={handleRemovePantryIngredient}
              onGenerate={handleManualGenerate}
              hasFridgeIngredients={fridgeIngredients.length > 0}
              onClearAll={handleClearPantry}
            />
            <FeaturedRecipes 
              recipes={featuredRecipes} 
              isLoading={isFeaturedLoading} 
              onSelectRecipe={handleSelectRecipe}
              onAddToShoppingList={handleAddToShoppingList}
              fridgeIngredients={fridgeIngredients}
              onLoadMore={handleLoadMore}
              isMoreLoading={isMoreFeaturedLoading}
              shoppingList={shoppingList}
            />
          </>
        );
      case 'recipes':
        return <RecipeGrid recipes={recipes} onSelectRecipe={handleSelectRecipe} onAddToShoppingList={handleAddToShoppingList} onNewSearch={() => navigate('upload')} fridgeIngredients={[...fridgeIngredients, ...pantryIngredients]} shoppingList={shoppingList} />;
      case 'cooking':
        return selectedRecipe ? <CookingModeView recipe={selectedRecipe} onExit={() => navigate('recipes')} onAddToShoppingList={handleAddToShoppingList} fridgeIngredients={[...fridgeIngredients, ...pantryIngredients]} /> : null;
      case 'shopping':
        return <ShoppingListView list={shoppingList} onClear={() => setShoppingList([])} onAddItem={handleAddToShoppingList} />;
      default:
        return <ImageUploader onImageUpload={handleImageUpload} error={error} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 bg-gradient-to-br from-gray-900 via-indigo-900/30 to-gray-900">
      <Header currentView={view} navigate={navigate} />
      <main className={`container mx-auto px-4 py-8 ${animation}`} key={view}>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
