
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Recipe, DietaryFilter } from "../types";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const recipeSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      recipeName: { type: Type.STRING, description: "The name of the recipe." },
      difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'], description: "The difficulty to prepare." },
      prepTime: { type: Type.STRING, description: "Estimated preparation and cooking time, e.g., '45 minutes'." },
      calorieCount: { type: Type.INTEGER, description: "Estimated calories per serving." },
      steps: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Step-by-step cooking instructions."
      },
      missingIngredients: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "A list of essential ingredients for this recipe that are NOT in the provided ingredients list or common pantry staples."
      }
    },
    required: ["recipeName", "difficulty", "prepTime", "calorieCount", "steps", "missingIngredients"],
  },
};

const recipeTypeDefinitionForPrompt = `
  type Recipe = {
    recipeName: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    prepTime: string; // e.g., '45 minutes'
    calorieCount: number;
    steps: string[]; // Step-by-step instructions
    missingIngredients: string[]; // Essential ingredients not in a common pantry
  };
`;


export const analyzeFridge = async (imageBase64: string): Promise<string[]> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
        { text: "Identify all the edible ingredients in this image. Return them as a simple, comma-separated list. Focus only on recognizable food items." }
      ]
    }
  });
  
  const text = response.text;
  return text.split(',').map(item => item.trim().toLowerCase()).filter(Boolean);
};

export const generateRecipes = async (ingredients: string[], filters: DietaryFilter[]): Promise<Recipe[]> => {
  const filterText = filters.length > 0 ? `Please ensure the recipes are suitable for the following diets: ${filters.join(', ')}.` : "";
  const pantryStaples = "salt, pepper, olive oil, vegetable oil, all-purpose flour, granulated sugar, garlic, onions, soy sauce, vinegar, butter, eggs, milk";

  const prompt = `
    Given the following ingredients: ${ingredients.join(', ')}.
    Assume the user also has common pantry staples like ${pantryStaples}.
    Suggest 3 creative and delicious recipes based on the available ingredients.
    ${filterText}
    For each recipe, identify any essential ingredients that are still missing from the combined list of provided ingredients and pantry staples.
    Return the result in the specified JSON format.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: recipeSchema,
    }
  });
  
  const jsonText = response.text;
  try {
    return JSON.parse(jsonText) as Recipe[];
  } catch(e) {
    console.error("Failed to parse recipe JSON:", jsonText);
    return [];
  }
};

export const getIngredientSubstitution = async (ingredient: string, recipe: Recipe, availableIngredients: string[]): Promise<string> => {
    const prompt = `
        I am making the recipe "${recipe.recipeName}". I don't have "${ingredient}".
        What is a good substitute? I have the following ingredients available: ${availableIngredients.join(', ')}.
        Please provide one or two common and suitable alternatives. Keep the answer concise and helpful. Use Markdown to format the suggestions, for example as a list.
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });
    return response.text;
};


export const generateRecipeImage = async (recipeName: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
        parts: [
            {
                text: `A vibrant, professional food photograph of "${recipeName}", appetizing and beautifully lit, on a clean, modern background. Aspect ratio 4:3.`,
            },
        ],
    },
    config: {
        responseModalities: [Modality.IMAGE],
    },
  });
  
  if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
              const { data, mimeType } = part.inlineData;
              return `data:${mimeType};base64,${data}`;
          }
      }
  }

  throw new Error(`No image data returned for recipe: ${recipeName}`);
};

// Helper to add images to recipes sequentially with a delay to avoid rate limits
const addImagesToRecipes = async (recipes: Recipe[]): Promise<Recipe[]> => {
    const recipesWithImages: Recipe[] = [];
    for (const recipe of recipes) {
        try {
            const imageUrl = await generateRecipeImage(recipe.recipeName);
            recipesWithImages.push({ ...recipe, imageUrl });
        } catch (error) {
            console.error(`Failed to generate image for ${recipe.recipeName}:`, error);
            // Fallback image in case of error
            recipesWithImages.push({ ...recipe, imageUrl: `https://picsum.photos/seed/${encodeURIComponent(recipe.recipeName)}/800/600` });
        }
        // Delay to stay within API rate limits, especially for image generation.
        await delay(1200); 
    }
    return recipesWithImages;
}

export const generateRecipesWithImages = async (ingredients: string[], filters: DietaryFilter[]): Promise<Recipe[]> => {
    const recipesData = await generateRecipes(ingredients, filters);
    return addImagesToRecipes(recipesData);
};

// Internal fallback function
const getFeaturedRecipesWithoutSearch = async (count: number = 6, existingRecipes: string[] = []): Promise<Recipe[]> => {
    const recipeThemes = [
        "quick 30-minute meals for busy weeknights",
        "healthy and light vegetarian dishes",
        "classic comfort foods with a modern twist",
        "globally-inspired street food you can make at home",
        "elegant dinner party main courses",
        "one-pan wonders for easy cleanup",
        "seasonal recipes using fresh summer produce",
        "trending viral recipes from social media",
        "hearty and satisfying vegan meals",
        "creative ways to use chicken breast"
    ];
    const theme = recipeThemes[Math.floor(Math.random() * recipeThemes.length)];
    
    const exclusionText = existingRecipes.length > 0 
        ? `Do not suggest any of the following recipes as I have already seen them: ${existingRecipes.join(', ')}.`
        : "";

    const prompt = `
        Suggest ${count} creative and delicious recipes based on the theme: "${theme}".
        The recipes should be globally popular and achievable for a home cook.
        For each recipe, identify any essential ingredients that might be missing from a typical kitchen.
        ${exclusionText}
        Return the result in the specified JSON format.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: recipeSchema,
        }
    });
    const jsonText = response.text;
    try {
        return JSON.parse(jsonText) as Recipe[];
    } catch(e) {
        console.error("Failed to parse fallback featured recipe JSON:", jsonText);
        return [];
    }
}

export const getFeaturedRecipes = async (count: number = 6, existingRecipes: string[] = []): Promise<Recipe[]> => {
    const exclusionText = existingRecipes.length > 0 
        ? `Do not suggest any of the following recipes as I have already seen them: ${existingRecipes.join(', ')}.`
        : "";

    const prompt = `
        Based on current search trends, suggest ${count} creative, popular, and delicious recipes.
        The recipes should be globally popular and achievable for a home cook.
        For each recipe, identify any essential ingredients that might be missing from a typical kitchen.
        ${exclusionText}
        Return ONLY a valid JSON array of objects that conforms to this structure: Recipe[].
        Do not include markdown formatting like \`\`\`json.
        
        The structure for each Recipe object is:
        ${recipeTypeDefinitionForPrompt}
    `;

    let recipesData: Recipe[] = [];

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            }
        });
        const jsonText = response.text;
        const cleanedJsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        recipesData = JSON.parse(cleanedJsonText) as Recipe[];
        if (!recipesData || recipesData.length === 0) throw new Error("Search-grounded response was empty or invalid.");
    } catch(e) {
        console.error("Failed to get/parse featured recipes with search grounding:", e);
        console.log("Falling back to non-search method for featured recipes.");
        recipesData = await getFeaturedRecipesWithoutSearch(count, existingRecipes);
    }
    
    if (!recipesData || recipesData.length === 0) {
        return [];
    }
    
    return addImagesToRecipes(recipesData);
};

export const estimateGroceryPrices = async (items: string[], location: string): Promise<{ currency: string, estimatedTotal: number, itemPrices: { name: string, price: number }[] }> => {
  const prompt = `
    You are a helpful local grocery shopping assistant.
    The user is located in: "${location}".
    Identify the local currency for this location.
    Then, estimate the current average market price for a standard quantity (e.g., 1 pack, 1 kg, 1 liter) of the following items:
    ${items.join(', ')}

    Return the result as a JSON object with the following structure:
    {
      "currency": "ISO Currency Code (e.g. USD, EUR, INR)",
      "itemPrices": [
        { "name": "item name from list", "price": number (cost in local currency) }
      ],
      "estimatedTotal": number (sum of all prices)
    }
    
    Be realistic about pricing for the specified location. If the item name is generic (e.g., "milk"), assume a standard unit (e.g., 1 liter/gallon).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
            currency: { type: Type.STRING },
            estimatedTotal: { type: Type.NUMBER },
            itemPrices: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        price: { type: Type.NUMBER }
                    }
                }
            }
        },
        required: ["currency", "estimatedTotal", "itemPrices"]
      }
    }
  });

  return JSON.parse(response.text);
}
