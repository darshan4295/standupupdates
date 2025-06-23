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

// Helper function to fetch messages from Microsoft Graph API
async function fetchTeamsMessagesFromGraph(chatId, accessToken) {
  if (!accessToken) {
    throw new Error('Microsoft Graph API access token is required.');
  }
  const graphApiUrl = `https://graph.microsoft.com/v1.0/chats/${encodeURIComponent(chatId)}/messages?$top=50`; // Fetch top 50, default is 20. Can be configurable.
  console.log(`Fetching messages from Graph API: ${graphApiUrl}`);

  try {
    const response = await axios.get(graphApiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    // Assuming messages are in response.data.value
    // Ensure to return only the messages array, or handle if 'value' is not present
    return response.data.value || [];
  } catch (error) {
    console.error('Error fetching messages from Graph API:', error.response ? error.response.data : error.message);
    if (error.response && error.response.data && error.response.data.error) {
        const graphError = error.response.data.error;
        throw new Error(`Graph API Error: ${graphError.code} - ${graphError.message}`);
    }
    throw new Error('Failed to fetch messages from Microsoft Graph API.');
  }
}

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
        if (!accessToken) {
            return res.status(401).json({ error: 'Missing required field: accessToken for fetching Teams messages.' });
        }

        // --- Step 1: Fetch Teams Messages ---
        const teamsMessages = await fetchTeamsMessagesFromGraph(chatId, accessToken);

        if (!teamsMessages || teamsMessages.length === 0) {
          // If no messages are found, we can either send an empty array to the AI
          // or return a specific response. For now, let's send to AI, it might return an empty report.
          console.log(`No messages found for chat ${chatId} or failed to fetch.`);
          // Optionally, return a custom response here if preferred over sending empty data to AI.
          // return res.status(200).json({ success: true, data: { analysisDateRange: "N/A", dailyUpdateReports: [], duplicationSummary: { overall: "Low", details: [] } }, message: "No messages found in chat." });
        }

        // --- Step 2: Prepare data for Deepseek AI ---
        // The prompt expects a JSON array of Teams messages.
        const messagesForAI = [
            { role: 'system', content: STANDUP_ANALYSIS_SYSTEM_PROMPT },
            { role: 'user', content: JSON.stringify(teamsMessages) } // Send actual fetched messages as JSON string
        ];

        // --- Step 3: Call Deepseek API ---
        console.log(`Sending ${teamsMessages.length} messages to Deepseek for analysis.`);
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
        console.error('Error in /api/analyze-chat:', error.message);
        // Check if the error came from fetchTeamsMessagesFromGraph (it throws a custom error message)
        if (error.message.startsWith('Graph API Error:') || error.message === 'Failed to fetch messages from Microsoft Graph API.' || error.message === 'Microsoft Graph API access token is required.') {
            // Specific error from Graph API interaction
            res.status(400).json({ // Could be 400, 401, 403, 404 depending on actual Graph error, simplifying to 400 for client
                error: 'Microsoft Graph API Error',
                message: error.message
            });
        } else if (error.response) { // Error from Axios (likely Deepseek API)
            // Deepseek API error
            console.error('Deepseek API Error Details:', error.response.data);
            res.status(error.response.status || 500).json({
                error: 'AI Service Error',
                message: error.response.data?.error?.message || 'Unknown error from AI service.',
                details: error.response.data
            });
        } else if (error.request) { // Network error for Deepseek API
            console.error('Network Error (Deepseek API):', error.request);
            res.status(503).json({
                error: 'Network Error',
                message: 'Unable to reach the AI service.'
            });
        } else {
            // Other errors (e.g., JSON parsing of AI response, unexpected issues)
            res.status(500).json({
                error: 'Internal Server Error',
                message: error.message || 'An unexpected error occurred while processing the request.'
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