// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardView from './DashboardView';
import { aiSummaryService } from '../../services/aiSummaryService';
import { StandupUpdate, TeamMember, FilterOptions } from '../types';

// Mock the AI Summary Service
jest.mock('../../services/aiSummaryService', () => ({
  aiSummaryService: {
    generateSummary: jest.fn(),
  },
}));

const mockUpdates: StandupUpdate[] = [
  { id: '1', member: { id: 'm1', name: 'Alice' }, project: 'Project A', rawMessage: 'Alice update 1', htmlMessage: '', timestamp: '', date: '2023-01-01' },
  { id: '2', member: { id: 'm1', name: 'Alice' }, project: 'Project B', rawMessage: 'Alice update 2', htmlMessage: '', timestamp: '', date: '2023-01-01' },
  { id: '3', member: { id: 'm2', name: 'Bob' }, project: 'Project A', rawMessage: 'Bob update 1', htmlMessage: '', timestamp: '', date: '2023-01-01' },
];

const mockTeamMembers: TeamMember[] = [
  { id: 'm1', name: 'Alice' },
  { id: 'm2', name: 'Bob' },
];

const mockProjects: string[] = ['Project A', 'Project B'];

const initialFilters: FilterOptions = {
  searchTerm: '',
  selectedMembers: [],
  dateRange: { start: '', end: '' },
  projectFilter: '',
};

const defaultProps = {
  updates: mockUpdates,
  teamMembers: mockTeamMembers,
  allTeamMembers: mockTeamMembers,
  projects: mockProjects,
  filters: initialFilters,
  setFilters: jest.fn(),
};

describe('DashboardView AI Summary Functionality', () => {
  beforeEach(() => {
    (aiSummaryService.generateSummary as jest.Mock).mockClear();
    defaultProps.setFilters.mockClear();
    // Reset filters to initial state for most tests, can be overridden in specific tests
    defaultProps.filters = { ...initialFilters };
  });

  const getSummaryButton = () => screen.queryByRole('button', { name: /generate ai summary/i });
  const getGeneratingButton = () => screen.queryByRole('button', { name: /generating summary.../i });

  it('should not display the "Generate AI Summary" button initially when no relevant filters are set', () => {
    render(<DashboardView {...defaultProps} />);
    expect(getSummaryButton()).not.toBeInTheDocument();
  });

  it('should display the button when a project filter is active', () => {
    render(<DashboardView {...defaultProps} filters={{ ...initialFilters, projectFilter: 'Project A' }} />);
    expect(getSummaryButton()).toBeInTheDocument();
  });

  it('should display the button when a team member filter is active', () => {
    render(<DashboardView {...defaultProps} filters={{ ...initialFilters, selectedMembers: ['m1'] }} />);
    expect(getSummaryButton()).toBeInTheDocument();
  });

  describe('Summary Generation Process', () => {
    const summaryText = 'This is a mock summary.';
    const updatesForSummary = mockUpdates;

    beforeEach(() => {
      // Ensure button is present for these tests by setting a relevant filter
      defaultProps.filters = { ...initialFilters, projectFilter: 'Project A' };
    });

    it('should call aiSummaryService.generateSummary with concatenated rawMessages and show loading state', async () => {
      (aiSummaryService.generateSummary as jest.Mock).mockReturnValue(new Promise(() => {})); // Keep it pending

      render(<DashboardView {...defaultProps} updates={updatesForSummary} />);
      fireEvent.click(getSummaryButton());

      expect(aiSummaryService.generateSummary).toHaveBeenCalledWith(
        updatesForSummary.map(u => u.rawMessage).join('\\n\\n')
      );
      expect(getGeneratingButton()).toBeInTheDocument();
      expect(screen.getByText(/generating summary, please wait.../i)).toBeInTheDocument();
    });

    it('should display the summary when generation is successful', async () => {
      (aiSummaryService.generateSummary as jest.Mock).mockResolvedValue(summaryText);
      render(<DashboardView {...defaultProps} updates={updatesForSummary} />);

      fireEvent.click(getSummaryButton());

      await waitFor(() => {
        expect(screen.getByText('AI Generated Summary')).toBeInTheDocument();
      });
      expect(screen.getByText(summaryText)).toBeInTheDocument();
      expect(getSummaryButton()).toBeInTheDocument();
      expect(screen.queryByText(/generating summary, please wait.../i)).not.toBeInTheDocument();
    });

    it('should display an error message when generation fails', async () => {
      const errorMessage = 'Failed to generate summary';
      (aiSummaryService.generateSummary as jest.Mock).mockRejectedValue(new Error(errorMessage));
      render(<DashboardView {...defaultProps} updates={updatesForSummary} />);

      fireEvent.click(getSummaryButton());

      await waitFor(() => {
        // Error message should now be the exact message from the service
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
      expect(getSummaryButton()).toBeInTheDocument();
      expect(screen.queryByText(/generating summary, please wait.../i)).not.toBeInTheDocument();
      expect(screen.queryByText('AI Generated Summary')).not.toBeInTheDocument();
    });

    it('should display an error message if no text is available to summarize', async () => {
      // Need to ensure the button is visible for this test
      render(<DashboardView {...defaultProps} updates={[]} filters={{...initialFilters, projectFilter: "Project A"}} />);
      fireEvent.click(getSummaryButton());

      await waitFor(() => {
        expect(screen.getByText('No text available to summarize from the current selection.')).toBeInTheDocument();
      });
      expect(aiSummaryService.generateSummary).not.toHaveBeenCalled();
      expect(getSummaryButton()).toBeInTheDocument();
    });
  });

  describe('Summary Display Management', () => {
    const summaryText = 'This is a summary.';

    beforeEach(async () => {
      defaultProps.filters = { ...initialFilters, projectFilter: 'Project A' };
      (aiSummaryService.generateSummary as jest.Mock).mockResolvedValue(summaryText);
    });

    it('should clear the summary when the "Close" button is clicked', async () => {
      render(<DashboardView {...defaultProps} />);
      fireEvent.click(getSummaryButton());

      await waitFor(() => expect(screen.getByText('AI Generated Summary')).toBeInTheDocument());
      expect(screen.getByText(summaryText)).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('AI Generated Summary')).not.toBeInTheDocument();
        expect(screen.queryByText(summaryText)).not.toBeInTheDocument();
      });
    });

    it('should clear the summary and error when filters change', async () => {
      const { rerender } = render(<DashboardView {...defaultProps} filters={{ ...initialFilters, projectFilter: 'Project A' }} />);
      fireEvent.click(getSummaryButton());
      await waitFor(() => expect(screen.getByText('AI Generated Summary')).toBeInTheDocument());

      await act(async () => {
        rerender(<DashboardView {...defaultProps} filters={{ ...initialFilters, projectFilter: 'Project B' }} />);
      });

      expect(screen.queryByText('AI Generated Summary')).not.toBeInTheDocument();
      expect(screen.queryByText(summaryText)).not.toBeInTheDocument();

      // Test error clearing
      const filterChangeErrorText = "Filter change test error";
      (aiSummaryService.generateSummary as jest.Mock).mockRejectedValueOnce(new Error(filterChangeErrorText));
      // Ensure button is visible with new filters before clicking
      rerender(<DashboardView {...defaultProps} filters={{ ...initialFilters, projectFilter: 'Project B' }} />);
      fireEvent.click(getSummaryButton());
      await waitFor(() => expect(screen.getByText(filterChangeErrorText)).toBeInTheDocument());

      await act(async () => {
        rerender(<DashboardView {...defaultProps} filters={{ ...initialFilters, projectFilter: 'Project C' }} />);
      });
      expect(screen.queryByText(filterChangeErrorText)).not.toBeInTheDocument();
    });

    it('should clear previous summary/error when a new summary generation is initiated', async () => {
      render(<DashboardView {...defaultProps} filters={{ ...initialFilters, projectFilter: 'Project A' }} />);

      const errorMessage = "Initial error";
      (aiSummaryService.generateSummary as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));
      fireEvent.click(getSummaryButton());
      await waitFor(() => expect(screen.getByText(errorMessage)).toBeInTheDocument());

      const newSummary = "New successful summary";
      (aiSummaryService.generateSummary as jest.Mock).mockResolvedValueOnce(newSummary); // Next call succeeds
      fireEvent.click(getSummaryButton());

      expect(screen.getByText(/generating summary, please wait.../i)).toBeInTheDocument();
      // Previous error message should be cleared
      expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();

      await waitFor(() => expect(screen.getByText('AI Generated Summary')).toBeInTheDocument());
      expect(screen.getByText(newSummary)).toBeInTheDocument();
    });
  });
});
