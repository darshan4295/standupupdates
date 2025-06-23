export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  jobTitle?: string;
  department?: string;
}

// --- StandupUpdate interface removed as it's deprecated and replaced ---

// --- New Types for Standup Analysis Report (based on Prompt 2) ---

export interface DailyUpdateReportItem {
  messageId: string;
  employeeName: string;
  createdDate: string; // YYYY-MM-DD
  projectTeam: string | null;
  accomplishments: string[]; // List of key achievements
  taskCompletionStatus: "Yes" | "No" | "Not Specified";
  carriedForwardTasks: string[]; // List of tasks
  carryForwardReason: string | null;
  plannedTasksToday: string[]; // List of tasks
  isHighlySimilarToPrevious: boolean;
}

export interface DuplicationDetail {
  employeeName: string;
  repeatedUpdateCount: number;
  consecutiveRepeats: number;
}

export interface DuplicationSummary {
  overall: "High" | "Medium" | "Low";
  details: DuplicationDetail[];
}

export interface StandupAnalysisReport {
  analysisDateRange: string; // YYYY-MM-DD to YYYY-MM-DD
  dailyUpdateReports: DailyUpdateReportItem[];
  duplicationSummary: DuplicationSummary;
  message?: string; // Optional message, e.g., if no messages were analyzed
}

// Information about a chat member, typically from Graph API /members endpoint
export interface ChatMemberInfo {
  id: string; // User's AAD ID (userId from Graph)
  name: string; // displayName from Graph
  email?: string | null; // email from Graph
}

// New overall response structure from the backend API /api/analyze-chat
export interface CombinedAnalysisResponse {
  standupAnalysis: StandupAnalysisReport;
  allChatMembers: ChatMemberInfo[];
}

// --- End of New Types ---


export interface TeamsMessage {
  id: string;
  messageType: string;
  createdDateTime: string;
  from: {
    user: {
      id: string;
      displayName: string;
      userIdentityType: string;
      tenantId: string;
    };
  } | null;
  body: {
    contentType: string;
    content: string;
  };
  attachments: any[];
  mentions: any[];
  reactions: any[];
}

export interface TeamsApiResponse {
  "@odata.context": string;
  "@odata.count": number;
  value: TeamsMessage[];
}

export interface FilterOptions {
  searchTerm: string;
  selectedMembers: string[];
  dateRange: {
    start: string;
    end: string;
  };
  projectFilter: string;
}