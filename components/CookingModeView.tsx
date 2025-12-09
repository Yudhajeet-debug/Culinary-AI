import React, { useState, useCallback, useRef } from 'react';
import { Recipe } from '../types';
import { useLiveAssistant, AssistantCallbacks } from '../hooks/useLiveAssistant';
import { getIngredientSubstitution } from '../services/geminiService';
import { MicOnIcon, MicOffIcon } from './icons/MicIcons';
import { SpinnerIcon } from './icons/SpinnerIcon';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface CookingModeViewProps {
  recipe: Recipe;
  onExit: () => void;
  onAddToShoppingList: (item: string) => void;
  fridgeIngredients: string[];
}

const CookingModeView: React.FC<CookingModeViewProps> = ({ recipe, onExit, onAddToShoppingList, fridgeIngredients }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [assistantMessage, setAssistantMessage] = useState<string | null>(null);

  const currentStepRef = useRef(currentStep);
  currentStepRef.current = currentStep;

  const handleStepChange = useCallback((newStepIndex: number) => {
    setCurrentStep(newStepIndex);
  }, []);

  const handleGetSubstitution = useCallback(async (ingredient: string): Promise<string> => {
    try {
        const suggestion = await getIngredientSubstitution(ingredient, recipe, fridgeIngredients);
        setAssistantMessage(`**Substitution for ${ingredient}:**\n${suggestion}`);
        setTimeout(() => setAssistantMessage(null), 8000); // Message disappears after 8 seconds
        return suggestion;
    } catch (error) {
        const errorMessage = "Sorry, I couldn't find a substitution for that.";
        setAssistantMessage(errorMessage);
        setTimeout(() => setAssistantMessage(null), 8000);
        return errorMessage;
    }
  }, [recipe, fridgeIngredients]);
  
  const callbacks: AssistantCallbacks = {
      onStepChange: handleStepChange,
      onGetSubstitution: handleGetSubstitution,
      onAddToShoppingList: onAddToShoppingList,
      getCurrentStep: () => currentStepRef.current,
  };

  const { isSessionActive, isMuted, userTranscription, assistantTranscription, isAssistantSpeaking, isProcessingCommand, startSession, endSession, toggleMute } = useLiveAssistant(recipe, callbacks);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 bg-gray-800/50 border border-gray-700 rounded-2xl shadow-2xl shadow-purple-900/20">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-3xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
            {recipe.recipeName}
          </h2>
          <p className="text-gray-400">Interactive Cooking Mode</p>
        </div>
        <button onClick={onExit} className="px-4 py-2 bg-gray-700 text-white font-semibold rounded-md hover:bg-gray-600 transition-colors">
          Exit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-900 p-6 rounded-lg">
          <h3 className="font-bold text-xl mb-4 text-purple-300">Recipe Steps</h3>
          <ul className="space-y-3 h-96 overflow-y-auto pr-2">
            {recipe.steps.map((step, index) => (
              <li key={index} className={`p-3 rounded-md transition-all duration-300 ${index === currentStep ? 'bg-purple-900/50 ring-2 ring-purple-500' : ''}`}>
                <p className="text-gray-300 leading-relaxed">
                  <span className="font-bold text-purple-400 mr-2">{index + 1}.</span> {step}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col items-center justify-center bg-gray-900 p-6 rounded-lg text-center">
          {!isSessionActive ? (
            <>
              <h3 className="font-bold text-xl mb-4 text-purple-300">Ready to Cook?</h3>
              <p className="text-gray-400 mb-6">Press the button below to start your AI culinary assistant.</p>
              <button onClick={startSession} className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-full text-lg hover:from-purple-500 hover:to-pink-500 transition-all duration-200 transform hover:scale-105 shadow-lg shadow-purple-500/30">
                Start Assistant
              </button>
            </>
          ) : (
            <div className="w-full h-full flex flex-col justify-between">
                <div className="flex-grow flex flex-col justify-center items-center space-y-4">
                    {/* Icon with status indicators */}
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        {isAssistantSpeaking && <SpinnerIcon className="absolute w-32 h-32 text-purple-500 opacity-50"/>}
                        
                        {isProcessingCommand && !isAssistantSpeaking && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <SpinnerIcon className="w-24 h-24 text-pink-500"/>
                            </div>
                        )}
                        
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${isAssistantSpeaking ? 'bg-purple-500 shadow-lg shadow-purple-500/50' : 'bg-gray-700'}`}>
                            <MicOnIcon className="w-12 h-12 text-white" />
                        </div>
                    </div>
                    
                    {/* Transcription Display */}
                    <div className="w-full max-w-sm text-center space-y-2">
                        <div className="min-h-[5rem] bg-gray-800/50 p-3 rounded-lg flex items-center justify-center transition-all duration-300 border border-gray-700">
                             <div className="prose prose-invert prose-sm text-purple-200 text-left w-full">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {isProcessingCommand ? "Thinking..." : (assistantTranscription || assistantMessage || "I'm listening...")}
                                </ReactMarkdown>
                            </div>
                        </div>

                        <div className="min-h-[2.5rem] bg-gray-900/50 p-2 rounded-lg flex items-center justify-center">
                            <div className="prose prose-invert prose-sm text-gray-400 italic text-left w-full">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {userTranscription || "..."}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                </div>

              <div className="flex items-center justify-center gap-4 pt-4">
                <button onClick={toggleMute} className={`p-3 rounded-full transition-colors ${isMuted ? 'bg-yellow-500' : 'bg-gray-600 hover:bg-gray-500'}`}>
                    {isMuted ? <MicOffIcon className="w-6 h-6 text-white"/> : <MicOnIcon className="w-6 h-6 text-white"/>}
                </button>
                <button onClick={endSession} className="px-6 py-3 bg-red-600 text-white font-bold rounded-full hover:bg-red-500 transition-colors">
                  End Session
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CookingModeView;