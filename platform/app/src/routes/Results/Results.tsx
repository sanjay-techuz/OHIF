/* eslint-disable */
// platform/app/src/routes/Results/Results.tsx
import {
  apiCall,
  apiService,
  decryptObject,
  encrypt,
  encryptObject,
  getCustomParams,
} from '@ohif/core';
import { Button } from '@ohif/ui-next';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
const MetricRing: React.FC<{
  title: string;
  value: number; // 0–100
  color: string;
}> = ({ title, value, color }) => {
  const size = 160;
  const strokeWidth = 14;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center rounded-2xl border border-[rgba(255,255,255,0.15)] bg-[linear-gradient(124deg,#1C1C1C_0%,#0B0A0A_99.91%)] px-6 py-5 shadow-[0_12px_71.8px_rgba(0,0,0,0.50)]">
      <div className="mb-3 text-lg font-semibold text-white">{title}</div>

      <div className="relative">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#2d2d2d"
            strokeWidth={strokeWidth}
          />

          {/* Progress Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
            style={{ transition: 'stroke-dashoffset 0.7s ease-out' }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-2xl font-semibold text-white">{Math.round(value)}%</div>
        </div>
      </div>
    </div>
  );
};
interface ResultsProps {
  servicesManager: AppTypes.ServicesManager;
  extensionManager: AppTypes.ExtensionManager;
  commandsManager: AppTypes.CommandsManager;
}

const Results: React.FC<ResultsProps> = ({
  servicesManager,
  extensionManager,
  commandsManager,
}) => {
  const navigate = useNavigate();
  const [results, setResults] = useState({ TN: 0, FP: 0, FN: 0, TP: 0 });

  const [mistakesData, setMistakesData] = useState([]);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [sensitivity, setSensitivity] = useState(0);
  const [specificity, setSpecificity] = useState(0);

  const { courseId, studentId, moduleId, caseId } = getCustomParams();
  useEffect(() => {
    const fetchResults = async () => {
      const result = await apiCall(() =>
        apiService.get(`/user/cases/evaluation/measurement/${courseId}/${moduleId}/${studentId}`)
      );

      if (result.success) {
        const { data } = result.data as { data: any };
        if (data) {
          const { counts, details } = data.evaluation;
          setTotalMistakes(counts?.mistakes || 0);

          // Use overall metrics from API
          setSensitivity(data.evaluation.metrics.overall?.sensitivity || 0);
          setSpecificity(data.evaluation.metrics.overall?.specificity || 0);

          // Calculate sum of R, L, and screening counts
          const totalCounts = {
            TN: (counts.R?.TN || 0) + (counts.L?.TN || 0) + (counts.screening?.TN || 0),
            FP: (counts.R?.FP || 0) + (counts.L?.FP || 0) + (counts.screening?.FP || 0),
            TP: (counts.R?.TP || 0) + (counts.L?.TP || 0) + (counts.screening?.TP || 0),
            FN: (counts.R?.FN || 0) + (counts.L?.FN || 0) + (counts.screening?.FN || 0),
          };
          setResults(totalCounts);

          // Transform API data to mistakesData format
          if (details && details.length > 0) {
            const mistakesData = details.map(detail => {
              // Map view_type: "1" or "diagnostic" -> "Diagnostic", "2" or "screening" -> "Screening"
              const viewTypeMap: Record<string, string> = {
                '1': 'Diagnostic',
                '2': 'Screening',
                'diagnostic': 'Diagnostic',
                'screening': 'Screening',
              };
              const viewType = viewTypeMap[detail.view_type?.toString().toLowerCase()] || 'Screening';

              // Map case_type: 1 or "1" -> "Normal", 2 or "2" -> "Abnormal"
              const caseType = detail.case_type === 1 || detail.case_type === '1' ? 'Normal' : 'Abnormal';

              return {
                id: detail.case_id,
                study_instance_uid: detail.study_instance_uid,
                view_type: viewType,
                case_type: caseType,
                decision: detail.decision || '-',
                right: {
                  yours: detail.R?.studentValue || '-',
                  correct: detail.R?.facultyValue || '-',
                },
                left: {
                  yours: detail.L?.studentValue || '-',
                  correct: detail.L?.facultyValue || '-',
                },
              };
            });
            setMistakesData(mistakesData);
          }
        }
      } else {
        console.error('Failed to fetch results data:', (result as any).error);
        // Handle error - could show notification or set error state
      }
    };

    const fetchMeasurementResults = async () => {
      const body = {
        caseIds: [caseId],
      };
      const result = await apiCall(() =>
        apiService.post(
          `/user/cases/evaluation/evaluate-multi-series/${courseId}/${moduleId}/${studentId}`,
          body
        )
      );
      if (!result.success) {
        console.error('Failed to fetch measurement results:', (result as any).error);
      }
    };
    fetchResults();
    fetchMeasurementResults();
  }, [servicesManager, extensionManager, commandsManager]);

  const handleBackToWorklist = () => {
    navigate('/');
  };

  const themeBg = '#0B0A0A';
  const cardBg = '#232323';
  const borderColor = 'rgba(0, 206, 140, 0.70)';
  const gridHeaderBg = '#232323';

  const SquareDot: React.FC<{ filled?: boolean; color?: string }> = ({ filled = false, color }) => (
    <div
      className="h-3 w-3 rounded-sm border"
      style={{
        borderColor: borderColor,
        backgroundColor: filled ? color || 'hsl(var(--highlight))' : 'transparent',
      }}
    />
  );

  // Helper: determine if student interpretation is correct
  // Normal group = 1, 2 | Abnormal group = 4, 5
  // Correct if both are in the same group
  const isNormalValue = (val: string) => ['1', '2'].includes(val);
  const isAbnormalValue = (val: string) => ['4', '5'].includes(val);
  const isStudentCorrect = (studentVal: string, facultyVal: string): boolean => {
    if (isNormalValue(studentVal) && isNormalValue(facultyVal)) return true;
    if (isAbnormalValue(studentVal) && isAbnormalValue(facultyVal)) return true;
    return false;
  };

  // Get pill variant for student interpretation
  const getStudentPillVariant = (studentVal: string, facultyVal: string): 'false' | 'correct' | 'normal' => {
    if (!studentVal || studentVal === '-' || studentVal === '') return 'correct'; // golden
    if (!facultyVal || facultyVal === '-' || facultyVal === '') return 'correct'; // golden
    return isStudentCorrect(studentVal, facultyVal) ? 'normal' : 'false'; // green or red
  };

  // Get outcome pill variant based on view type and correctness
  const isEmpty = (val: string) => !val || val === '-' || val === '';

  const isSideCorrect = (yours: string, correct: string): boolean | null => {
    const yoursEmpty = isEmpty(yours);
    const correctEmpty = isEmpty(correct);
    // Both empty → both agree normal → correct
    if (yoursEmpty && correctEmpty) return true;
    // One has value, other doesn't → mismatch → incorrect
    if (yoursEmpty !== correctEmpty) return false;
    // Both have values → check group match
    return isStudentCorrect(yours, correct);
  };

  const getOutcomePillVariant = (row: any): 'false' | 'correct' | 'normal' => {
    if (row.view_type === 'Diagnostic') {
      const rightResult = isSideCorrect(row.right.yours, row.right.correct);
      const leftResult = isSideCorrect(row.left.yours, row.left.correct);
      // If any side is wrong → red
      if (rightResult === false || leftResult === false) return 'false';
      // Both sides correct → green
      return 'normal';
    } else {
      // Screening: TP/TN = green, FP/FN = red
      if (row.decision === 'TP' || row.decision === 'TN') return 'normal';
      if (row.decision === 'FP' || row.decision === 'FN') return 'false';
      return 'normal';
    }
  };

  const Pill: React.FC<{ label: string; variant?: 'false' | 'correct' | 'normal' }> = ({
    label,
    variant = 'normal',
  }) => (
    <span
      className={`min-w-10 inline-flex items-center justify-center rounded-full px-2 py-[2px] text-xs ${variant === 'false' ? 'bg-[linear-gradient(116deg,rgba(255,39,104,0.50)_7.52%,rgba(255,39,104,0.00)_89.14%)] shadow-[0_7px_21.2px_0_rgba(255,39,104,0.20)]' : variant === 'correct' ? 'bg-[linear-gradient(116deg,rgba(252,188,53,0.50)_7.52%,rgba(252,188,53,0.00)_89.14%)] shadow-[0_7px_21.2px_0_rgba(252,188,53,0.20)]' : 'bg-[linear-gradient(116deg,rgba(0,206,140,0.30)_7.52%,rgba(0,206,140,0.00)_89.14%)]'}`}
      style={{
        border: `1px solid ${variant === 'false' ? 'rgba(255, 39, 104, 0.70)' : variant === 'correct' ? 'rgba(252, 188, 53, 0.70)' : borderColor}`,
      }}
    >
      {label}
    </span>
  );

  return (
    <div
      className="relative flex h-full w-full flex-col text-white"
      style={{ backgroundColor: themeBg }}
    >
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/10 bg-[#0B0A0A] px-12 py-4">
        {/* <div className="text-sm opacity-80">mammologicum</div> */}

        <div className="flex items-center justify-between gap-4">
          <h2 className="text-center text-[20px] font-medium">Case Results</h2>
          <p className="border-l border-[#6B6C6E] pl-4 text-center text-base font-medium">
            {/* What does pathologist expect from a radiologist? - cases... */}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={handleBackToWorklist}
          className="h-8 px-3 text-sm font-medium text-white"
          style={{
            backgroundColor: 'hsl(var(--highlight))',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'hsl(var(--highlight) / 0.9)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'hsl(var(--highlight))';
          }}
        >
          Close
        </Button>
      </div>

      {/* Content */}
      <div className="relative flex flex-1 overflow-hidden bg-black">
        <div className="absolute right-[-50%] h-[677px] w-[1260px] -rotate-90 bg-[rgba(52,106,255,0.70)] blur-[300px]"></div>
        {/* Sidebar */}
        {/* <aside
          className="hidden w-64 flex-shrink-0 flex-col gap-6 p-6 md:flex"
          style={{ borderRight: `1px solid ${borderColor}` }}
        >
          <div>
            <div className="mb-3 text-sm opacity-80">Cases map</div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] opacity-60">1</span>
              <div className="grid grid-cols-10 gap-2">
                {Array.from({ length: 10 }).map((_, index) => (
                  <SquareDot
                    key={index}
                    filled={index % 3 === 0}
                  />
                ))}
              </div>
              <span className="text-[10px] opacity-60">10</span>
            </div>
          </div>

          <div>
            <div className="mb-3 text-sm opacity-80">Legend</div>
            <div className="flex flex-col gap-2 text-xs opacity-80">
              <div className="flex items-center gap-2">
                <SquareDot
                  filled
                  color="#10b981"
                />{' '}
                <span>Correct answers</span>
              </div>
              <div className="flex items-center gap-2">
                <SquareDot
                  filled
                  color="#e11d48"
                />{' '}
                <span>Mistakes</span>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-3 text-sm opacity-80">Categories selection stats</div>
            <div className="flex gap-8 text-xs">
              <div>
                <div className="mb-1">R</div>
                <div className="grid grid-cols-4 gap-2">
                  {['1', '2', '4', '5'].map(key => (
                    <Pill
                      key={`r-${key}`}
                      label={key}
                    />
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1">L</div>
                <div className="grid grid-cols-4 gap-2">
                  {['1', '2', '4', '5'].map(key => (
                    <Pill
                      key={`l-${key}`}
                      label={key}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside> */}

        {/* Main */}
        <div className="m-auto w-[1170px] max-w-full">
          <main className="relative z-10 flex-1 py-10">
            {/* Results cards */}
            <div className="mb-10">
              <div className="mb-8 grid gap-1">
                <h2 className="text-2xl font-bold text-white">Your Performance Summary</h2>
                <p className="text-lg font-medium text-white/80">
                  Quick overview of your accuracy for this case set
                </p>
              </div>
              {/* <div className="grid grid-cols-3 gap-6">
                <div className="rounded-md bg-[#0B0A0A] p-4 text-center">
                  <div className="text-lg font-semibold text-white">Specificity</div>
                  <div className="mt-2 text-2xl font-semibold">{Math.round(specificity)}%</div>
                </div>
                <div className="rounded-md bg-[#0B0A0A] p-4 text-center">
                  <div className="text-lg font-semibold text-white">Sensitivity</div>
                  <div className="mt-2 text-2xl font-semibold">{Math.round(sensitivity)}%</div>
                </div>
                <div className="rounded-md bg-[#0B0A0A] p-4 text-center">
                  <div className="text-lg font-semibold text-white">Mistakes</div>
                  <div className="mt-2 text-2xl font-semibold">{totalMistakes}</div>
                </div>
              </div> */}
              <div className="grid grid-cols-3 gap-6">
                <MetricRing
                  title="Specificity"
                  value={specificity}
                  color="#10b981"
                />

                <MetricRing
                  title="Sensitivity"
                  value={sensitivity}
                  color="#3b82f6"
                />

                <MetricRing
                  title="Accuracy"
                  value={(specificity + sensitivity) / 2} // replace with your accuracy calc
                  color="#fbbf24"
                />
              </div>
            </div>

            {/* Results matrix */}
            <div className="mb-12">
              <div className="mb-8 grid gap-1">
                <h2 className="text-2xl font-bold text-white">Decision Accuracy Matrix</h2>
                {/* <p className="text-lg font-medium text-white/80">
                  How your answers compared your diagnoses against pathology results
                </p> */}
              </div>
              <div className="overflow-x-auto">
                <div className="overflow-hidden rounded-lg border border-white/10">
                  <table className="w-full min-w-[720px] border-collapse text-[14px]">
                    <thead className="border-b border-none border-white/10 bg-[#0B0A0A]">
                      <tr>
                        <th
                          rowSpan={2}
                          className="w-48 border-r border-white/10 px-5 py-3 text-left align-middle font-medium"
                        >
                          True interpretation
                        </th>
                        <th
                          colSpan={4}
                          className="border-b border-white/10 px-5 py-3 font-medium"
                        >
                          Your interpretation
                        </th>
                      </tr>
                      <tr>
                        {['1', '2', '4', '5'].map(col => (
                          <th
                            key={col}
                            className="border-r border-white/10 px-5 py-3 text-left font-medium"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-white/10 text-left">
                        <td className="border-r border-white/10 px-5 py-3 text-left font-medium opacity-80">
                          1
                        </td>
                        <td className="px-5 py-3"></td>
                        <td className="border-r border-white/10 px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span>true-negative (TN)</span>
                            <div className="flex h-6 w-10 items-center justify-center rounded-full border border-[rgba(252,188,53,0.70)] bg-[linear-gradient(116deg,rgba(252,188,53,0.50)_7.52%,rgba(252,188,53,0.00)_89.14%)] text-sm font-medium text-white shadow-[0_7px_21.2px_0_rgba(252,188,53,0.20)]">
                              {results?.TN || 0}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3"></td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span>false-positive (FP)</span>
                            <div className="flex h-6 w-10 items-center justify-center rounded-full border border-[rgba(252,188,53,0.70)] bg-[linear-gradient(116deg,rgba(252,188,53,0.50)_7.52%,rgba(252,188,53,0.00)_89.14%)] text-sm font-medium text-white shadow-[0_7px_21.2px_0_rgba(252,188,53,0.20)]">
                              {results?.FP || 0}
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-t border-white/10 text-left">
                        <td className="border-r border-white/10 px-5 py-3 text-left font-medium opacity-80">
                          2
                        </td>
                        <td className="px-5 py-3"></td>
                        <td className="border-r border-white/10 px-5 py-3"></td>
                        <td className="px-5 py-3"></td>
                        <td className="px-5 py-3"></td>
                      </tr>
                      <tr className="border-t border-white/10 text-left">
                        <td className="border-r border-white/10 px-5 py-3 text-left font-medium opacity-80">
                          4
                        </td>
                        <td className="px-5 py-3"></td>
                        <td className="border-r border-white/10 px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span>false-negative (FN)</span>
                            <div className="flex h-6 w-10 items-center justify-center rounded-full border border-[rgba(252,188,53,0.70)] bg-[linear-gradient(116deg,rgba(252,188,53,0.50)_7.52%,rgba(252,188,53,0.00)_89.14%)] text-sm font-medium text-white shadow-[0_7px_21.2px_0_rgba(252,188,53,0.20)]">
                              {results?.FN || 0}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3"></td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span>true-positive (TP)</span>
                            <div className="flex h-6 w-10 items-center justify-center rounded-full border border-[rgba(252,188,53,0.70)] bg-[linear-gradient(116deg,rgba(252,188,53,0.50)_7.52%,rgba(252,188,53,0.00)_89.14%)] text-sm font-medium text-white shadow-[0_7px_21.2px_0_rgba(252,188,53,0.20)]">
                              {results?.TP || 0}
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-t border-white/10 text-left">
                        <td className="border-r border-white/10 px-5 py-3 text-left font-medium opacity-80">
                          5
                        </td>
                        <td className="px-5 py-3"></td>
                        <td className="border-r border-white/10 px-5 py-3"></td>
                        <td className="px-5 py-3"></td>
                        <td className="px-5 py-3"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Definitions */}
            <div className="mb-12">
              <div className="mb-8 grid gap-1">
                <h2 className="text-2xl font-bold text-white">How to Read Your Results</h2>
                {/* <p className="text-lg font-medium text-white/80">
                  How your answers compared your diagnoses against pathology results
                </p> */}
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-[16px] border border-[rgba(255,255,255,0.15)] bg-[linear-gradient(124deg,#1C1C1C_0%,#0B0A0A_99.91%)] p-6 shadow-[0_12px_71.8px_0_rgba(0,0,0,0.50)]">
                  <div className="grid grid-cols-[24px_auto] gap-4">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00CE8C] shadow-[0_7px_32.5px_0_rgba(13,174,122,0.50)]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="17"
                        height="17"
                        viewBox="0 0 17 17"
                        fill="none"
                      >
                        <path
                          d="M14.1305 4.23914L6.35878 12.0109L2.82617 8.47827"
                          stroke="white"
                          stroke-width="1.17754"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="grid">
                      <div className="mb-2 text-[18px] font-medium">Specificity</div>
                      <div className="text-base text-white/80">
                        Percentage of true-negative answers relative to the total number of
                        true-negatives and false-positives
                      </div>
                      <div className="mt-3 text-base">
                        <span className="font-medium">Specificity = TN / (TN + FP)</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-[16px] border border-[rgba(255,255,255,0.15)] bg-[linear-gradient(124deg,#1C1C1C_0%,#0B0A0A_99.91%)] p-6 shadow-[0_12px_71.8px_0_rgba(0,0,0,0.50)]">
                  <div className="grid grid-cols-[24px_auto] gap-4">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00CE8C] shadow-[0_7px_32.5px_0_rgba(13,174,122,0.50)]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="17"
                        height="17"
                        viewBox="0 0 17 17"
                        fill="none"
                      >
                        <path
                          d="M14.1305 4.23914L6.35878 12.0109L2.82617 8.47827"
                          stroke="white"
                          stroke-width="1.17754"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="grid">
                      <div className="mb-2 text-[18px] font-medium">Sensitivity</div>
                      <div className="text-base text-white/80">
                        Percentage of true-positive answers relative to the total number of
                        true-positives and false-negatives
                      </div>
                      <div className="mt-3 text-base">
                        <span className="font-medium">Sensitivity = TP / (TP + FN)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mistakes */}

            <div className="mb-8">
              <div className="mb-8 grid gap-1">
                <h2 className="text-2xl font-bold text-white">Case Review Breakdown</h2>
                <p className="text-lg font-medium text-white/80">
                  How your answers compared against expected answers
                </p>
              </div>
              <div className="overflow-x-auto">
                <div className="overflow-hidden rounded-lg border border-white/10">
                  <table className="w-full min-w-[1000px] border-collapse text-[14px]">
                    <thead className="border-b border-none border-white/10 bg-[#0B0A0A]">
                      <tr>
                        <th className="px-5 py-3 text-left font-medium">Case</th>
                        <th className="px-5 py-3 text-left font-medium">Case Type</th>
                        <th className="px-5 py-3 text-left font-medium">
                          Right side
                          <div className="text-[10px] text-white/80">Your Interpretation / Correct Interpretation</div>
                        </th>
                        <th className="px-5 py-3 text-left font-medium">
                          Left side
                          <div className="text-[10px] text-white/80">Your Interpretation / Correct Interpretation</div>
                        </th>
                        <th className="px-5 py-3 text-left font-medium">Pathology</th>
                        <th className="px-5 py-3 text-left font-medium">Outcome</th>
                        <th className="px-5 py-3 text-left font-medium">Go to case</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* {mistakesData.map(row => (
                        <tr
                          key={row.id}
                          className="border-t"

                        >
                          <td className="p-3">{row.id}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Pill
                                label={row.right.yours}
                                variant={
                                  row.right.yours === row.right.correct ? 'correct' : 'false'
                                }
                              />
                              <span >/</span>
                              <Pill
                                label={row.right.correct}
                                variant={'normal'}
                              />
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Pill
                                label={row.left.yours}
                                variant={row.left.yours === row.left.correct ? 'correct' : 'false'}
                              />
                              <span >/</span>
                              <Pill
                                label={row.left.correct}
                                variant={'normal'}
                              />
                            </div>
                          </td>
                          <td className="p-3 capitalize opacity-80">{row.type}</td>
                          <td className="p-3">
                            <Button
                              variant="default"
                              className="h-7 px-3 text-xs text-white"
                              style={{
                                backgroundColor: 'hsl(var(--highlight))',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.backgroundColor =
                                  'hsl(var(--highlight) / 0.9)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.backgroundColor = 'hsl(var(--highlight))';
                              }}
                              onClick={() => {
                                const currentParams = new URLSearchParams(window.location.search);
                                const encryptedData = currentParams.get('data');
                                const decryptedData = decryptObject(encryptedData);
                                const data = {
                                  ...decryptedData,
                                  caseId: row.id,
                                };
                                currentParams.set('data', encryptObject(data));
                                const encryptedUid = encrypt(row.study_instance_uid || '');
                                currentParams.set('StudyInstanceUIDs', encryptedUid);
                                currentParams.set('isPreview', 'true');

                                // Navigate to results page with same query params
                                navigate({
                                  pathname: '/viewer',
                                  search: currentParams.toString(),
                                });
                              }}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))} */}
                      {mistakesData.map(row => (
                        <tr
                          key={row.id}
                          className="border-t border-white/10"
                        >
                          <td className="px-5 py-3">{row.id}</td>
                          <td className="px-5 py-3">{row.view_type || '-'}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <Pill
                                label={row.right.yours || '-'}
                                variant={getStudentPillVariant(row.right.yours, row.right.correct)}
                              />
                              <span>/</span>
                              <Pill
                                label={row.right.correct || '-'}
                                variant={'correct'}
                              />
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <Pill
                                label={row.left.yours || '-'}
                                variant={getStudentPillVariant(row.left.yours, row.left.correct)}
                              />
                              <span>/</span>
                              <Pill
                                label={row.left.correct || '-'}
                                variant={'correct'}
                              />
                            </div>
                          </td>
                          <td className="px-5 py-3">{row.case_type || '-'}</td>
                          <td className="px-5 py-3">
                            <Pill
                              label={
                                row.view_type === 'Diagnostic'
                                  ? '-'
                                  : row.decision || '-'
                              }
                              variant={getOutcomePillVariant(row)}
                            />
                          </td>
                          <td className="px-5 py-3">
                            <Button
                              variant="default"
                              className="h-auto rounded-lg bg-[#FF2768] px-3 py-1 text-base text-white hover:bg-[#FF2768]/90"
                              onClick={() => {
                                const currentParams = new URLSearchParams(window.location.search);
                                const encryptedData = currentParams.get('data');
                                const decryptedData = decryptObject(encryptedData);
                                const data = {
                                  ...decryptedData,
                                  caseId: row.id,
                                };
                                currentParams.set('data', encryptObject(data));
                                const encryptedUid = encrypt(row.study_instance_uid || '');
                                currentParams.set('StudyInstanceUIDs', encryptedUid);
                                currentParams.set('isPreview', 'true');

                                // Navigate to results page with same query params
                                navigate({
                                  pathname: '/viewer',
                                  search: currentParams.toString(),
                                });
                              }}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Results;
