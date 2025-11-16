
export interface Recipe {
  recipeName: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  prepTime: string;
  calorieCount: number;
  steps: string[];
  missingIngredients: string[];
  imageUrl?: string;
}

export type DietaryFilter = 'Vegetarian' | 'Vegan' | 'Gluten-Free' | 'Keto';
