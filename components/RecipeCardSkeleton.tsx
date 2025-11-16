
import React from 'react';

export const RecipeCardSkeleton: React.FC = () => {
  return (
    <div className="bg-gray-800/50 rounded-lg overflow-hidden shadow-lg shadow-purple-900/20 border border-gray-700 flex flex-col">
        <div className="w-full h-48 bg-gray-700 animate-pulse"></div>
        <div className="p-5 flex flex-col flex-grow">
            <div className="h-6 bg-gray-700 rounded w-3/4 mb-4 animate-pulse"></div>
            
            <div className="flex justify-between mb-4 border-b border-t border-gray-700 py-3">
                <div className="h-4 bg-gray-700 rounded w-1/4 animate-pulse"></div>
                <div className="h-4 bg-gray-700 rounded w-1/4 animate-pulse"></div>
                <div className="h-4 bg-gray-700 rounded w-1/4 animate-pulse"></div>
            </div>

            <div className="mb-4 flex-grow space-y-2">
                <div className="h-4 bg-gray-600 rounded w-1/3 animate-pulse"></div>
                 <div className="h-3 bg-gray-700 rounded w-full animate-pulse"></div>
                 <div className="h-3 bg-gray-700 rounded w-5/6 animate-pulse"></div>
            </div>
            
            <div className="mt-auto">
                <div className="w-full h-10 bg-purple-800/50 rounded-md animate-pulse"></div>
            </div>
        </div>
    </div>
  );
};
