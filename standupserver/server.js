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