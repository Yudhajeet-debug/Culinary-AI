
import React, { useState } from 'react';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { MicOnIcon } from './icons/MicIcons';

interface ShoppingListViewProps {
  list: string[];
  onClear: () => void;
  onAddItem: (items: string | string[]) => void;
}

const ShoppingListView: React.FC<ShoppingListViewProps> = ({ list, onClear, onAddItem }) => {
    const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
    const [newItem, setNewItem] = useState('');

    const handleVoiceResult = (command: string) => {
        const lowerCaseCommand = command.toLowerCase();
        if (lowerCaseCommand.startsWith('add ')) {
            const items = lowerCaseCommand.replace('add ', '').split(/ and |, /).map(i => i.trim()).filter(Boolean);
            if (items.length > 0) {
                onAddItem(items);
            }
        } else if (lowerCaseCommand === 'clear list' || lowerCaseCommand === 'clear all') {
            onClear();
        } else {
            setNewItem(command);
        }
    };

    const { isListening, transcript, startListening, stopListening, isSupported } = useVoiceRecognition(handleVoiceResult);

    const handleToggle = (item: string) => {
        setCheckedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(item)) {
                newSet.delete(item);
            } else {
                newSet.add(item);
            }
            return newSet;
        });
    };

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (newItem.trim()) {
            onAddItem(newItem);
            setNewItem('');
        }
    };

  return (
    <div className="max-w-2xl mx-auto p-8 bg-gray-800/50 border border-gray-700 rounded-2xl shadow-2xl shadow-purple-900/20">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                Shopping List
            </h2>
            {list.length > 0 && (
                <button onClick={onClear} className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-md hover:bg-red-500 transition-colors">
                Clear All
                </button>
            )}
        </div>

        <div className="mb-6 relative">
            <form onSubmit={handleAddItem} className="flex gap-2">
                <input 
                    type="text"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder={isListening ? "Listening..." : "Add new item..."}
                    className="flex-grow bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button type="submit" className="px-4 py-2 bg-purple-600 text-white font-bold rounded-md hover:bg-purple-500 transition-colors">
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
            </form>
            {isListening && transcript && (
                <div className="absolute -bottom-6 left-0 text-sm text-gray-400 italic">{transcript}...</div>
            )}
        </div>

        {list.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Your shopping list is empty. Find a recipe and add missing ingredients!</p>
        ) : (
            <ul className="space-y-3">
                {list.map((item, index) => (
                    <li key={index} className="flex items-center bg-gray-900 p-3 rounded-lg">
                        <input
                            type="checkbox"
                            id={`item-${index}`}
                            checked={checkedItems.has(item)}
                            onChange={() => handleToggle(item)}
                            className="h-5 w-5 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-600"
                        />
                        <label 
                            htmlFor={`item-${index}`}
                            className={`ml-3 text-lg capitalize transition-colors ${checkedItems.has(item) ? 'text-gray-500 line-through' : 'text-gray-200'}`}
                        >
                            {item}
                        </label>
                    </li>
                ))}
            </ul>
        )}
    </div>
  );
};

export default ShoppingListView;