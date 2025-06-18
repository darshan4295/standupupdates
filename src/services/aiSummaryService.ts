import { pipeline } from '@xenova/transformers';

class AiSummaryService {
    private summarizer: any; // Adjust type as per actual library
    private modelLoadingPromise: Promise<void> | null = null;

    constructor() {
        this.modelLoadingPromise = this.loadModel();
    }

    private async loadModel(): Promise<void> {
        try {
            console.log('Loading summarization model...');
            this.summarizer = await pipeline('summarization', 'Xenova/distilbart-cnn-6-6');
            console.log('Summarization model loaded successfully.');
        } catch (error) {
            console.error('Error loading summarization model:', error);
            throw error; // Re-throw to be caught by callers or for global error handling
        }
    }

    public async generateSummary(text: string): Promise<string> {
        if (!this.summarizer) {
            if (!this.modelLoadingPromise) {
                // Should not happen if constructor is called, but as a safeguard
                this.modelLoadingPromise = this.loadModel();
            }
            // Wait for the model to finish loading
            await this.modelLoadingPromise;
        }

        if (!this.summarizer) {
            // If summarizer is still not available after attempting to load, throw error
             console.error('Summarization model is not available.');
            throw new Error('Summarization model is not available.');
        }

        try {
            console.log('Generating summary for text...');
            const result = await this.summarizer(text, {
                max_length: 150, // Adjust as needed
                min_length: 40,  // Adjust as needed
                no_repeat_ngram_size: 3,
                early_stopping: true,
                num_beams: 4,    // Adjust as needed
            });
            // Assuming the result is an array and the summary is in the first element's 'summary_text' field
            // This structure can vary based on the model and library version
            if (Array.isArray(result) && result.length > 0 && result[0].summary_text) {
                console.log('Summary generated successfully.');
                return result[0].summary_text;
            } else {
                console.error('Unexpected summary result format:', result);
                throw new Error('Failed to generate summary due to unexpected result format.');
            }
        } catch (error) {
            console.error('Error during summarization:', error);
            // Re-throw the error or return a user-friendly message
            throw error;
        }
    }
}

// Export a singleton instance of the service
export const aiSummaryService = new AiSummaryService();
