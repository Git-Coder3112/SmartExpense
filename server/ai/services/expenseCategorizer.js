import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import * as natural from 'natural';

// Disable deprecation warnings
tf.disableDeprecationWarnings();

// Common expense categories
const EXPENSE_CATEGORIES = [
  'Food & Dining', 'Shopping', 'Transportation', 'Bills & Utilities',
  'Entertainment', 'Travel', 'Health & Medical', 'Education',
  'Groceries', 'Gifts & Donations', 'Personal Care', 'Home', 'Other'
];

// Training data for keyword-based fallback
const KEYWORD_CATEGORIES = {
  'Food & Dining': ['lunch', 'dinner', 'coffee', 'restaurant', 'cafe', 'fast food', 'pizza', 'burger', 'sushi'],
  'Shopping': ['amazon', 'purchase', 'clothing', 'electronics', 'online', 'store', 'shop', 'mall'],
  'Transportation': ['uber', 'lyft', 'gas', 'taxi', 'public transport', 'parking', 'transit', 'subway', 'bus'],
  'Bills & Utilities': ['bill', 'internet', 'phone', 'subscription', 'rent', 'electricity', 'water', 'utility'],
  'Entertainment': ['movie', 'concert', 'game', 'sports', 'theater', 'netflix', 'spotify', 'hulu'],
  'Travel': ['hotel', 'flight', 'vacation', 'airbnb', 'trip', 'airline', 'resort', 'booking'],
  'Health & Medical': ['doctor', 'pharmacy', 'hospital', 'medical', 'dental', 'clinic', 'physician'],
  'Education': ['course', 'university', 'book', 'learning', 'certification', 'school', 'tuition', 'workshop'],
  'Groceries': ['supermarket', 'grocery', 'walmart', 'costco', 'market', 'aldi', 'trader joe', 'whole foods'],
  'Gifts & Donations': ['gift', 'donation', 'charity', 'present', 'donate', 'ngo', 'nonprofit'],
  'Personal Care': ['haircut', 'spa', 'gym', 'beauty', 'salon', 'massage', 'barber', 'nails'],
  'Home': ['furniture', 'home depot', 'repair', 'appliance', 'garden', 'ikea', 'hardware', 'maintenance']
};

// Simple in-memory cache
const CACHE_SIZE = 1000;
const categoryCache = new Map();

class ExpenseCategorizer {
  constructor() {
    this.model = null;
    this.encoder = null;
    this.isInitialized = false;
    this.MIN_AI_CONFIDENCE = 0.6; // Minimum confidence to use AI prediction
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Load the Universal Sentence Encoder
      this.encoder = await use.load();
      console.log('AI model initialized with Universal Sentence Encoder');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize AI model, falling back to keyword-based categorization:', error);
      this.isInitialized = true; // Still mark as initialized to use keyword fallback
    }
  }

  // Get keyword-based category suggestions
  getKeywordSuggestions(description) {
    const lowerDesc = description.toLowerCase();
    const suggestions = [];
    
    for (const [category, keywords] of Object.entries(KEYWORD_CATEGORIES)) {
      const matchingKeywords = keywords.filter(keyword => lowerDesc.includes(keyword));
      if (matchingKeywords.length > 0) {
        // Calculate confidence based on number of matching keywords
        const confidence = Math.min(0.7 + (matchingKeywords.length * 0.05), 0.95);
        suggestions.push({
          category,
          confidence,
          matchedKeywords: matchingKeywords,
          source: 'keyword'
        });
      }
    }
    
    // Sort by confidence (highest first)
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }
  
  // AI-based categorization using Universal Sentence Encoder
  async aiCategorize(description) {
    if (!this.encoder) {
      throw new Error('AI model not initialized');
    }
    
    try {
      // Encode the description
      const embeddings = await this.encoder.embed([description]);
      const embeddingArray = await embeddings.array();
      
      // This is a simplified example - in a real app, you'd have a trained model here
      // For demo purposes, we'll use a simple similarity match
      
      // Calculate similarity with category keywords
      const categoryScores = [];
      const allCategoryKeywords = Object.entries(KEYWORD_CATEGORIES).map(([category, keywords]) => ({
        category,
        keywords: keywords.join(' ')
      }));
      
      // Get embeddings for category keywords
      const keywordTexts = allCategoryKeywords.map(c => c.keywords);
      const keywordEmbeddings = await this.encoder.embed(keywordTexts);
      const keywordEmbeddingArray = await keywordEmbeddings.array();
      
      // Calculate cosine similarity with each category
      for (let i = 0; i < allCategoryKeywords.length; i++) {
        const similarity = this.cosineSimilarity(
          embeddingArray[0],
          keywordEmbeddingArray[i]
        );
        
        categoryScores.push({
          category: allCategoryKeywords[i].category,
          confidence: (similarity + 1) / 2, // Convert from [-1, 1] to [0, 1]
          source: 'ai'
        });
      }
      
      // Sort by confidence (highest first)
      return categoryScores.sort((a, b) => b.confidence - a.confidence);
      
    } catch (error) {
      console.error('AI categorization failed:', error);
      throw error;
    }
  }
  
  // Calculate cosine similarity between two vectors
  cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }

  async categorize(description) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Check cache first
    const cacheKey = description.toLowerCase().trim();
    if (categoryCache.has(cacheKey)) {
      return categoryCache.get(cacheKey);
    }

    try {
      // First try AI-based categorization
      const aiResults = await this.aiCategorize(description);
      const bestAiMatch = aiResults[0];
      
      // Get keyword-based suggestions as fallback
      const keywordSuggestions = this.getKeywordSuggestions(description);
      
      // If AI confidence is high enough, use it as primary
      if (bestAiMatch && bestAiMatch.confidence >= this.MIN_AI_CONFIDENCE) {
        return {
          primary: bestAiMatch,
          suggestions: keywordSuggestions.filter(s => s.category !== bestAiMatch.category).slice(0, 3),
          allSuggestions: [...aiResults, ...keywordSuggestions]
            .reduce((acc, curr) => {
              const existing = acc.find(item => item.category === curr.category);
              if (!existing) acc.push(curr);
              return acc;
            }, [])
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 5) // Max 5 total suggestions
        };
      }
      
      // Otherwise, use the best available suggestion (AI or keyword)
      const allSuggestions = [...aiResults, ...keywordSuggestions]
        .reduce((acc, curr) => {
          const existing = acc.find(item => item.category === curr.category);
          if (!existing || curr.confidence > existing.confidence) {
            if (existing) {
              const index = acc.indexOf(existing);
              acc[index] = curr;
            } else {
              acc.push(curr);
            }
          }
          return acc;
        }, [])
        .sort((a, b) => b.confidence - a.confidence);
      
      const primary = allSuggestions[0] || { category: 'Other', confidence: 0, source: 'fallback' };
      
      const result = {
        primary,
        suggestions: allSuggestions
          .filter(s => s.category !== primary.category)
          .slice(0, 3),
        allSuggestions: allSuggestions.slice(0, 5)
      };

      // Cache the result
      if (categoryCache.size >= CACHE_SIZE) {
        // Remove oldest entry if cache is full
        const firstKey = categoryCache.keys().next().value;
        categoryCache.delete(firstKey);
      }
      categoryCache.set(cacheKey, result);
      return result;
      
    } catch (error) {
      console.error('Error in AI categorization, falling back to keywords:', error);
      // Fall back to keyword-based categorization
      const keywordSuggestions = this.getKeywordSuggestions(description);
      const primary = keywordSuggestions[0] || { category: 'Other', confidence: 0, source: 'fallback' };
      
      return {
        primary,
        suggestions: keywordSuggestions
          .filter(s => s.category !== primary.category)
          .slice(0, 3),
        allSuggestions: keywordSuggestions.slice(0, 5)
      };
    }
  } catch (error) {
    console.error('Error in categorization:', error);
    return { category: 'Other', confidence: 0.3, isAutoCategorized: true };
  }
}

export default new ExpenseCategorizer();
