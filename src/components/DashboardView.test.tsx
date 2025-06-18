import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardView from './DashboardView';
import { StandupUpdate, TeamMember } from '../types';

// Mock Data
const mockTeamMembers: TeamMember[] = [
  { id: '1', name: 'Alice Wonderland', email: 'alice@example.com' },
  { id: '2', name: 'Bob The Builder', email: 'bob@example.com' },
  { id: '3', name: 'Charlie Brown', email: 'charlie@example.com' },
];

const mockUpdates: StandupUpdate[] = [
  {
    id: 'u1',
    member: mockTeamMembers[0], // Alice
    projectName: 'Project A',
    date: '2023-10-26',
    timestamp: '1698330000000',
    accomplishments: ['Did X'],
    tasksCompleted: true,
    todayPlans: ['Do Y'],
    rawMessage: 'Alice update'
  },
  {
    id: 'u2',
    member: mockTeamMembers[1], // Bob
    projectName: 'Project B',
    date: '2023-10-26',
    timestamp: '1698330000000',
    accomplishments: ['Did Z'],
    tasksCompleted: true,
    todayPlans: ['Do W'],
    rawMessage: 'Bob update'
  },
  {
    id: 'u3',
    member: mockTeamMembers[0], // Alice again
    projectName: 'Project C',
    date: '2023-10-26',
    timestamp: '1698330000000',
    accomplishments: ['Did V'],
    tasksCompleted: true,
    todayPlans: ['Do U'],
    rawMessage: 'Alice second update'
  },
];

describe('DashboardView Component', () => {
  test('renders correctly with given props and displays dashboard title', () => {
    render(<DashboardView updates={mockUpdates} teamMembers={mockTeamMembers} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  test('displays the correct total number of updates', () => {
    render(<DashboardView updates={mockUpdates} teamMembers={mockTeamMembers} />);
    expect(screen.getByText('Total Updates')).toBeInTheDocument();
    // The number itself is rendered within a <p> tag.
    // We can find the heading and then check its sibling or parent for the value if needed,
    // but directly checking for the number is fine if it's unique enough.
    expect(screen.getByText(mockUpdates.length.toString())).toBeInTheDocument();
  });

  test('displays the correct update count for each team member', () => {
    render(<DashboardView updates={mockUpdates} teamMembers={mockTeamMembers} />);

    const listItems = screen.getAllByRole('listitem');

    // Alice: 2 updates
    const aliceItem = listItems.find(item => within(item).queryByText('Alice Wonderland') !== null);
    expect(aliceItem).toBeInTheDocument();
    expect(within(aliceItem!).getByText('2 updates')).toBeInTheDocument();

    // Bob: 1 update
    const bobItem = listItems.find(item => within(item).queryByText('Bob The Builder') !== null);
    expect(bobItem).toBeInTheDocument();
    expect(within(bobItem!).getByText('1 update')).toBeInTheDocument();

    // Charlie: 0 updates
    const charlieItem = listItems.find(item => within(item).queryByText('Charlie Brown') !== null);
    expect(charlieItem).toBeInTheDocument();
    expect(within(charlieItem!).getByText('0 updates')).toBeInTheDocument();
  });

  test('handles the case where there are no updates', () => {
    render(<DashboardView updates={[]} teamMembers={mockTeamMembers} />);
    expect(screen.getByText('Total Updates')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument(); // Total updates count

    const listItems = screen.getAllByRole('listitem');
    mockTeamMembers.forEach((member, index) => {
      const memberItem = listItems.find(item => within(item).queryByText(member.name) !== null);
      expect(memberItem).toBeInTheDocument();
      expect(within(memberItem!).getByText('0 updates')).toBeInTheDocument();
    });
  });

  test('handles the case where there are no team members', () => {
    render(<DashboardView updates={mockUpdates} teamMembers={[]} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Total Updates')).toBeInTheDocument();
    expect(screen.getByText(mockUpdates.length.toString())).toBeInTheDocument();
    expect(screen.getByText('No team member data available.')).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument(); // No list items should be rendered
  });

  test('handles the case with no updates and no team members', () => {
    render(<DashboardView updates={[]} teamMembers={[]} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Total Updates')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument(); // Total updates count is 0
    expect(screen.getByText('No team member data available.')).toBeInTheDocument();
  });
});
