/* eslint-disable */
// platform/app/src/routes/Results/Results.tsx
import { apiCall, apiService, getCustomParams } from '@ohif/core';
import { Button } from '@ohif/ui-next';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
        apiService.get(`/evaluation/measurement/${courseId}/${moduleId}/${studentId}`)
      );

      if (result.success) {
        console.log('response', result.data);
        const { data } = result.data as { data: any };
        if (data) {
          const { counts, details } = data.evaluation;
          setTotalMistakes(counts?.mistakes || 0);

          const combinedMetrics = {
            specificity:
              (data.evaluation.metrics.R.specificity + data.evaluation.metrics.L.specificity) / 2,
            sensitivity:
              (data.evaluation.metrics.R.sensitivity + data.evaluation.metrics.L.sensitivity) / 2,
          };
          setSensitivity(combinedMetrics.sensitivity);
          setSpecificity(combinedMetrics.specificity);
          // Calculate sum of both L and R counts
          const totalCounts = {
            TN: (counts.R?.TN || 0) + (counts.L?.TN || 0),
            FP: (counts.R?.FP || 0) + (counts.L?.FP || 0),
            TP: (counts.R?.TP || 0) + (counts.L?.TP || 0),
            FN: (counts.R?.FN || 0) + (counts.L?.FN || 0),
          };
          setResults(totalCounts);

          // Transform API data to mistakesData format
          if (details && details.length > 0) {
            const mistakesData = details.map(detail => ({
              id: detail.case_id,
              study_instance_uid: detail.study_instance_uid,
              right: {
                yours: detail.R.studentValue,
                correct: detail.R.facultyValue,
              },
              left: {
                yours: detail.L.studentValue,
                correct: detail.L.facultyValue,
              },
            }));
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
          `/evaluation/evaluate-multi-series/${courseId}/${moduleId}/${studentId}`,
          body
        )
      );
      if (result.success) {
        console.log('measurement results', result.data);
      } else {
        console.error('Failed to fetch measurement results:', (result as any).error);
      }
    };
    fetchResults();
    fetchMeasurementResults();
  }, [servicesManager, extensionManager, commandsManager]);

  const handleBackToWorklist = () => {
    navigate('/');
  };

  const themeBg = 'rgba(4, 28, 74, 1)';
  const cardBg = 'rgba(4, 28, 74, 0.8)';
  const borderColor = 'rgba(255, 255, 255, 0.12)';
  const gridHeaderBg = 'rgba(255, 255, 255, 0.06)';

  const SquareDot: React.FC<{ filled?: boolean; color?: string }> = ({ filled = false, color }) => (
    <div
      className="h-3 w-3 rounded-sm border"
      style={{
        borderColor: borderColor,
        backgroundColor: filled ? color || '#e11d48' : 'transparent',
      }}
    />
  );

  const Pill: React.FC<{ label: string; variant?: 'false' | 'correct' | 'normal' }> = ({
    label,
    variant = 'normal',
  }) => (
    <span
      className="inline-flex min-w-[28px] items-center justify-center rounded-full px-2 py-[2px] text-xs"
      style={{
        backgroundColor: cardBg,
        border: `1px solid ${variant === 'false' ? '#ec4899' : variant === 'correct' ? '#8b5cf6' : 'rgba(255, 255, 255, 0.3)'}`,
      }}
    >
      {label}
    </span>
  );

  return (
    <div
      className="flex h-full w-full flex-col text-white"
      style={{ backgroundColor: themeBg }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: `1px solid ${borderColor}` }}
      >
        {/* <div className="text-sm opacity-80">mammologicum</div> */}
        <div className="text-center text-lg font-bold">Results</div>
        <Button
          variant="secondary"
          onClick={handleBackToWorklist}
          className="h-8 px-3 text-sm"
        >
          Close
        </Button>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
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
                <div className="grid grid-cols-5 gap-2">
                  {['1', '2', '4a', '4b', '5'].map(key => (
                    <Pill
                      key={`r-${key}`}
                      label={key}
                    />
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1">L</div>
                <div className="grid grid-cols-5 gap-2">
                  {['1', '2', '4a', '4b', '5'].map(key => (
                    <Pill
                      key={`l-${key}`}
                      label={key}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Results cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 md:max-w-md">
            <div
              className="rounded-md p-4"
              style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
            >
              <div className="text-xs opacity-80">Specificity</div>
              <div className="mt-2 text-2xl font-semibold">{Math.round(specificity)}%</div>
            </div>
            <div
              className="rounded-md p-4"
              style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
            >
              <div className="text-xs opacity-80">Sensitivity</div>
              <div className="mt-2 text-2xl font-semibold">{Math.round(sensitivity)}%</div>
            </div>
            <div
              className="rounded-md p-4"
              style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
            >
              <div className="text-xs opacity-80">Mistakes</div>
              <div className="mt-2 text-2xl font-semibold">{totalMistakes}</div>
            </div>
          </div>

          {/* Results matrix */}
          <div className="mb-8">
            <div className="mb-3 text-sm opacity-80">Results matrix</div>
            <div
              className="overflow-x-auto rounded-md"
              style={{ border: `1px solid ${borderColor}` }}
            >
              <table className="w-full min-w-[800px] text-center text-xs">
                <thead style={{ backgroundColor: gridHeaderBg }}>
                  <tr>
                    <th
                      rowSpan={2}
                      className="w-32 border-r p-3 text-left align-middle font-medium opacity-80"
                      style={{ borderColor }}
                    >
                      True category
                    </th>
                    <th
                      colSpan={5}
                      className="border-b p-3 font-medium opacity-80"
                      style={{ borderColor }}
                    >
                      Your answer
                    </th>
                  </tr>
                  <tr>
                    {['1', '2', '4a', '4b', '5'].map(col => (
                      <th
                        key={col}
                        className="border-r p-3 font-medium"
                        style={{ borderColor }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr
                    className="border-t"
                    style={{ borderColor }}
                  >
                    <td
                      className="border-r p-3 text-left font-medium opacity-80"
                      style={{ borderColor }}
                    >
                      1
                    </td>
                    <td
                      className="border-r p-4"
                      style={{ borderColor }}
                    ></td>
                    <td
                      className="border-r p-4 text-xs opacity-70"
                      style={{ borderColor }}
                    >
                      true-negative (TN)
                      <div
                        className="mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white"
                        style={{ backgroundColor: '#ec4899' }}
                      >
                        {results?.TN || 0}
                      </div>
                    </td>
                    <td
                      className="border-r p-4"
                      style={{ borderColor }}
                    ></td>
                    <td
                      className="border-r p-4"
                      style={{ borderColor }}
                    ></td>
                    <td className="p-4 text-xs opacity-70">
                      false-positive (FP){' '}
                      <div
                        className="mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white"
                        style={{ backgroundColor: '#ec4899' }}
                      >
                        {results?.FP || 0}
                      </div>
                    </td>
                  </tr>
                  <tr
                    className="border-t"
                    style={{ borderColor }}
                  >
                    <td
                      className="border-r p-3 text-left font-medium opacity-80"
                      style={{ borderColor }}
                    >
                      2
                    </td>
                    <td
                      className="border-r p-4"
                      style={{ borderColor }}
                    ></td>
                    <td
                      className="border-r p-4"
                      style={{ borderColor }}
                    ></td>
                    <td
                      className="border-r p-4"
                      style={{ borderColor }}
                    ></td>
                    <td
                      className="border-r p-4"
                      style={{ borderColor }}
                    ></td>
                    <td className="p-4"></td>
                  </tr>
                  <tr
                    className="border-t"
                    style={{ borderColor }}
                  >
                    <td
                      className="border-r p-3 text-left font-medium opacity-80"
                      style={{ borderColor }}
                    >
                      4a
                    </td>
                    <td
                      className="border-r p-4"
                      style={{ borderColor }}
                    ></td>
                    <td
                      className="border-r p-4"
                      style={{ borderColor }}
                    ></td>
                    <td
                      className="border-r p-4"
                      style={{ borderColor }}
                    ></td>
                    <td
                      className="border-r p-4"
                      style={{ borderColor }}
                    ></td>
                    <td className="p-4"></td>
                  </tr>
                  <tr
                    className="border-t"
                    style={{ borderColor }}
                  >
                    <td
                      className="border-r p-3 text-left font-medium opacity-80"
                      style={{ borderColor }}
                    >
                      4b
                    </td>
                    <td
                      className="border-r p-4"
                      style={{ borderColor }}
                    ></td>
                    <td
                      className="border-r p-4 text-xs opacity-70"
                      style={{ borderColor }}
                    >
                      false-negative (FN){' '}
                      <div
                        className="mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white"
                        style={{ backgroundColor: '#8b5cf6' }}
                      >
                        {results?.FN || 0}
                      </div>
                    </td>
                    <td
                      className="border-r p-4"
                      style={{ borderColor }}
                    ></td>
                    <td
                      className="border-r p-4"
                      style={{ borderColor }}
                    ></td>
                    <td className="p-4 text-xs opacity-70">
                      true-positive (TP){' '}
                      <div
                        className="mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white"
                        style={{ backgroundColor: '#8b5cf6' }}
                      >
                        {results?.TP || 0}
                      </div>
                    </td>
                  </tr>
                  <tr
                    className="border-t"
                    style={{ borderColor }}
                  >
                    <td
                      className="border-r p-3 text-left font-medium opacity-80"
                      style={{ borderColor }}
                    >
                      5
                    </td>
                    <td
                      className="border-r p-4"
                      style={{ borderColor }}
                    ></td>
                    <td
                      className="border-r p-4"
                      style={{ borderColor }}
                    ></td>
                    <td
                      className="border-r p-4"
                      style={{ borderColor }}
                    ></td>
                    <td
                      className="border-r p-4"
                      style={{ borderColor }}
                    ></td>
                    <td className="p-4"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Definitions */}
          <div className="mb-8 grid gap-6 md:max-w-3xl md:grid-cols-2">
            <div
              className="rounded-md p-4"
              style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
            >
              <div className="mb-2 text-sm font-semibold">Specificity</div>
              <div className="text-xs opacity-80">
                percentage of true-negative answers relative to the total number of true-negatives
                and false-positives:
              </div>
              <div className="mt-3 text-xs">
                <span className="font-semibold">Specificity = TN / (TN + FP)</span>
              </div>
            </div>
            <div
              className="rounded-md p-4"
              style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
            >
              <div className="mb-2 text-sm font-semibold">Sensitivity</div>
              <div className="text-xs opacity-80">
                percentage of true-positive answers relative to the total number of true-positives
                and false-negatives:
              </div>
              <div className="mt-3 text-xs">
                <span className="font-semibold">Sensitivity = TP / (TP + FN)</span>
              </div>
            </div>
          </div>

          {/* Mistakes */}
          <div className="md:max-w-4xl">
            <div className="mb-3 text-sm">Mistakes</div>
            <div
              className="overflow-x-auto rounded-md"
              style={{ border: `1px solid ${borderColor}` }}
            >
              <table className="w-full min-w-[720px] text-xs">
                <thead style={{ backgroundColor: gridHeaderBg }}>
                  <tr>
                    <th className="p-3 text-left font-medium">Case</th>
                    <th className="p-3 text-left font-medium">
                      Right side
                      <div className="text-[10px] opacity-60">your answer / correct</div>
                    </th>
                    <th className="p-3 text-left font-medium">
                      Left side
                      <div className="text-[10px] opacity-60">your answer / correct</div>
                    </th>
                    <th className="p-3 text-left font-medium">Pathology Type</th>
                    <th className="p-3 text-left font-medium">Go to case</th>
                  </tr>
                </thead>
                <tbody>
                  {mistakesData.map(row => (
                    <tr
                      key={row.id}
                      className="border-t"
                      style={{ borderColor }}
                    >
                      <td className="p-3">{row.id}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Pill
                            label={row.right.yours}
                            variant={row.right.yours === row.right.correct ? 'correct' : 'false'}
                          />
                          <span className="opacity-60">/</span>
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
                          <span className="opacity-60">/</span>
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
                          className="h-7 px-3 text-xs"
                          onClick={() => {
                            const currentParams = new URLSearchParams(window.location.search);
                            currentParams.set('caseId', row.id);
                            currentParams.set('StudyInstanceUIDs', row.study_instance_uid);
                            currentParams.set('isPreview', 'true');

                            console.log('currentParams =====>', currentParams.toString());

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
        </main>
      </div>
    </div>
  );
};

export default Results;
