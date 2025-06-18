# Teams Message Scanner

A React application that scans Microsoft Teams chat messages for standup updates and provides filtering and search capabilities.

## Features

- **Microsoft Authentication**: Sign in with your Microsoft account to access Teams data
- **Direct Access Token**: Alternatively, use a Microsoft Graph access token directly
- **Chat Selection**: Choose from your available Teams chats
- **Message Parsing**: Automatically extracts standup information from chat messages
- **Advanced Filtering**: Filter by team members, projects, date ranges, and search terms
- **Responsive Design**: Works on desktop and mobile devices
- **AI Summarization**: (Experimental) Provides AI-generated summaries of filtered standup updates.

## Authentication Options

### Option 1: Microsoft Sign-In (Recommended)
1. Click "Sign in with Microsoft" 
2. Complete OAuth flow in popup window
3. Automatic token management and refresh

### Option 2: Direct Access Token
1. Click "Use Access Token"
2. Get a token from [Microsoft Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)
3. Paste the token and click "Use Token"

## Setup Instructions

### 1. Azure App Registration (For Microsoft Sign-In)

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **"New registration"**
4. Configure:
   - **Name**: Teams Message Scanner
   - **Supported account types**: Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI**: Web - `http://localhost:5173` (for development)
5. After creation, copy the **Application (client) ID**
6. Go to **"API permissions"** and add Microsoft Graph delegated permissions:
   - `User.Read`
   - `Chat.Read` 
   - `ChatMessage.Read`
7. Click **"Grant admin consent"** (if you're an admin)

### 2. Environment Configuration

1. Copy `.env.example` to `.env`
2. Update `VITE_AZURE_CLIENT_ID` with your Application (client) ID from step 5 above

### 3. Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## AI Summarization Model

The application uses the `Xenova/distilbart-cnn-6-6` model from Hugging Face for generating AI summaries of standup updates.

To enhance reliability, especially in environments with restricted network access, and to reduce external dependencies during runtime, the model is configured to be loaded from local application paths (specifically, from `/models/Xenova/distilbart-cnn-6-6/`, which is served from the `public` directory).

The necessary tokenizer and base configuration files (like `config.json`, `tokenizer.json`, etc.) are included in the repository under `public/models/Xenova/distilbart-cnn-6-6/`.

**CRUCIAL: Local ONNX Model Files**

Due to their large size (approximately 287MB total), the main ONNX model files (`encoder_model_quantized.onnx` and `decoder_model_merged_quantized.onnx`) are **not** committed directly to the Git repository. Instead, empty placeholder files are present at `public/models/Xenova/distilbart-cnn-6-6/onnx/`.

**Action Required for Developers & Deployment:**

To enable the AI summarization feature, these placeholder files **MUST BE REPLACED** with the actual ONNX model files. You can download them from the following URLs:

- Encoder Model: [`https://huggingface.co/Xenova/distilbart-cnn-6-6/resolve/main/onnx/encoder_model_quantized.onnx`](https://huggingface.co/Xenova/distilbart-cnn-6-6/resolve/main/onnx/encoder_model_quantized.onnx)
- Decoder Model: [`https://huggingface.co/Xenova/distilbart-cnn-6-6/resolve/main/onnx/decoder_model_merged_quantized.onnx`](https://huggingface.co/Xenova/distilbart-cnn-6-6/resolve/main/onnx/decoder_model_merged_quantized.onnx)

Place the downloaded files into the `public/models/Xenova/distilbart-cnn-6-6/onnx/` directory, replacing the placeholders.

**Git LFS (Large File Storage):**

These `.onnx` files are configured in `.gitattributes` to be tracked using Git LFS.
- If you are using Git LFS and clone the repository with LFS enabled, these files *should* be fetched automatically if they have been properly committed and pushed to an LFS-enabled remote by a contributor.
- If Git LFS is not used, or if you encounter issues, manual download and placement of the ONNX files as described above are necessary.

**Impact on Application Size:**

Be aware that including these models locally will increase the application's deployment size by approximately 287MB. This is a trade-off for having the model available locally without runtime downloads from Hugging Face.

## Usage

### With Microsoft Sign-In:
1. **Sign In**: Click "Sign in with Microsoft" to authenticate
2. **Select Chat**: Choose a Teams chat from the dropdown
3. **View Updates**: Standup messages will be automatically parsed and displayed
4. **Generate Summary**: If a project or team member filter is active, a "Generate AI Summary" button will appear. Click it to summarize the filtered updates.

### With Direct Access Token:
1. **Get Token**: Visit [Microsoft Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)
2. **Sign In**: Authenticate with your Microsoft account
3. **Copy Token**: Go to "Access token" tab and copy the token
4. **Use Token**: Click "Use Access Token" in the app and paste your token
5. **Select Chat**: Choose a Teams chat from the dropdown
6. **View Updates & Generate Summary**: As above.

### Filtering and Search:
1. **Filter**: Use the sidebar to filter by team members, projects, or date ranges
2. **Search**: Use the search box to find specific content

## Supported Message Formats

The application can parse various standup message formats:

### Format 1: Structured
```
Project/Team Name: ProjectName

1. What were your accomplishments yesterday? (Tasks)
   - Task 1
   - Task 2

2. Did you achieve all the planned tasks for yesterday, if not what are getting carry forwarded? and why?
   Yes/No

3. What do you plan to work on today? (Tasks)
   - Plan 1
   - Plan 2
```

### Format 2: Unstructured
```
Accomplishments Yesterday: Task 1, Task 2
Pending from Yesterday: Carry forward task (reason)
Plan for Today: Today's plans
```

## Technologies Used

- **React 18** with TypeScript
- **Microsoft Authentication Library (MSAL)** for Azure AD authentication
- **Microsoft Graph API** for Teams data access
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Vite** for build tooling
- **Transformers.js (@xenova/transformers)** for client-side AI model inference.

## Security & Privacy

- All authentication is handled through Microsoft's secure OAuth 2.0 flow
- Access tokens are stored in session storage and automatically expire
- Direct token input is masked for security
- No sensitive data is stored permanently
- Only reads chat messages (no write permissions)

## Troubleshooting

### Authentication Issues
- Ensure your Azure app registration has the correct redirect URI
- Verify API permissions are granted
- Check that your client ID is correct in the `.env` file

### Access Token Issues
- Ensure the token has the required permissions (`Chat.Read`, `ChatMessage.Read`)
- Tokens expire - get a fresh token from Graph Explorer if needed
- Make sure you're signed into the correct Microsoft account

### Chat Access Issues
- Ensure you have access to the Teams chats you're trying to scan
- Some organizational policies may restrict API access
- Admin consent may be required for certain permissions

### AI Summarization Issues
- **Model Not Working**: Ensure the large ONNX model files have been downloaded and placed in `public/models/Xenova/distilbart-cnn-6-6/onnx/` as described in the "AI Summarization Model" section. Placeholder files in the repository will not work.
- **Slow Performance**: Initial summary generation might be slow as the model loads into memory. Subsequent summaries should be faster. Client-side AI is resource-intensive.

## License

MIT License - see LICENSE file for details