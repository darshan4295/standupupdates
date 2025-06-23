const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static('public')); // Serve static files from 'public' directory

// Configuration
const OPENAI_CONFIG = {
    apiKey: 'sk-c39cc60efa774cf5afcba2326039751e',
    baseURL: 'https://api.deepseek.com/v1'
};

const SYSTEM_PROMPT = `The user will provide some exam text. Please parse the "question" and "answer" and output them in JSON format. 

EXAMPLE INPUT: Which is the highest mountain in the world? Mount Everest.

EXAMPLE JSON OUTPUT:
{
    "question": "Which is the highest mountain in the world?",
    "answer": "Mount Everest"
}`;

const STANDUP_ANALYSIS_SYSTEM_PROMPT = `You are a detailed project assistant analyzing daily stand-up messages from Teams.
Given JSON data representing chat messages, provide a structured analysis for each relevant message.
For each message (where "messageType" is "message"), perform the following extraction and analysis:

Employee Details: from.user.displayName and createdDateTime (formatted as YYYY-MM-DD).
Project/Team: The "Project/Team Name" field from the content. Infer if not explicitly present.
Accomplishments: Summarize "What were your accomplishments yesterday?" into a precise list of key achievements (2-4 bullet points).
Task Completion:
Determine if "all the planned tasks for yesterday" were achieved. Output "Yes", "No", or "Not Specified".
If "No", identify "what is being carried forward" (as a list of tasks).
If "No", identify the "reason" tasks were carried forward.
Planned Tasks Today: Summarize "What do you plan to work on today?" into a precise list of upcoming tasks (2-4 bullet points).
Duplication Check: Define isHighlySimilarToPrevious as true if the combined "Accomplishments" and "Planned Tasks Today" sections of this message are semantically and structurally (after HTML cleaning) >90% identical to the immediately preceding message from the same employee. Otherwise, false. This flag helps identify boilerplate or unvaried updates.

Output the results as a single JSON object with the following structure:
{
  "analysisDateRange": "YYYY-MM-DD to YYYY-MM-DD", // Calculate this based on the input messages
  "dailyUpdateReports": [
    {
      "messageId": "string", // from input message
      "employeeName": "string",
      "createdDate": "YYYY-MM-DD",
      "projectTeam": "string | null",
      "accomplishments": ["string"],
      "taskCompletionStatus": "Yes" | "No" | "Not Specified",
      "carriedForwardTasks": ["string"],
      "carryForwardReason": "string | null",
      "plannedTasksToday": ["string"],
      "isHighlySimilarToPrevious": true | false
    }
  ],
  "duplicationSummary": {
    "overall": "High" | "Medium" | "Low", // Assess this based on the reports
    "details": [
      {
        "employeeName": "string",
        "repeatedUpdateCount": "number",
        "consecutiveRepeats": "number"
      }
    ]
  }
}
Input Data will be a JSON array of Teams messages. Process all messages.
Remember to clean HTML from body.content.
`;

// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'Exam Text Parser API',
        endpoints: {
            'POST /parse': 'Parse exam text to extract question and answer',
            'GET /health': 'Health check endpoint'
        }
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/parse', async (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text) {
            return res.status(400).json({
                error: 'Missing required field: text'
            });
        }

        // Prepare messages for the API
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: text }
        ];

        // Make request to DeepSeek API
        const response = await axios.post(`${OPENAI_CONFIG.baseURL}/chat/completions`, {
            model: 'deepseek-chat',
            messages: messages,
            response_format: {
                type: 'json_object'
            }
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        // Parse the response
        const aiResponse = response.data;
        const parsedContent = JSON.parse(aiResponse.choices[0].message.content);

        res.json({
            success: true,
            data: parsedContent,
            usage: aiResponse.usage
        });

    } catch (error) {
        console.error('Error processing request:', error);
        
        if (error.response) {
            // API error
            res.status(error.response.status || 500).json({
                error: 'API Error',
                message: error.response.data?.error?.message || 'Unknown API error',
                details: error.response.data
            });
        } else if (error.request) {
            // Network error
            res.status(503).json({
                error: 'Network Error',
                message: 'Unable to reach the API service'
            });
        } else {
            // Other error
            res.status(500).json({
                error: 'Server Error',
                message: error.message
            });
        }
    }
});

// New endpoint for Standup Analysis
app.post('/api/analyze-chat', async (req, res) => {
    try {
        const { chatId, accessToken } = req.body;

        // TODO: Add proper validation for chatId
        if (!chatId) {
            return res.status(400).json({ error: 'Missing required field: chatId' });
        }

        // --- Step 1: Fetch Teams Messages ---
        // TODO: Replace with actual MS Graph API call using accessToken and chatId
        // For now, using mock messages. The structure should be similar to `TeamsMessage` from frontend types.
        const mockTeamsMessages = [
            {
                id: "1",
                messageType: "message",
                createdDateTime: "2024-07-29T09:00:00Z",
                from: { user: { id: "user1", displayName: "Alice Wonderland" } },
                body: { contentType: "html", content: "<div><p>Project Alpha: Yesterday I finished feature X. Today I will work on feature Y.</p></div>" }
            },
            {
                id: "2",
                messageType: "message",
                createdDateTime: "2024-07-29T09:05:00Z",
                from: { user: { id: "user2", displayName: "Bob The Builder" } },
                body: { contentType: "html", content: "<div><p>Project Beta: Completed task A. Will start task B. No blockers.</p></div>" }
            },
            {
                id: "3",
                messageType: "message",
                createdDateTime: "2024-07-30T09:00:00Z",
                from: { user: { id: "user1", displayName: "Alice Wonderland" } },
                body: { contentType: "html", content: "<div><p>Project Alpha: Yesterday I finished feature Y. Today I will work on feature Z. Some minor delays with Y due to unexpected issues.</p></div>" }
            },
             {
                id: "4",
                messageType: "systemEventMessage", // Should be ignored by the AI based on the prompt
                createdDateTime: "2024-07-30T09:02:00Z",
                from: null,
                body: { contentType: "html", content: "<div><p>Alice added Bob to the chat.</p></div>" }
            }
        ];

        // --- Step 2: Prepare data for Deepseek AI ---
        // The prompt expects a JSON array of Teams messages.
        const messagesForAI = [
            { role: 'system', content: STANDUP_ANALYSIS_SYSTEM_PROMPT },
            { role: 'user', content: JSON.stringify(mockTeamsMessages) } // Send mock messages as JSON string
        ];

        // --- Step 3: Call Deepseek API ---
        const aiApiResponse = await axios.post(`${OPENAI_CONFIG.baseURL}/chat/completions`, {
            model: 'deepseek-chat', // Or 'deepseek-coder' if more appropriate and available
            messages: messagesForAI,
            response_format: { type: 'json_object' }
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const aiRawResponse = aiApiResponse.data;
        if (!aiRawResponse.choices || !aiRawResponse.choices[0] || !aiRawResponse.choices[0].message || !aiRawResponse.choices[0].message.content) {
            console.error('Deepseek API response format unexpected:', aiRawResponse);
            throw new Error('Failed to parse AI response: Unexpected format.');
        }

        const analyzedData = JSON.parse(aiRawResponse.choices[0].message.content);

        res.json({
            success: true,
            data: analyzedData,
            usage: aiRawResponse.usage
        });

    } catch (error) {
        console.error('Error in /api/analyze-chat:', error);
        if (error.response) {
            // API error
            res.status(error.response.status || 500).json({
                error: 'AI API Error',
                message: error.response.data?.error?.message || 'Unknown AI API error',
                details: error.response.data
            });
        } else if (error.request) {
            // Network error
            res.status(503).json({
                error: 'Network Error',
                message: 'Unable to reach the AI API service'
            });
        } else {
            // Other error (e.g., JSON parsing error from AI response)
            res.status(500).json({
                error: 'Server Error processing AI response',
                message: error.message
            });
        }
    }
});


// Test endpoint that mimics your original Python code
app.post('/test', async (req, res) => {
    try {
        const testPrompt = "Which is the longest river in the world? The Nile River.";
        
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: testPrompt }
        ];

        const response = await axios.post(`${OPENAI_CONFIG.baseURL}/chat/completions`, {
            model: 'deepseek-chat',
            messages: messages,
            response_format: {
                type: 'json_object'
            }
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const parsedContent = JSON.parse(response.data.choices[0].message.content);
        
        res.json({
            success: true,
            testInput: testPrompt,
            result: parsedContent
        });

    } catch (error) {
        console.error('Test endpoint error:', error);
        res.status(500).json({
            error: 'Test failed',
            message: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: 'Something went wrong!'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested endpoint does not exist'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API endpoint: http://localhost:${PORT}/parse`);
    console.log(`Test endpoint: http://localhost:${PORT}/test`);
});

module.exports = app;