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
Approval Status: Examine the 'reactions' array for each message. If a reaction with 'reactionType' of "✅" (Unicode U+2705) is present:
  Extract the reacting user's ID from 'reaction.user.user.id' and store it as 'approvedById'.
  Attempt to extract the reacting user's display name from 'reaction.user.user.displayName' and store it as 'approvedByName'. This might be null.
  If multiple "✅" reactions exist, use the details from the first one found.
  If no "✅" reaction is found, set 'approvedById' to null and 'approvedByName' to null.

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
      "isHighlySimilarToPrevious": true | false,
      "approvedById": "string | null", // User ID of the approver
      "approvedByName": "string | null" // Display name of the approver, if available directly from reaction
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
async function fetchTeamsMessagesFromGraph(chatId, accessToken) { // Removed startDate, endDate params
  if (!accessToken) {
    throw new Error('Microsoft Graph API access token is required.');
  }

  // Fetch top 50 messages. More sophisticated paging could be added if needed.
  // The date filtering will now happen in the application layer after fetching.
  const graphApiUrl = `https://graph.microsoft.com/v1.0/chats/${encodeURIComponent(chatId)}/messages?$top=50`;

  console.log(`Fetching top 50 messages from Graph API: ${graphApiUrl}`);

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

// Helper function to fetch chat members from Microsoft Graph API
async function fetchChatMembersFromGraph(chatId, accessToken) {
  if (!accessToken) {
    throw new Error('Microsoft Graph API access token is required for fetching chat members.');
  }
  const graphApiUrl = `https://graph.microsoft.com/v1.0/chats/${encodeURIComponent(chatId)}/members`;
  console.log(`Fetching chat members from Graph API: ${graphApiUrl}`);

  try {
    const response = await axios.get(graphApiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    // Graph API /members returns an array of conversationMember objects
    // We need to map them to a simpler structure, e.g., { id: userId, name: displayName, email: email }
    const members = response.data.value || [];
    return members.map(member => ({
      id: member.userId, // Use the Azure AD User ID
      name: member.displayName,
      email: member.email || null // Email might not always be present
    }));
  } catch (error) {
    console.error('Error fetching chat members from Graph API:', error.response ? error.response.data : error.message);
    if (error.response && error.response.data && error.response.data.error) {
        const graphError = error.response.data.error;
        throw new Error(`Graph API Error fetching members: ${graphError.code} - ${graphError.message}`);
    }
    throw new Error('Failed to fetch chat members from Microsoft Graph API.');
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
        const { chatId, accessToken, startDate, endDate } = req.body; // Added startDate and endDate

        // TODO: Add proper validation for chatId
        if (!chatId) {
            return res.status(400).json({ error: 'Missing required field: chatId' });
        }
        if (!accessToken) {
            return res.status(401).json({ error: 'Missing required field: accessToken for fetching Teams messages.' });
        }

        // --- Step 1a: Fetch All Chat Members ---
        const allChatMembers = await fetchChatMembersFromGraph(chatId, accessToken);

        // --- Step 1b: Fetch Teams Messages ---
        let rawTeamsMessages = await fetchTeamsMessagesFromGraph(chatId, accessToken); // No date params here

        // --- Step 1c: Filter messages by date in application memory ---
        let filteredTeamsMessages = [];
        if (rawTeamsMessages && rawTeamsMessages.length > 0 && startDate && endDate) {
            const startDateTime = new Date(`${startDate}T00:00:00Z`);
            const endDateObj = new Date(`${endDate}T00:00:00Z`);
            // To include the entire endDate, set the limit to the start of the day AFTER endDate
            endDateObj.setDate(endDateObj.getDate() + 1);

            filteredTeamsMessages = rawTeamsMessages.filter(msg => {
                if (!msg.createdDateTime) return false;
                const msgDateTime = new Date(msg.createdDateTime);
                return msgDateTime >= startDateTime && msgDateTime < endDateObj;
            });
            console.log(`Filtered ${rawTeamsMessages.length} raw messages down to ${filteredTeamsMessages.length} messages for date range ${startDate} to ${endDate}.`);
        } else if (rawTeamsMessages) {
            // If no date range specified or messages are empty, use raw (or empty)
            filteredTeamsMessages = rawTeamsMessages;
             console.log(`No date range provided or no raw messages, using all ${rawTeamsMessages.length} fetched messages.`);
        }

        if (!filteredTeamsMessages || filteredTeamsMessages.length === 0) {
          console.log(`No messages found for chat ${chatId} within date range ${startDate}-${endDate} (or no messages fetched). Still returning all members.`);
        }

        // --- Step 2: Prepare data for Deepseek AI (only if there are filtered messages) ---
        let standupAnalysisData = {
            analysisDateRange: (startDate && endDate) ? `${startDate} to ${endDate}` : "All fetched messages",
            dailyUpdateReports: [],
            duplicationSummary: { overall: "Low", details: [] },
            message: "No relevant messages found in chat to analyze for the selected period."
        };
        let aiUsage = null;

        if (filteredTeamsMessages && filteredTeamsMessages.length > 0) {
            const messagesForAI = [
                { role: 'system', content: STANDUP_ANALYSIS_SYSTEM_PROMPT },
                { role: 'user', content: JSON.stringify(filteredTeamsMessages) } // Use filtered messages
            ];

            // --- Step 3: Call Deepseek API ---
            console.log(`Sending ${filteredTeamsMessages.length} messages to Deepseek for analysis.`);
            const aiApiResponse = await axios.post(`${OPENAI_CONFIG.baseURL}/chat/completions`, {
                model: 'deepseek-chat',
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
                // Don't throw, but use default standupAnalysisData and log error
                standupAnalysisData.message = "Error parsing AI response for standup analysis.";
            } else {
                 standupAnalysisData = JSON.parse(aiRawResponse.choices[0].message.content);
                 aiUsage = aiRawResponse.usage;
            }
        }

        // --- Step 4: Process AI Analysis for Approver Names ---
        if (standupAnalysisData && standupAnalysisData.dailyUpdateReports && allChatMembers) {
            const memberMap = new Map(allChatMembers.map(member => [member.id, member.name]));

            standupAnalysisData.dailyUpdateReports.forEach(report => {
                report.approvedBy = null; // Initialize approvedBy for the final report
                if (report.approvedById) {
                    if (report.approvedByName) {
                        report.approvedBy = report.approvedByName;
                    } else {
                        report.approvedBy = memberMap.get(report.approvedById) || `Unknown Approver (ID: ${report.approvedById})`;
                    }
                }
                delete report.approvedById; // Clean up intermediate field
                delete report.approvedByName; // Clean up intermediate field
            });
        }


        // --- Step 5: Identify members without updates ---
        let membersWithoutUpdates = [];
        if (allChatMembers && allChatMembers.length > 0) {
            const reporters = new Set();
            if (standupAnalysisData && standupAnalysisData.dailyUpdateReports) {
                standupAnalysisData.dailyUpdateReports.forEach(report => {
                    if (report.employeeName) {
                        reporters.add(report.employeeName);
                    }
                });
            }

            membersWithoutUpdates = allChatMembers.filter(member => {
                // Check if the member's name is in the set of reporters
                // Assuming member.name from Graph API matches employeeName from AI analysis
                return !reporters.has(member.name);
            });
        }

        // Combine analysis with all chat members and members without updates
        const responseData = {
            standupAnalysis: standupAnalysisData,
            allChatMembers: allChatMembers,
            membersWithoutUpdates: membersWithoutUpdates // Add this new field
        };

        res.json({
            success: true,
            data: responseData,
            usage: aiUsage // This will be null if Deepseek wasn't called
        });

    } catch (error) {
        console.error('Error in /api/analyze-chat:', error.message);
        // Check if the error came from Graph API calls
        if (error.message.startsWith('Graph API Error') || error.message.startsWith('Failed to fetch') || error.message.includes('access token is required')) {
            res.status(400).json({
                error: 'Microsoft Graph API Error',
                message: error.message
            });
        } else if (error.response) { // Error from Axios (Deepseek API)
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