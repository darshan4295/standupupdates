// @ts-nocheck We'll add proper types as we build out the tests
import { aiSummaryService } from './aiSummaryService'; // Assuming this is the path
import { pipeline } from '@xenova/transformers';

// Mock the @xenova/transformers library
jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn(),
}));

// Define a type for our mock summarizer to ensure consistency
type MockSummarizer = jest.Mock<Promise<[{ summary_text: string }] | undefined>>;

describe('AiSummaryService', () => {
  let mockSummarizer: MockSummarizer;
  // We need to get the instance of the service as it's exported
  // For testing model loading, we might need to reset modules or use a different approach
  // if the model is loaded immediately upon import.

  beforeEach(() => {
    // Reset mocks before each test
    (pipeline as jest.Mock).mockClear();
    mockSummarizer = jest.fn();
    // Default mock implementation for pipeline to return our mockSummarizer
    // This simulates the model loading successfully and returning a summarizer function
    (pipeline as jest.Mock).mockResolvedValue(mockSummarizer);
  });

   // Test the exported instance
  it('should be an instance of AiSummaryService (testing the exported singleton)', () => {
    expect(aiSummaryService).toBeInstanceOf(Object); // More specific class check might be tricky due to module system
    // Actual class name check is harder with Jest module mocking if not careful.
    // For now, checking if it's an object and has the method is a good start.
    expect(aiSummaryService.generateSummary).toBeDefined();
  });

  describe('generateSummary', () => {
    const testText = 'This is a long text that needs summarization.';
    const mockSummary = 'Summarized text.';

    it('should call the summarization pipeline with the correct text and return the summary', async () => {
      mockSummarizer.mockResolvedValue([{ summary_text: mockSummary }]);

      // The model is loaded in the constructor.
      // To test generateSummary properly, we need to ensure the model loading promise in the service resolves.
      // The `aiSummaryService` instance is created when its module is imported.
      // The constructor calls `loadModel`, which uses the mocked `pipeline`.

      // We need to wait for the model loading to complete if it hasn't already.
      // A simple way is to "flush" any pending promises.
      await Promise.resolve(); // Allow microtasks like the model loading promise to complete.

      const summary = await aiSummaryService.generateSummary(testText);

      expect(pipeline).toHaveBeenCalledWith('summarization', 'Xenova/distilbart-cnn-6-6');
      expect(mockSummarizer).toHaveBeenCalledWith(testText, {
        max_length: 150,
        min_length: 40,
        no_repeat_ngram_size: 3,
        early_stopping: true,
        num_beams: 4,
      });
      expect(summary).toBe(mockSummary);
    });

    it('should handle errors from the summarization pipeline', async () => {
      const errorMessage = 'Summarization failed';
      mockSummarizer.mockRejectedValue(new Error(errorMessage));

      // Allow model loading promise to complete.
      await Promise.resolve();

      await expect(aiSummaryService.generateSummary(testText)).rejects.toThrow(errorMessage);
      expect(pipeline).toHaveBeenCalledWith('summarization', 'Xenova/distilbart-cnn-6-6'); // Ensure it attempted to load
    });

    it('should return a specific message if the summary result format is unexpected', async () => {
      // @ts-ignore
      mockSummarizer.mockResolvedValue([{ wrong_key: 'no summary here' }]); // Simulate unexpected format

      await Promise.resolve();

      await expect(aiSummaryService.generateSummary(testText)).rejects.toThrow('Failed to generate summary due to unexpected result format or missing summary_text.');
    });

    it('should throw an error if the summarizer returns an HTML response', async () => {
      mockSummarizer.mockResolvedValue('<!doctype html><html><body></body></html>' as any); // Cast as any to bypass type checking for test
      await Promise.resolve();
      await expect(aiSummaryService.generateSummary(testText)).rejects.toThrow('Failed to generate summary: Model returned an unexpected HTML response.');

      mockSummarizer.mockResolvedValue('<HTML>content</HTML>' as any);
      await Promise.resolve();
      await expect(aiSummaryService.generateSummary(testText)).rejects.toThrow('Failed to generate summary: Model returned an unexpected HTML response.');
    });

    it('should handle various other unexpected summary result formats', async () => {
      const testCases = [
        null,
        undefined,
        [],
        [null],
        [{}],
        [{ summary_text: null }],
        [{ summary_text: 123 }],
        // @ts-ignore - testing incorrect structure
        { summary_text: 'this is not in an array'},
        // @ts-ignore
        "a plain string not html"
      ];

      for (const testCase of testCases) {
        // @ts-ignore
        mockSummarizer.mockResolvedValue(testCase);
        await Promise.resolve();
        await expect(aiSummaryService.generateSummary(testText))
          .rejects
          .toThrow('Failed to generate summary due to unexpected result format or missing summary_text.');
      }
    });

    it('should throw an error if the summarizer model is not available after load attempt', async () => {
      // Simulate pipeline failing to return a summarizer function (e.g., returns undefined)
      (pipeline as jest.Mock).mockResolvedValue(undefined);

      // To test this, we need a fresh instance or to reset the existing one's state.
      // This is tricky because `aiSummaryService` is a singleton loaded on import.
      // For this specific test, we might need to use jest.resetModules and re-import.

      // This test case is more complex due to the singleton nature and constructor loading.
      // A simple approach for now:
      // Assume that if pipeline returns undefined, this.summarizer remains undefined.
      // We can spy on console.error as well.
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Forcing the summarizer to be null for this test case on the existing instance
      // This is a bit of a hack for a singleton loaded this way.
      const originalSummarizer = aiSummaryService['summarizer'];
      const originalPromise = aiSummaryService['modelLoadingPromise'];
      aiSummaryService['summarizer'] = null;
      aiSummaryService['modelLoadingPromise'] = Promise.resolve(); // Pretend loading finished but yielded no summarizer

      await expect(aiSummaryService.generateSummary(testText)).rejects.toThrow('Summarization model is not available.');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Summarization model is not available.');

      // Restore
      aiSummaryService['summarizer'] = originalSummarizer;
      aiSummaryService['modelLoadingPromise'] = originalPromise;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Model Loading', () => {
    // This test is tricky because the model loads when the module is first imported.
    // We'd need to reset modules to test the loading process from scratch for each test.
    // jest.resetModules() can be used, then re-importing the service.

    // For simplicity, we'll check if pipeline was called (which it should have been on import).
    it('should attempt to load the model when the service is initialized', async () => {
        // The pipeline should have been called once when aiSummaryService was imported
        // and its constructor ran.
        // We need to ensure any async operations from that initial load are settled.
        await Promise.resolve(); // Let microtasks run
        expect(pipeline).toHaveBeenCalledWith('summarization', 'Xenova/distilbart-cnn-6-6');
        expect(pipeline).toHaveBeenCalledTimes(1); // Assuming no other test ran pipeline before this.
    });

    it('should not attempt to load the model again if generateSummary is called multiple times', async () => {
        (pipeline as jest.Mock).mockClear(); // Clear previous calls from module import

        // Re-initialize the mock pipeline for the service's constructor when it's re-imported
        const localMockSummarizer = jest.fn().mockResolvedValue([{ summary_text: 'summary' }]);
        (pipeline as jest.Mock).mockResolvedValue(localMockSummarizer);

        // Use jest.resetModules to get a fresh instance of the service
        jest.resetModules();
        const freshAiSummaryService = (await import('./aiSummaryService')).aiSummaryService;

        // Wait for the fresh instance's model to load
        await new Promise(setImmediate); // Or await Promise.resolve(); a few times, or a more robust way to wait for internal promise

        // At this point, pipeline should have been called once by the constructor of freshAiSummaryService
        expect(pipeline).toHaveBeenCalledTimes(1);
        expect(pipeline).toHaveBeenCalledWith('summarization', 'Xenova/distilbart-cnn-6-6');

        // Call generateSummary multiple times
        await freshAiSummaryService.generateSummary('text 1');
        await freshAiSummaryService.generateSummary('text 2');

        // pipeline should still only have been called once (during construction)
        expect(pipeline).toHaveBeenCalledTimes(1);

        // And the summarizer itself should have been called twice
        expect(localMockSummarizer).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during model loading and throw for subsequent generateSummary calls', async () => {
        (pipeline as jest.Mock).mockClear();
        const loadingError = new Error('Model loading failed');
        (pipeline as jest.Mock).mockRejectedValue(loadingError); // Simulate pipeline throwing an error during load

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        jest.resetModules();
        const freshAiSummaryServiceModule = await import('./aiSummaryService');
        const freshAiSummaryService = freshAiSummaryServiceModule.aiSummaryService;

        // Wait for the model loading promise to reject
        try {
            await freshAiSummaryService['modelLoadingPromise']; // Accessing private member for test
        } catch (e) {
            expect(e).toBe(loadingError);
        }

        expect(pipeline).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading summarization model:', loadingError);

        // Now, try to generate a summary
        await expect(freshAiSummaryService.generateSummary('test')).rejects.toThrow('Summarization model is not available.');

        consoleErrorSpy.mockRestore();
    });
  });
});
