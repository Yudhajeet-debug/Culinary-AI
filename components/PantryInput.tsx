
import React, { useState } from 'react';
import { XIcon } from './icons/XIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { MicOnIcon } from './icons/MicIcons';

interface PantryInputProps {
  pantryIngredients: string[];
  onAddIngredient: (ingredient: string) => void;
  onRemoveIngredient: (ingredient: string) => void;
  onGenerate: () => void;
  hasFridgeIngredients: boolean;
  onClearAll: () => void;
}

const PantryInput: React.FC<PantryInputProps> = ({ pantryIngredients, onAddIngredient, onRemoveIngredient, onGenerate, hasFridgeIngredients, onClearAll }) => {
  const [inputValue, setInputValue] = useState('');

  const handleVoiceResult = (command: string) => {
    const lowerCaseCommand = command.toLowerCase();
    if (lowerCaseCommand.startsWith('add ')) {
      const items = lowerCaseCommand.replace('add ', '').split(/ and |, /);
      items.forEach(item => {
        if (item.trim()) onAddIngredient(item.trim());
      });
    } else if (lowerCaseCommand.startsWith('remove ')) {
      const item = lowerCaseCommand.replace('remove ', '').trim();
      if (item) onRemoveIngredient(item);
    } else if (lowerCaseCommand === 'clear all' || lowerCaseCommand === 'clear pantry') {
      onClearAll();
    } else {
      setInputValue(command);
    }
  };

  const { isListening, transcript, startListening, stopListening, isSupported } = useVoiceRecognition(handleVoiceResult);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onAddIngredient(inputValue);
      setInputValue('');
    }
  };
  
  const showGenerateButton = pantryIngredients.length > 0 && !hasFridgeIngredients;

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 p-6 bg-gray-800/50 border border-gray-700 rounded-xl">
      <h3 className="text-xl font-orbitron font-bold text-center text-gray-300 mb-4">...Or Add from Your Pantry</h3>
      <form onSubmit={handleAdd} className="flex gap-2 mb-4 relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={isListening ? "Listening..." : "e.g., eggs, flour, milk"}
          className="flex-grow bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-500 transition-colors">
          Add
        </button>
        {isSupported && (
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`p-2 rounded-full transition-colors duration-200 ${isListening ? 'bg-red-500/20' : 'bg-gray-700 hover:bg-gray-600'}`}
              aria-label="Use voice input"
            >
              <MicOnIcon className={`w-6 h-6 ${isListening ? 'text-red-400 animate-pulse-mic' : 'text-white'}`} />
            </button>
        )}
        {isListening && transcript && (
            <div className="absolute -bottom-6 left-0 text-sm text-gray-400 italic">{transcript}...</div>
        )}
      </form>
      
      {pantryIngredients.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-400">Your ingredients:</p>
          <div className="flex flex-wrap gap-2">
            {pantryIngredients.map(ing => (
              <span key={ing} className="flex items-center bg-gray-700 text-gray-200 text-sm font-medium px-3 py-1 rounded-full capitalize">
                {ing}
                <button onClick={() => onRemoveIngredient(ing)} className="ml-2 text-gray-400 hover:text-white">
                  <XIcon className="w-4 h-4" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
      
      {showGenerateButton && (
          <div className="text-center mt-6">
              <button
                  onClick={onGenerate}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-md hover:from-purple-500 hover:to-pink-500 transition-all duration-200 transform hover:scale-105 flex items-center gap-2 mx-auto"
              >
                  <SparklesIcon className="w-5 h-5"/>
                  Find Recipes
              </button>
          </div>
      )}
    </div>
  );
};

export default PantryInput;