import { pipeline, env } from '@xenova/transformers';

// Configure Transformers.js to use local models only.
// This must be set before any pipeline is created or model is loaded.
env.allowRemoteModels = false;
// Note: env.localModelPath could also be used, e.g., env.localModelPath = '/models/';
// However, providing the full path in the pipeline() call, like '/models/Xenova/distilbart-cnn-6-6/',
// is generally robust, especially when combined with `allowRemoteModels = false`.
// This path is resolved relative to the server's public root at runtime.

class AiSummaryService {
    private summarizer: any; // Adjust type as per actual library
    private modelLoadingPromise: Promise<void> | null = null;

    constructor() {
        this.modelLoadingPromise = this.loadModel();
    }

    private async loadModel(): Promise<void> {
        // This model is configured to be loaded from a local path: /models/Xenova/distilbart-cnn-6-6/.
        // The local path is relative to the `public` directory at runtime.
        //
        // IMPORTANT:
        // The actual large ONNX model files (`encoder_model_quantized.onnx` and
        // `decoder_model_merged_quantized.onnx`) located in
        // `public/models/Xenova/distilbart-cnn-6-6/onnx/` are placeholders in the repository.
        // These placeholders MUST be replaced with the full downloaded files (approx. 287MB total)
        // from Hugging Face for the summarization feature to work.
        // These .onnx files are intended to be tracked with Git LFS.
        // See README.md for more details on downloading and placing these files.

        console.log('Attempting to load summarization model...');
        try {
            // Specific try-catch for the pipeline call itself
            try {
                // Load model from local path
                this.summarizer = await pipeline('summarization', '/models/Xenova/distilbart-cnn-6-6/');
                console.log('Summarization model loaded successfully from local path.');
            } catch (pipelineError: any) {
                if (pipelineError instanceof SyntaxError &&
                    (pipelineError.message.toLowerCase().includes('json') ||
                     pipelineError.message.toLowerCase().includes('unexpected token') ||
                     pipelineError.message.toLowerCase().includes('<!doctype'))) {
                    const specificMessage = 'Failed to load summarization model: Received an unexpected HTML response or invalid JSON when trying to fetch model data. This might be due to network issues, proxy configurations, or problems at the model source. Please check your network connection and try again.';
                    console.error(specificMessage, pipelineError);
                    throw new Error(specificMessage);
                } else {
                    // For other errors during pipeline execution
                    const genericMessage = 'Failed to load summarization model: An unexpected error occurred during model initialization.';
                    console.error(genericMessage, pipelineError);
                    throw new Error(genericMessage, { cause: pipelineError });
                }
            }
        } catch (error) { // This outer catch will now catch errors re-thrown from the inner catch
            console.error('Unhandled error during model loading process:', error);
            // Re-throw the error caught (which would be one of the new Error instances from inner catch)
            // or a generic one if something else went wrong at the `loadModel` scope.
            // To ensure a consistent error type or message prefix from loadModel failures:
            if (error instanceof Error && error.message.startsWith('Failed to load summarization model:')) {
                throw error; // It's already one of our specific errors
            }
            // Fallback for truly unexpected errors not from pipelineError logic
            const fallbackMessage = 'Failed to load summarization model: An unknown issue occurred.';
            console.error(fallbackMessage, error);
            throw new Error(fallbackMessage, { cause: error });
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

            // Check for unexpected HTML response first
            if (typeof result === 'string' && (result.toLowerCase().startsWith('<!doctype') || result.toLowerCase().startsWith('<html'))) {
                console.error('Unexpected HTML response from model:', result);
                throw new Error('Failed to generate summary: Model returned an unexpected HTML response.');
            }

            // Check for expected array structure
            if (Array.isArray(result) && result.length > 0 && result[0] && typeof result[0].summary_text === 'string') {
                console.log('Summary generated successfully.');
                return result[0].summary_text;
            } else {
                console.error('Unexpected summary result format or missing summary_text:', result);
                throw new Error('Failed to generate summary due to unexpected result format or missing summary_text.');
            }
        } catch (error) {
            console.error('Error during summarization:', error); // This will catch errors from the checks above or from this.summarizer()
            // Re-throw the error or return a user-friendly message
            throw error;
        }
    }
}

// Export a singleton instance of the service
export const aiSummaryService = new AiSummaryService();
