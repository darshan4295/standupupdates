import React from 'react';
import { StandupAnalysisReport, DailyUpdateReportItem, ChatMemberInfo } from '../types';
import { AlertTriangle, CheckCircle2, XCircle, ListChecks, CalendarDays, Users, BarChart3 } from 'lucide-react';
import DuplicateUpdatesChart from './DuplicateUpdatesChart'; // Import the new chart component
import MissingUpdatesList from './MissingUpdatesList'; // Import the new list component

interface DashboardViewProps {
  analysisReport: StandupAnalysisReport;
  filteredDailyUpdateReports: DailyUpdateReportItem[];
  membersWithoutUpdates?: ChatMemberInfo[]; // Add new prop
  // Props below are for potential future use if DashboardView needs to manage some filter display or interactions
  // allTeamMembersForFilter: TeamMember[];
  // allProjectsForFilter: string[];
  // filters: FilterOptions;
  // setFilters: (filters: FilterOptions | ((prevFilters: FilterOptions) => FilterOptions)) => void;
}

const getTaskCompletionStatusColor = (status: DailyUpdateReportItem['taskCompletionStatus']) => {
  switch (status) {
    case 'Yes': return 'text-green-500';
    case 'No': return 'text-red-500';
    case 'Not Specified': return 'text-slate-500';
    default: return 'text-slate-500';
  }
};

const getTaskCompletionStatusIcon = (status: DailyUpdateReportItem['taskCompletionStatus']) => {
  switch (status) {
    case 'Yes': return <CheckCircle2 className="w-5 h-5 inline mr-1" />;
    case 'No': return <XCircle className="w-5 h-5 inline mr-1" />;
    case 'Not Specified': return <ListChecks className="w-5 h-5 inline mr-1" />; // Or a question mark icon
    default: return <ListChecks className="w-5 h-5 inline mr-1" />;
  }
};

const DuplicationOverallBadge: React.FC<{ overall: StandupAnalysisReport['duplicationSummary']['overall'] }> = ({ overall }) => {
  let bgColor = 'bg-slate-200 text-slate-700';
  if (overall === 'Low') bgColor = 'bg-green-100 text-green-700';
  else if (overall === 'Medium') bgColor = 'bg-yellow-100 text-yellow-700';
  else if (overall === 'High') bgColor = 'bg-red-100 text-red-700';

  return (
    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${bgColor}`}>
      {overall}
    </span>
  );
};


const DashboardView: React.FC<DashboardViewProps> = ({
  analysisReport,
  filteredDailyUpdateReports,
  membersWithoutUpdates,
}) => {

  if (!analysisReport) {
    // This case should ideally be handled by App.tsx's loading/error states
    return <div className="p-6 text-center text-slate-500">No analysis report available.</div>;
  }

  const { analysisDateRange, duplicationSummary } = analysisReport;

  return (
    <div className="space-y-6 md:space-y-8 p-1"> {/* Reduced padding as App.tsx has it */}

      {/* Header Row: Date Range and Overall Duplication */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white shadow-lg rounded-xl p-6 border border-slate-200">
          <div className="flex items-center text-slate-700 mb-2">
            <CalendarDays className="w-6 h-6 mr-3 text-sky-600" />
            <h2 className="text-xl font-semibold">Analysis Period</h2>
          </div>
          <p className="text-2xl font-bold text-sky-700">{analysisDateRange || 'N/A'}</p>
        </div>

        <div className="bg-white shadow-lg rounded-xl p-6 border border-slate-200">
          <div className="flex items-center text-slate-700 mb-2">
            <BarChart3 className="w-6 h-6 mr-3 text-amber-600" />
            <h2 className="text-xl font-semibold">Overall Update Duplication</h2>
          </div>
          {duplicationSummary && <DuplicationOverallBadge overall={duplicationSummary.overall} />}
        </div>
      </div>

      {/* New Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {duplicationSummary && duplicationSummary.details && (
          <DuplicateUpdatesChart duplicationDetails={duplicationSummary.details} />
        )}
        <MissingUpdatesList membersWithoutUpdates={membersWithoutUpdates} />
      </div>

      {/* Duplication Summary Table - REMOVED as requested, replaced by chart */}
      {/*
      {duplicationSummary.details && duplicationSummary.details.length > 0 && (
        <div className="bg-white shadow-lg rounded-xl p-6 border border-slate-200">
          <div className="flex items-center text-slate-700 mb-4">
            <Users className="w-6 h-6 mr-3 text-purple-600" />
            <h2 className="text-xl font-semibold">Duplication Details by Employee</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employee</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Repeated Updates</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Max Consecutive</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {duplicationSummary.details.map((detail) => (
                  <tr key={detail.employeeName} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{detail.employeeName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{detail.repeatedUpdateCount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{detail.consecutiveRepeats}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      */}

      {/* Daily Update Reports Section */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2 mt-8">Daily Standup Reports</h2>
        <p className="text-sm text-slate-500 mb-6">
          Displaying {filteredDailyUpdateReports.length} of {analysisReport?.dailyUpdateReports?.length || 0} total reports for the period.
        </p>

        {filteredDailyUpdateReports.length === 0 && (
           <div className="bg-white shadow-md rounded-lg p-12 text-center border border-slate-200">
            <ListChecks className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No standup reports match your current filters.</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting or clearing the filters.</p>
          </div>
        )}

        <div className="space-y-6">
          {filteredDailyUpdateReports.map((report) => (
            <div key={report.messageId} className="bg-white shadow-lg rounded-xl border border-slate-200 overflow-hidden transition-all hover:shadow-2xl">
              <div className={`px-6 py-4 border-b border-slate-200 ${report.isHighlySimilarToPrevious ? 'bg-yellow-50' : 'bg-slate-50'}`}>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-sky-700">{report.employeeName}</h3>
                    <p className="text-xs text-slate-500">
                      {report.createdDate} {report.projectTeam && `| ${report.projectTeam}`}
                    </p>
                  </div>
                  {report.isHighlySimilarToPrevious && (
                    <span title="This update is highly similar to the previous one from this employee" className="mt-2 sm:mt-0 flex items-center text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">
                      <AlertTriangle className="w-4 h-4 mr-1.5" />
                      Highly Similar to Previous
                    </span>
                  )}
                  {report.approvedBy && (
                    <span title={`Approved by ${report.approvedBy}`} className="mt-2 sm:mt-0 sm:ml-2 flex items-center text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      Approved by {report.approvedBy}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <h4 className="font-semibold text-slate-700 mb-2 text-sm">Accomplishments Yesterday:</h4>
                  {report.accomplishments.length > 0 ? (
                    <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                      {report.accomplishments.map((item, idx) => <li key={idx}>{item}</li>)}
                    </ul>
                  ) : <p className="text-sm text-slate-500 italic">Not specified.</p>}
                </div>

                <div>
                  <h4 className="font-semibold text-slate-700 mb-2 text-sm">Plans for Today:</h4>
                  {report.plannedTasksToday.length > 0 ? (
                    <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                      {report.plannedTasksToday.map((item, idx) => <li key={idx}>{item}</li>)}
                    </ul>
                  ) : <p className="text-sm text-slate-500 italic">Not specified.</p>}
                </div>

                <div className="md:col-span-2 mt-2">
                  <h4 className="font-semibold text-slate-700 mb-2 text-sm">Task Completion (Yesterday's Plans):</h4>
                  <p className={`text-sm ${getTaskCompletionStatusColor(report.taskCompletionStatus)}`}>
                    {getTaskCompletionStatusIcon(report.taskCompletionStatus)}
                    {report.taskCompletionStatus}
                  </p>
                </div>

                {report.taskCompletionStatus === 'No' && (
                  <>
                    <div>
                      <h4 className="font-semibold text-slate-700 mt-2 mb-1 text-sm">Carried Forward:</h4>
                      {report.carriedForwardTasks.length > 0 ? (
                        <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                          {report.carriedForwardTasks.map((item, idx) => <li key={idx}>{item}</li>)}
                        </ul>
                      ) : <p className="text-sm text-slate-500 italic">No specific tasks listed.</p>}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-700 mt-2 mb-1 text-sm">Reason for Carry Forward:</h4>
                      <p className="text-sm text-slate-600">{report.carryForwardReason || <span className="italic">Not specified.</span>}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
