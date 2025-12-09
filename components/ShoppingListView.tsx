
import React, { useState } from 'react';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { MicOnIcon } from './icons/MicIcons';
import { LocationIcon } from './icons/LocationIcon';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { estimateGroceryPrices } from '../services/geminiService';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface ShoppingListViewProps {
  list: string[];
  onClear: () => void;
  onAddItem: (items: string | string[]) => void;
}

interface PriceData {
  currency: string;
  estimatedTotal: number;
  itemPrices: Record<string, number>;
}

const ShoppingListView: React.FC<ShoppingListViewProps> = ({ list, onClear, onAddItem }) => {
    const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
    const [newItem, setNewItem] = useState('');
    
    // Price Calculation State
    const [country, setCountry] = useState('');
    const [pinCode, setPinCode] = useState('');
    const [isCalculating, setIsCalculating] = useState(false);
    const [priceData, setPriceData] = useState<PriceData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [locationInputType, setLocationInputType] = useState<'manual' | 'gps'>('manual');

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

    const handleDetectLocation = () => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser.");
            return;
        }
        setIsCalculating(true); // Re-use spinner for location detection
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // We set a formatted string to use for the API call
                setCountry(`Lat: ${latitude.toFixed(4)}, Long: ${longitude.toFixed(4)}`);
                setPinCode("Detected via GPS");
                setLocationInputType('gps');
                setIsCalculating(false);
                setError(null);
            },
            (err) => {
                console.error(err);
                setError("Unable to retrieve your location.");
                setIsCalculating(false);
            }
        );
    };

    const handleCalculatePrices = async () => {
        if (list.length === 0) {
            setError("Add items to your list first.");
            return;
        }

        let locationString = "";
        if (locationInputType === 'gps') {
             locationString = country; // Contains lat/long string
        } else {
            if (!country.trim()) {
                setError("Please enter a country or detect your location.");
                return;
            }
            locationString = `${pinCode}, ${country}`;
        }

        setIsCalculating(true);
        setError(null);
        try {
            const result = await estimateGroceryPrices(list, locationString);
            
            // Transform array to record for easier lookup
            const pricesMap: Record<string, number> = {};
            result.itemPrices.forEach(p => {
                // Simple normalization to match, though imperfect for complex names
                pricesMap[p.name.toLowerCase()] = p.price; 
                // Also map loosely by index if names don't match perfectly due to AI reformatting
            });

            // If the AI returned cleaned names, we might need a better matching strategy. 
            // For now, let's also store by index assuming order is preserved or use the names returned by AI.
            // A more robust way is to just display the AI's returned list if we want perfect matching, 
            // but we want to keep the user's checklist UI. 
            // Let's rely on loose text matching.
            
            // Fallback: If map is empty or keys don't match user items, try to match by order if lengths match
            if (Object.keys(pricesMap).length === 0 && result.itemPrices.length === list.length) {
                list.forEach((item, index) => {
                    pricesMap[item.toLowerCase()] = result.itemPrices[index].price;
                });
            } else {
                // Try fuzzy match or exact match on user items
                list.forEach(userItem => {
                   const match = result.itemPrices.find(p => p.name.toLowerCase().includes(userItem.toLowerCase()) || userItem.toLowerCase().includes(p.name.toLowerCase()));
                   if (match) {
                       pricesMap[userItem.toLowerCase()] = match.price;
                   }
                });
            }

            setPriceData({
                currency: result.currency,
                estimatedTotal: result.estimatedTotal,
                itemPrices: pricesMap
            });
        } catch (err) {
            console.error("Price estimation failed:", err);
            setError("Failed to estimate prices. Please try again.");
        } finally {
            setIsCalculating(false);
        }
    };

    const handleResetLocation = () => {
        setCountry('');
        setPinCode('');
        setLocationInputType('manual');
        setPriceData(null);
        setError(null);
    }

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

        {/* Location & Pricing Section */}
        <div className="mb-8 bg-gray-900/50 p-4 rounded-xl border border-gray-700">
            <div className="flex items-center gap-2 mb-4 text-purple-300 font-semibold">
                <CalculatorIcon className="w-5 h-5" />
                <span>Price Estimator</span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-grow space-y-2">
                    {locationInputType === 'manual' ? (
                        <div className="flex gap-2">
                             <input 
                                type="text" 
                                placeholder="Country" 
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                className="w-1/2 bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                            <input 
                                type="text" 
                                placeholder="Zip/Postal Code" 
                                value={pinCode}
                                onChange={(e) => setPinCode(e.target.value)}
                                className="w-1/2 bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                        </div>
                    ) : (
                         <div className="bg-gray-800 border border-purple-500/50 rounded-md px-3 py-2 text-purple-200 text-sm flex justify-between items-center">
                            <span>📍 Using Detected Location</span>
                            <button onClick={handleResetLocation} className="text-xs text-gray-400 hover:text-white underline">Change</button>
                         </div>
                    )}
                </div>
                
                <div className="flex gap-2">
                     {locationInputType === 'manual' && (
                        <button 
                            onClick={handleDetectLocation}
                            className="p-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors"
                            title="Detect Location"
                        >
                            <LocationIcon className="w-5 h-5" />
                        </button>
                     )}
                     <button 
                        onClick={handleCalculatePrices}
                        disabled={isCalculating}
                        className="flex-grow sm:flex-grow-0 px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-md hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                     >
                        {isCalculating ? <SpinnerIcon className="w-5 h-5" /> : "Calculate Costs"}
                     </button>
                </div>
            </div>
            
            {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
            
            {priceData && (
                 <div className="flex justify-between items-center bg-purple-900/20 p-3 rounded-lg border border-purple-500/30">
                    <span className="text-gray-300 text-sm">Estimated Total:</span>
                    <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                        {priceData.estimatedTotal} {priceData.currency}
                    </span>
                 </div>
            )}
        </div>

        {/* Input Form */}
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

        {/* List Items */}
        {list.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Your shopping list is empty. Find a recipe and add missing ingredients!</p>
        ) : (
            <ul className="space-y-3">
                {list.map((item, index) => {
                    const price = priceData?.itemPrices[item.toLowerCase()];
                    return (
                        <li key={index} className="flex items-center justify-between bg-gray-900 p-3 rounded-lg group">
                            <div className="flex items-center">
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
                            </div>
                            
                            {price !== undefined && (
                                <span className="text-sm font-mono text-emerald-400 bg-emerald-900/20 px-2 py-1 rounded">
                                    {price} {priceData?.currency}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ul>
        )}
        
        {priceData && (
            <p className="text-center text-xs text-gray-500 mt-6">
                * Prices are estimates based on average market rates in your location. Actual prices may vary.
            </p>
        )}
    </div>
  );
};

export default ShoppingListView;
