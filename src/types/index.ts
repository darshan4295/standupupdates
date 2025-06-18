export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  jobTitle?: string;
  department?: string;
}

export interface StandupUpdate {
  id: string;
  member: TeamMember;
  projectName: string;
  date: string;
  timestamp: string;
  accomplishments: string[];
  tasksCompleted: boolean;
  carryForward?: string;
  carryForwardReason?: string;
  todayPlans: string[];
  rawMessage: string;
}

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