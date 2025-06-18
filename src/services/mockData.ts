import { StandupUpdate, TeamMember, TeamsApiResponse } from '../types';

export const mockTeamMembers: TeamMember[] = [
  {
    id: '0ac11856-45c2-40dd-a1fa-8075bc60b966',
    name: 'Abhishek a',
    email: 'abhishek.a@company.com',
    avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=150'
  },
  {
    id: 'f483f435-20e3-4d62-b965-61e7e3c8fa8c',
    name: 'Dayananda D',
    email: 'dayananda.d@company.com',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150'
  },
  {
    id: 'b9f01573-f374-45e4-9e0e-ed9a0f33f556',
    name: 'Devendra Haldankar',
    email: 'devendra.h@company.com',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150'
  },
  {
    id: '8de486a4-1793-4237-aa5e-0033f60f1253',
    name: 'Darshan Hande',
    email: 'darshan.h@company.com',
    avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150'
  }
];

// Mock Teams API response data based on your provided format
export const mockTeamsApiResponse: TeamsApiResponse = {
  "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#chats('19%3A0ff2ed4d24904eda9d794c796ba49a78%40thread.v2')/messages",
  "@odata.count": 3,
  value: [
    {
      id: "1750245208173",
      messageType: "message",
      createdDateTime: "2025-01-18T11:13:28.173Z",
      from: {
        user: {
          id: "b9f01573-f374-45e4-9e0e-ed9a0f33f556",
          displayName: "Devendra Haldankar",
          userIdentityType: "aadUser",
          tenantId: "c5e52224-ee99-4449-86e4-9f71d30f361b"
        }
      },
      body: {
        contentType: "html",
        content: "<p>Accomplishments Yesterday: Hitachi: Completed Hitachi code reviews for Subash and Daya. Suggested refactoring of core component. Ovation MRs: Reviewed 2 additional task from Rohit and created the MR as planned. Calls and Sync ups: 2 hours Pending from Yesterday: Interview question preparation (carried forward, thinking to incorporate some coding questions) Plan for Today: Finalize and document interview questions Ovation requested one more help in their legacy ExtJS app, I will work on it.</p>"
      },
      attachments: [],
      mentions: [],
      reactions: []
    },
    {
      id: "1750238794099",
      messageType: "message",
      createdDateTime: "2025-01-18T09:26:34.099Z",
      from: {
        user: {
          id: "f483f435-20e3-4d62-b965-61e7e3c8fa8c",
          displayName: "Dayananda D",
          userIdentityType: "aadUser",
          tenantId: "c5e52224-ee99-4449-86e4-9f71d30f361b"
        }
      },
      body: {
        contentType: "html",
        content: "<p style=\"margin-bottom:0px; margin-left:0; margin-top:0px\"><span style=\"font-size:inherit\">Project/Team Name: Hitachi – 18/01/2025</span></p>\n<p style=\"margin-left:0\">&nbsp;</p>\n<ol>\n<li><span style=\"font-size:inherit\"><strong>What were your accomplishments yesterday? (Tasks)</strong></span><br>\n<span style=\"font-size:inherit\">Since the OpenLayers map does not support a layer switcher, I explored available plugins for this functionality. I found two layer switchers compatible with OpenLayers and worked with the ol-ext plugin, which includes layer switcher image functionality. However, we still need to customize it further to meet our needs. Additionally, I set up Android Studio and connected with Devendra to review my code.</span></li><li><span style=\"font-size:inherit\"><strong>Did you achieve all the planned tasks for yesterday? If not, what is being carried forward and why?</strong></span><br>\n<span style=\"font-size:inherit\">Yes. I have completed the planned tasks</span></li><li><span style=\"font-size:inherit\"><strong>What do you plan to work on today? (Tasks)</strong></span><br>\n<span style=\"font-size:inherit\">Today, I started adding comments for my code changes that Devendra has reviewed, and I'm planning to continue exploring different layer switcher plugins that support OpenLayers maps.</span></li></ol>"
      },
      attachments: [],
      mentions: [],
      reactions: []
    },
    {
      id: "1750238771957",
      messageType: "message",
      createdDateTime: "2025-01-18T09:26:11.957Z",
      from: {
        user: {
          id: "0ac11856-45c2-40dd-a1fa-8075bc60b966",
          displayName: "Abhishek a",
          userIdentityType: "aadUser",
          tenantId: "c5e52224-ee99-4449-86e4-9f71d30f361b"
        }
      },
      body: {
        contentType: "html",
        content: "<h2>Project/Team Name: Froala</h2>\n<ol>\n<li><strong>What were your accomplishments yesterday? (Tasks)</strong><br>\nWorked on the ticket FROALA-421 , wrote the test cases and raised the PR. worked on the ticket FROALA-416 and raised the PR.<br>\n&nbsp;</li><li><strong>Did you achieve all the planned tasks for yesterday, if not what are getting carry forwarded? and why?</strong><br>\nYes.<br>\n&nbsp;</li><li><strong>What do you plan to work on today? (Tasks)</strong><br>\nWill be working on the ticket FROALA-468.&nbsp;</li></ol>"
      },
      attachments: [],
      mentions: [],
      reactions: []
    }
  ]
};

// Parse the mock data into standup updates
import { MessageParser } from './messageParser';

export const mockStandupUpdates: StandupUpdate[] = mockTeamsApiResponse.value
  .map(message => MessageParser.parseStandupMessage(message))
  .filter((update): update is StandupUpdate => update !== null);