import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { StandupAnalysisReport } from '../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface DuplicateUpdatesChartProps {
  duplicationDetails: StandupAnalysisReport['duplicationSummary']['details'];
}

const DuplicateUpdatesChart: React.FC<DuplicateUpdatesChartProps> = ({ duplicationDetails }) => {
  if (!duplicationDetails || duplicationDetails.length === 0) {
    return <p className="text-sm text-slate-500 italic">No duplication data available to display.</p>;
  }

  const data = {
    labels: duplicationDetails.map(detail => detail.employeeName),
    datasets: [
      {
        label: 'Repeated Updates',
        data: duplicationDetails.map(detail => detail.repeatedUpdateCount),
        backgroundColor: 'rgba(255, 159, 64, 0.5)',
        borderColor: 'rgba(255, 159, 64, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Employee Update Duplication Counts',
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y;
              const employeeDetail = duplicationDetails[context.dataIndex];
              if (employeeDetail) {
                label += ` (Consecutive: ${employeeDetail.consecutiveRepeats})`;
              }
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Repeated Updates',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Employee Name',
        },
      },
    },
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 border border-slate-200" style={{ height: '400px' }}>
      <Bar options={options} data={data} />
    </div>
  );
};

export default DuplicateUpdatesChart;
