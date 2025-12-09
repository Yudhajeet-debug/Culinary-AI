import React from 'react';
import { FridgeIcon } from './icons/FridgeIcon';
import { RecipeIcon } from './icons/RecipeIcon';
import { ShoppingIcon } from './icons/ShoppingIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface HeaderProps {
  currentView: string;
  navigate: (view: 'upload' | 'recipes' | 'cooking' | 'shopping') => void;
}

const Header: React.FC<HeaderProps> = ({ navigate }) => {
  return (
    <header className="bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50 shadow-lg shadow-purple-500/10">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('upload')}>
          <SparklesIcon className="w-8 h-8 text-purple-400" />
          <h1 className="text-2xl font-bold font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
            Culinary AI
          </h1>
        </div>
        <nav className="flex items-center gap-4">
            <button onClick={() => navigate('upload')} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-200 p-2 rounded-md hover:bg-white/10">
                <FridgeIcon className="w-5 h-5" />
                <span className="hidden sm:inline">My Fridge</span>
            </button>
            <button onClick={() => navigate('shopping')} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-200 p-2 rounded-md hover:bg-white/10">
                <ShoppingIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Shopping List</span>
            </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
