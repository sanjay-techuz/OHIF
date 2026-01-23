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
  subtitle: string;
  color: string;
}> = ({ title, value, subtitle, color }) => {
  const size = 160;
  const strokeWidth = 30;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <div className="flex flex-col items-center rounded-xl bg-[#0B0A0A] px-6 py-5 shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
      <div className="mb-3 text-lg font-semibold text-white">{title}</div>

      <div className="relative">
        <svg
          width={size}
          height={size}
          className="-rotate-90"
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            className="fill-none stroke-white/10"
          />

          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth="15"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="fill-none transition-all duration-700 ease-out"
            style={{ stroke: color }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="text-sm font-medium text-white/80">{subtitle}</div>
          <div className="mt-1 text-2xl font-semibold text-white">{Math.round(value)}%</div>
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
          `/user/cases/evaluation/evaluate-multi-series/${courseId}/${moduleId}/${studentId}`,
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

  const themeBg = '#0B0A0A';
  const cardBg = '#232323';
  const borderColor = '#6B6C6E';
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

  const Pill: React.FC<{ label: string; variant?: 'false' | 'correct' | 'normal' }> = ({
    label,
    variant = 'normal',
  }) => (
    <span
      className="inline-flex min-w-[28px] items-center justify-center rounded-full px-2 py-[2px] text-xs"
      style={{
        backgroundColor: cardBg,
        border: `1px solid ${variant === 'false' ? 'hsl(var(--highlight))' : variant === 'correct' ? '#10b981' : borderColor}`,
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
      <div className="flex items-center justify-between border-b border-white/10 bg-[#0B0A0A] px-12 py-4">
        {/* <div className="text-sm opacity-80">mammologicum</div> */}

        <div className="flex items-center justify-between gap-4">
          <h2 className="text-center text-[20px] font-medium">Case Results</h2>
          <p className="border-l border-[#6B6C6E] pl-4 text-center text-base font-medium">
            What does pathologist expect from a radiologist? - cases...
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
      <div className="flex flex-1 bg-black">
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
        </aside> */}

        {/* Main */}
        <div className="m-auto w-[1170px] max-w-full">
          <main className="flex-1 overflow-y-auto py-10">
            {/* Results cards */}
            <div className="mb-10">
              <div className="mb-8 grid gap-1">
                <h2 className="text-2xl font-bold text-white">Your Performance Summary</h2>
                <p className="text-lg font-medium text-white/80">
                  Quick overview of your diagnostic accuracy of this case set
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
                  subtitle="True-negatives"
                  value={specificity}
                  color="#10b981"
                />

                <MetricRing
                  title="Sensitivity"
                  subtitle="True-positives"
                  value={sensitivity}
                  color="#3b82f6"
                />

                <MetricRing
                  title="Accuracy"
                  subtitle="Critical Miss"
                  value={50} // replace with your accuracy calc
                  color="#fbbf24"
                />
              </div>
            </div>

            {/* Results matrix */}
            <div className="mb-12">
              <div className="mb-8 grid gap-1">
                <h2 className="text-2xl font-bold text-white">Decision Accuracy Matrix</h2>
                <p className="text-lg font-medium text-white/80">
                  How your answers compared your diagnoses against pathology results
                </p>
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
                          True category
                        </th>
                        <th
                          colSpan={5}
                          className="border-b border-white/10 px-5 py-3 font-medium"
                        >
                          Your answer
                        </th>
                      </tr>
                      <tr>
                        {['1', '2', '4a', '4b', '5'].map(col => (
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
                            <div className="flex h-5 w-8 items-center justify-center rounded-full bg-[#FF2768]/60 text-sm font-medium text-white">
                              {results?.TN || 0}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3"></td>
                        <td className="px-5 py-3"></td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span>false-positive (FP)</span>
                            <div className="flex h-5 w-8 items-center justify-center rounded-full bg-[#FF2768]/60 text-sm font-medium text-white">
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
                        <td className="px-5 py-3"></td>
                      </tr>
                      <tr className="border-t border-white/10 text-left">
                        <td className="border-r border-white/10 px-5 py-3 text-left font-medium opacity-80">
                          4a
                        </td>
                        <td className="px-5 py-3"></td>
                        <td className="border-r border-white/10 px-5 py-3"></td>
                        <td className="px-5 py-3"></td>
                        <td className="px-5 py-3"></td>
                        <td className="px-5 py-3"></td>
                      </tr>
                      <tr className="border-t border-white/10 text-left">
                        <td className="border-r border-white/10 px-5 py-3 text-left font-medium opacity-80">
                          4b
                        </td>
                        <td className="px-5 py-3"></td>
                        <td className="border-r border-white/10 px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span>false-negative (FN)</span>
                            <div
                              className="flex h-5 w-8 items-center justify-center rounded-full text-sm font-medium text-white"
                              style={{ backgroundColor: '#10b981' }}
                            >
                              {results?.FN || 0}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3"></td>
                        <td className="px-5 py-3"></td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span>true-positive (TP)</span>
                            <div
                              className="flex h-5 w-8 items-center justify-center rounded-full text-sm font-medium text-white"
                              style={{ backgroundColor: '#10b981' }}
                            >
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
                <p className="text-lg font-medium text-white/80">
                  How your answers compared your diagnoses against pathology results
                </p>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-lg bg-[#0B0A0A] p-6">
                  <div className="mb-2 text-xl font-medium">Specificity</div>
                  <div className="text-base text-white/80">
                    percentage of true-negative answers relative to the total number of
                    true-negatives and false-positives:
                  </div>
                  <div className="mt-3 text-base">
                    <span className="font-medium">Specificity = TN / (TN + FP)</span>
                  </div>
                </div>
                <div className="rounded-lg bg-[#0B0A0A] p-6">
                  <div className="mb-2 text-xl font-medium">Sensitivity</div>
                  <div className="text-base text-white/80">
                    percentage of true-positive answers relative to the total number of
                    true-positives and false-negatives:
                  </div>
                  <div className="mt-3 text-base">
                    <span className="font-medium">Sensitivity = TP / (TP + FN)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mistakes */}

            <div className="mb-8">
              <div className="mb-8 grid gap-1">
                <h2 className="text-2xl font-bold text-white">Case Review Breakdown</h2>
                <p className="text-lg font-medium text-white/80">
                  How your answers compared your diagnoses against pathology results
                </p>
              </div>
              <div className="overflow-x-auto">
                <div className="overflow-hidden rounded-lg border border-white/10">
                  <table className="w-full min-w-[720px] border-collapse text-[14px]">
                    <thead className="border-b border-none border-white/10 bg-[#0B0A0A]">
                      <tr>
                        <th className="px-5 py-3 text-left font-medium">Case</th>
                        <th className="px-5 py-3 text-left font-medium">
                          Right side
                          <div className="text-[10px] text-white/80">your answer / correct</div>
                        </th>
                        <th className="px-5 py-3 text-left font-medium">
                          Left side
                          <div className="text-[10px] text-white/80">your answer / correct</div>
                        </th>
                        <th className="px-5 py-3 text-left font-medium">Pathology Type</th>
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
                      <tr className="border-t border-white/10">
                        <td className="px-5 py-3">8</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <Pill label={'2'} />
                            <span>/</span>
                            <Pill
                              label={'8'}
                              variant={'normal'}
                            />
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <Pill
                              label={'8'}
                              variant={'normal'}
                            />
                            <span>/</span>
                            <Pill
                              label={'8'}
                              variant={'normal'}
                            />
                          </div>
                        </td>
                        <td className="px-5 py-3 capitalize">fsadf</td>
                        <td className="px-5 py-3">
                          <Button
                            variant="default"
                            className="h-7 bg-[#FF2768] px-3 text-xs text-white hover:bg-[#FF2768]/90"
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                      <tr className="border-t border-white/10">
                        <td className="px-5 py-3">8</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <Pill label={'2'} />
                            <span>/</span>
                            <Pill
                              label={'8'}
                              variant={'normal'}
                            />
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <Pill
                              label={'8'}
                              variant={'normal'}
                            />
                            <span>/</span>
                            <Pill
                              label={'8'}
                              variant={'normal'}
                            />
                          </div>
                        </td>
                        <td className="px-5 py-3 capitalize">fsadf</td>
                        <td className="px-5 py-3">
                          <Button
                            variant="default"
                            className="h-7 bg-[#FF2768] px-3 text-xs text-white hover:bg-[#FF2768]/90"
                          >
                            View
                          </Button>
                        </td>
                      </tr>
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
