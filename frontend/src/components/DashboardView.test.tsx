import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardView from './DashboardView';
import { StandupUpdate, TeamMember, FilterOptions } from '../types';

// Mock Data
const mockTeamMembersArray: TeamMember[] = [
  { id: '1', name: 'Alice Wonderland', email: 'alice@example.com', jobTitle: 'Engineer' },
  { id: '2', name: 'Bob The Builder', email: 'bob@example.com', jobTitle: 'Contractor' },
  { id: '3', name: 'Charlie Brown', email: 'charlie@example.com', jobTitle: 'Manager' },
];

const mockUpdatesArray: StandupUpdate[] = [
  {
    id: 'u1', member: mockTeamMembersArray[0], projectName: 'Project A', date: '2023-10-26', timestamp: '1',
    accomplishments: ['Did X'], tasksCompleted: true, todayPlans: ['Do Y'], rawMessage: 'msg'
  },
  {
    id: 'u2', member: mockTeamMembersArray[1], projectName: 'Project B', date: '2023-10-26', timestamp: '2',
    accomplishments: ['Did Z'], tasksCompleted: true, todayPlans: ['Do W'], rawMessage: 'msg2'
  },
  {
    id: 'u3', member: mockTeamMembersArray[0], projectName: 'Project C', date: '2023-10-26', timestamp: '3',
    accomplishments: ['Did V'], tasksCompleted: true, todayPlans: ['Do U'], rawMessage: 'msg3'
  },
];

const mockProjectsArray: string[] = ['Project A', 'Project B', 'Project C', 'Project D'];

const mockInitialFilters: FilterOptions = {
  searchTerm: '',
  selectedMembers: [],
  dateRange: { start: '', end: '' },
  projectFilter: '',
};

const mockSetFilters = jest.fn();

// Helper function to render the component with default or overridden props
const renderDashboardView = (props: Partial<React.ComponentProps<typeof DashboardView>> = {}) => {
  const defaultProps: React.ComponentProps<typeof DashboardView> = {
    updates: mockUpdatesArray,
    teamMembers: mockTeamMembersArray, // For display list
    allTeamMembers: mockTeamMembersArray, // For filter population
    projects: mockProjectsArray,
    filters: mockInitialFilters,
    setFilters: mockSetFilters,
    ...props,
  };
  return render(<DashboardView {...defaultProps} />);
};

describe('DashboardView Component', () => {
  beforeEach(() => {
    mockSetFilters.mockClear(); // Clear mock before each test
  });

  describe('Rendering', () => {
    test('renders main section headings', () => {
      renderDashboardView();
      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.getByText('Total Displayed Updates')).toBeInTheDocument();
      expect(screen.getByText('User-wise Updates')).toBeInTheDocument();
    });

    test('renders all filter input placeholders', () => {
      renderDashboardView();
      // Filters section
      expect(screen.getByLabelText('Search')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Keywords...')).toBeInTheDocument();

      expect(screen.getByLabelText('Team Member')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'Team Member' })).toBeInTheDocument();

      expect(screen.getByLabelText('Date Range')).toBeInTheDocument();
      expect(screen.getByLabelText('Start date')).toBeInTheDocument();
      expect(screen.getByLabelText('End date')).toBeInTheDocument();

      expect(screen.getByLabelText('Project')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'Project' })).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    test('displays the correct total number of updates', () => {
      renderDashboardView();
      expect(screen.getByText(mockUpdatesArray.length.toString())).toBeInTheDocument();
    });

    test('displays the correct update count for each team member in the display list', () => {
      renderDashboardView();
      const listItems = screen.getAllByRole('listitem');

      const aliceItem = listItems.find(item => within(item).queryByText('Alice Wonderland') !== null);
      expect(aliceItem).toBeInTheDocument();
      expect(within(aliceItem!).getByText('2 updates')).toBeInTheDocument();

      const bobItem = listItems.find(item => within(item).queryByText('Bob The Builder') !== null);
      expect(bobItem).toBeInTheDocument();
      expect(within(bobItem!).getByText('1 update')).toBeInTheDocument();

      const charlieItem = listItems.find(item => within(item).queryByText('Charlie Brown') !== null);
      expect(charlieItem).toBeInTheDocument();
      expect(within(charlieItem!).getByText('0 updates')).toBeInTheDocument();
    });
  });

  describe('Filter Interactions', () => {
    test('calls setFilters with correct search term', () => {
      renderDashboardView();
      const searchInput = screen.getByPlaceholderText('Keywords...');
      fireEvent.change(searchInput, { target: { value: 'test search' } });
      expect(mockSetFilters).toHaveBeenCalledWith(expect.any(Function));
      // To check the actual value, we can invoke the function passed to setFilters
      const updaterFunction = mockSetFilters.mock.calls[0][0];
      expect(updaterFunction(mockInitialFilters)).toEqual({ ...mockInitialFilters, searchTerm: 'test search' });
    });

    test('calls setFilters with correct team member selection', () => {
      renderDashboardView();
      const teamMemberSelect = screen.getByRole('combobox', { name: 'Team Member' });
      fireEvent.change(teamMemberSelect, { target: { value: mockTeamMembersArray[0].id } }); // Select Alice
      expect(mockSetFilters).toHaveBeenCalledWith(expect.any(Function));
      const updaterFunction = mockSetFilters.mock.calls[0][0];
      expect(updaterFunction(mockInitialFilters)).toEqual({ ...mockInitialFilters, selectedMembers: [mockTeamMembersArray[0].id] });
    });

    test('calls setFilters with correct start date', () => {
      renderDashboardView();
      const startDateInput = screen.getByLabelText('Start date');
      fireEvent.change(startDateInput, { target: { value: '2023-01-01' } });
      expect(mockSetFilters).toHaveBeenCalledWith(expect.any(Function));
      const updaterFunction = mockSetFilters.mock.calls[0][0];
      expect(updaterFunction(mockInitialFilters)).toEqual({ ...mockInitialFilters, dateRange: { start: '2023-01-01', end: '' } });
    });

    test('calls setFilters with correct end date', () => {
        renderDashboardView();
        const endDateInput = screen.getByLabelText('End date');
        fireEvent.change(endDateInput, { target: { value: '2023-01-31' } });
        expect(mockSetFilters).toHaveBeenCalledWith(expect.any(Function));
        const updaterFunction = mockSetFilters.mock.calls[0][0];
        expect(updaterFunction(mockInitialFilters)).toEqual({ ...mockInitialFilters, dateRange: { start: '', end: '2023-01-31' } });
      });

    test('calls setFilters with correct project selection', () => {
      renderDashboardView();
      const projectSelect = screen.getByRole('combobox', { name: 'Project' });
      fireEvent.change(projectSelect, { target: { value: mockProjectsArray[0] } });
      expect(mockSetFilters).toHaveBeenCalledWith(expect.any(Function));
      const updaterFunction = mockSetFilters.mock.calls[0][0];
      expect(updaterFunction(mockInitialFilters)).toEqual({ ...mockInitialFilters, projectFilter: mockProjectsArray[0] });
    });
  });

  describe('Empty States', () => {
    test('handles no updates passed (total updates is 0, user counts are 0)', () => {
      renderDashboardView({ updates: [] });
      expect(screen.getByText('Total Displayed Updates')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument(); // Total updates count

      mockTeamMembersArray.forEach(member => {
        const memberItem = screen.queryByText(member.name)?.closest('li'); // Find li containing member name
        if (memberItem) { // only check if member is rendered in display list
             expect(within(memberItem).getByText('0 updates')).toBeInTheDocument();
        }
      });
    });

    test('handles no teamMembers for display (shows empty message for user list)', () => {
      renderDashboardView({ teamMembers: [] }); // No members in the display list
      expect(screen.getByText('User-wise Updates')).toBeInTheDocument();
      expect(screen.getByText('No updates found for the selected filters, or no team members to display.')).toBeInTheDocument();
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });

    test('handles no allTeamMembers for filter (Team Member select has only "All Members")', () => {
      renderDashboardView({ allTeamMembers: [] });
      const teamMemberSelect = screen.getByRole('combobox', { name: 'Team Member' });
      expect(within(teamMemberSelect).getByText('All Members')).toBeInTheDocument();
      expect(within(teamMemberSelect).queryAllByRole('option').length).toBe(1); // Only "All Members"
    });

    test('handles no projects for filter (Project select has only "All Projects")', () => {
      renderDashboardView({ projects: [] });
      const projectSelect = screen.getByRole('combobox', { name: 'Project' });
      expect(within(projectSelect).getByText('All Projects')).toBeInTheDocument();
      expect(within(projectSelect).queryAllByRole('option').length).toBe(1); // Only "All Projects"
    });
  });
});
