/**
 * @author Sanjay Balai
 * @description Lexa AI reporting panel — slide-up panel that sits ABOVE the
 * OHIF bottom header (66.5px tall) so the bottom toolbar is never covered.
 * Two modes ('generate' | 'correct'); the backend proxy at
 * /user/cases/lexa/report (student) or /admin/cases/lexa/report (faculty)
 * does all the Gemini work.
 *
 * Form styling mirrors the existing QuestionAnswerModal so the Lexa form
 * looks like a first-class part of the viewer (same Select component, same
 * border/radius, same label typography).
 */

import { apiCall, apiService } from '@ohif/core';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../Select';
import LexaReportOutput from './LexaReportOutput';

// Height of the OHIF bottom toolbar (`h-[66.5px]` in ViewerLayout). The
// panel must stop above this so the toolbar stays visible/usable.
const BOTTOM_BAR_HEIGHT = 66.5;

const FIELD_BASE_STYLE: React.CSSProperties = {
  borderRadius: '8px',
  border: '1px solid #4F4F4F',
  boxShadow: '0 1px 2px 0 rgba(10, 13, 18, 0.05)',
  fontFamily: 'inherit',
};

export type LexaMode = 'generate' | 'correct';
export type LexaModality = 'MG' | 'DBT' | 'US' | 'MRI' | 'CEM';
export type LexaScenario =
  | 'Routine Screening'
  | 'High-Risk Screening'
  | 'Diagnostic Evaluation'
  | 'Post-Biopsy / Staging';

export interface LexaReportingPanelProps {
  open: boolean;
  mode: LexaMode;
  onClose: () => void;
  /** 'student' or 'faculty' — controls which backend route is hit. */
  userType: 'student' | 'faculty' | string;
  /** Slug from useUIStateStore — drives default modality. */
  modalitySlug?: string | null;
  /** Auto-composed key findings (BI-RADS form + ACR + view type + ROIs), passed in. */
  defaultKeyFindings?: string;
  /** Optional default scenario (Diagnostic vs Screening view). */
  defaultScenario?: LexaScenario;
  /** Case label from caseList[currentCaseIndex].case_title (or caseId fallback). */
  defaultCaseName?: string;
  /** PatientAge digits stripped from DICOM (e.g. "045Y" → "45"). */
  defaultPatientAge?: string;
  /** "Male" / "Female" / "Other" — already mapped from DICOM PatientSex. */
  defaultPatientSex?: string;
}

const ALL_MODALITIES: LexaModality[] = ['MG', 'DBT', 'US', 'MRI', 'CEM'];
const ALL_SCENARIOS: LexaScenario[] = [
  'Routine Screening',
  'High-Risk Screening',
  'Diagnostic Evaluation',
  'Post-Biopsy / Staging',
];

// OHIF Zustand modality slugs → Lexa modality codes.
const slugToModality = (slug?: string | null): LexaModality => {
  if (!slug) return 'MG';
  const s = String(slug).toUpperCase();
  if (s === 'DBT') return 'DBT';
  if (s === 'US' || s === 'US_BREAST') return 'US';
  if (s === 'MR' || s === 'MRI' || s === 'MRI_BREAST') return 'MRI';
  if (s === 'CEM') return 'CEM';
  return 'MG';
};

// ---------- Reusable styled field shells ----------

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="text-primary-light text-base">{children}</label>
);

const Dropdown: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}> = ({ value, onChange, options, placeholder }) => (
  <Select value={value || undefined} onValueChange={onChange}>
    <SelectTrigger className="w-full" style={FIELD_BASE_STYLE}>
      <SelectValue placeholder={placeholder || 'Select'} />
    </SelectTrigger>
    {/* SelectContent ships with z-50 baked in, but the panel backdrop also
        runs at z-[55]+, so without an explicit override the dropdown opens
        BEHIND the backdrop and looks invisible. Force it above the panel. */}
    <SelectContent className="z-[70]">
      {options.map(option => (
        <SelectItem key={option} value={option}>
          {option}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const TextInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}> = ({ value, onChange, placeholder, maxLength }) => (
  <input
    type="text"
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    maxLength={maxLength}
    className="flex w-full items-center bg-transparent px-3 py-3 text-base text-white placeholder:text-white/30 focus:outline-none focus:ring-0"
    style={FIELD_BASE_STYLE}
  />
);

const TextArea: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}> = ({ value, onChange, placeholder, rows = 3 }) => (
  <textarea
    value={value}
    onChange={e => onChange(e.target.value)}
    rows={rows}
    placeholder={placeholder}
    className="mt-1.5 w-full resize-none rounded-lg border border-[#4F4F4F] bg-transparent px-3 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-0"
    style={{ fontFamily: 'inherit', fontSize: '1rem' }}
  />
);

// Three-dot bouncing typing indicator (ChatGPT/Gemini style). Pure CSS via
// Tailwind `animate-bounce` utility with staggered delays.
const TypingIndicator: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-10">
    <div className="flex items-end gap-1.5">
      <span
        className="block h-2.5 w-2.5 animate-bounce rounded-full bg-white"
        style={{ animationDelay: '0ms', animationDuration: '1.2s' }}
      />
      <span
        className="block h-2.5 w-2.5 animate-bounce rounded-full bg-white"
        style={{ animationDelay: '150ms', animationDuration: '1.2s' }}
      />
      <span
        className="block h-2.5 w-2.5 animate-bounce rounded-full bg-white"
        style={{ animationDelay: '300ms', animationDuration: '1.2s' }}
      />
    </div>
    <p className="text-primary-light mt-4 text-sm opacity-70">Lexa is generating your report…</p>
  </div>
);

// ---------- Component ----------

const LexaReportingPanel: React.FC<LexaReportingPanelProps> = ({
  open,
  mode,
  onClose,
  userType,
  modalitySlug,
  defaultKeyFindings = '',
  defaultScenario = 'Diagnostic Evaluation',
  defaultCaseName = '',
  defaultPatientAge = '',
  defaultPatientSex = '',
}) => {
  const initialModality = useMemo(() => slugToModality(modalitySlug), [modalitySlug]);

  const [caseName, setCaseName] = useState<string>(defaultCaseName);
  const [patientAge, setPatientAge] = useState<string>(defaultPatientAge);
  const [patientSex, setPatientSex] = useState<string>(defaultPatientSex);
  const [modality, setModality] = useState<LexaModality>(initialModality);
  const [scenario, setScenario] = useState<LexaScenario>(defaultScenario);
  const [subScenario, setSubScenario] = useState<string>('');
  const [keyFindings, setKeyFindings] = useState<string>(defaultKeyFindings);
  const [additionalDetails, setAdditionalDetails] = useState<string>('');
  const [previousReport, setPreviousReport] = useState<string>('');
  const [reportText, setReportText] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<any>(null);

  // Auto-fill defaults arriving asynchronously (DICOM metadata, ROI form
  // data, etc.). The previous "fill if empty" rule was too sticky: once the
  // panel saw an early/partial default (e.g. "Diagnostic study." computed
  // before modality + ROI data had loaded), it locked the textarea to that
  // value forever. We now remember the LAST default we applied per field;
  // if the user hasn't edited away from it, fresh defaults replace the old
  // ones, while genuine user edits are preserved verbatim.
  const lastDefaultCaseName = useRef<string | null>(null);
  const lastDefaultPatientAge = useRef<string | null>(null);
  const lastDefaultPatientSex = useRef<string | null>(null);
  const lastDefaultKeyFindings = useRef<string | null>(null);

  const syncFromDefault = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    lastRef: React.MutableRefObject<string | null>,
    nextDefault: string,
  ) => {
    if (!nextDefault) return;
    setter(prev => {
      // First time we see a default → fill if empty.
      if (lastRef.current === null) {
        lastRef.current = nextDefault;
        return prev || nextDefault;
      }
      // User hasn't edited away from the previously-applied default →
      // replace with the new default.
      if (prev === lastRef.current || prev === '') {
        lastRef.current = nextDefault;
        return nextDefault;
      }
      // User has typed their own value — preserve it but track the latest
      // default so a future revert (clearing the field) re-engages auto-fill.
      lastRef.current = nextDefault;
      return prev;
    });
  };

  useEffect(() => {
    syncFromDefault(setCaseName, lastDefaultCaseName, defaultCaseName);
  }, [defaultCaseName]);
  useEffect(() => {
    syncFromDefault(setPatientAge, lastDefaultPatientAge, defaultPatientAge);
  }, [defaultPatientAge]);
  useEffect(() => {
    syncFromDefault(setPatientSex, lastDefaultPatientSex, defaultPatientSex);
  }, [defaultPatientSex]);
  useEffect(() => {
    syncFromDefault(setKeyFindings, lastDefaultKeyFindings, defaultKeyFindings);
  }, [defaultKeyFindings]);

  // Modality is loaded async from the case API and arrives AFTER the panel
  // first mounts (the panel is always mounted; only `open` toggles its
  // visibility). Without this effect, the initial useState call sees
  // modalitySlug=null and locks in 'MG' even when the case is MR/US/etc.
  // Re-sync on every change — case navigation also flows through here.
  useEffect(() => {
    if (modalitySlug) setModality(slugToModality(modalitySlug));
  }, [modalitySlug]);

  // Panel stays mounted across close/open so form inputs and the generated
  // report aren't wiped. We toggle visibility via CSS instead of unmounting.

  const endpoint = userType === 'faculty' ? '/admin/cases/lexa/report' : '/user/cases/lexa/report';

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    setResponse(null);
    try {
      const patient: Record<string, string> = {};
      if (caseName.trim()) patient.name = caseName.trim();
      if (patientAge.trim()) patient.age = patientAge.trim();
      if (patientSex && ['Male', 'Female', 'Other'].includes(patientSex)) {
        patient.sex = patientSex;
      }

      const body: Record<string, unknown> = {
        mode,
        modality,
        scenario,
        subScenario: subScenario.trim() || undefined,
        keyFindings,
        additionalClinicalDetails: additionalDetails.trim() || undefined,
        previousReport: previousReport.trim() || undefined,
        patient: Object.keys(patient).length ? patient : undefined,
      };
      if (mode === 'correct') {
        body.reportText = reportText.trim();
      }

      // The default OHIF axios timeout is 30s, but Gemini "generate" can take
      // 30–60s and "correct" runs up to 5 parallel calls (~90s upstream). The
      // backend caps each Gemini call at 90s, so 3 minutes is a safe ceiling
      // for the round-trip including network + JSON parse.
      const result = await apiCall(() => apiService.post(endpoint, body, { timeout: 180000 }));
      if (result.success) {
        setResponse((result.data as any)?.data || result.data);
      } else {
        setError((result as any)?.error?.message || 'Lexa request failed.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lexa request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const titleByMode = mode === 'generate' ? 'Generate Report' : 'Correct Report';

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[55] items-end justify-center bg-black/60"
      style={{ bottom: BOTTOM_BAR_HEIGHT, display: open ? 'flex' : 'none' }}
    >
      <div
        className="relative mb-2 w-full max-w-[1100px] rounded-2xl border border-[#4F4F4F] p-8 text-white shadow-2xl"
        style={{
          backgroundColor: 'rgba(11, 10, 10, 0.95)',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div className="mb-6 flex items-start justify-between border-b border-[#4F4F4F] pb-4">
          <div>
            <h2 className="text-primary-light text-2xl font-bold leading-tight">
              Lexa — {titleByMode}
            </h2>
            <p className="text-primary-light mt-1 text-sm opacity-70">
              {mode === 'generate'
                ? 'Produces a structured BI-RADS report from your findings.'
                : 'Reviews an existing report and returns scorecard, FQS, and references.'}
            </p>
          </div>
          <Button
            variant="ghost"
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-[8px] p-0 text-white"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#2E2E2E';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </Button>
        </div>

        {/* Body */}
        <div
          className="grid grid-cols-1 gap-6 overflow-auto md:grid-cols-2"
          style={{ flex: 1 }}
        >
          {/* INPUT FORM */}
          <form
            className="space-y-4"
            onSubmit={e => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            {/* Case + patient row — pre-filled from caseList + DICOM metadata,
                but editable in case Lexa needs a corrected age/sex. */}
            <div className="grid grid-cols-3 gap-x-4 gap-y-4">
              <div className="space-y-1.5">
                <FieldLabel>Case name</FieldLabel>
                <TextInput
                  value={caseName}
                  onChange={setCaseName}
                  placeholder="e.g., Case 322"
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Age</FieldLabel>
                <TextInput
                  value={patientAge}
                  onChange={setPatientAge}
                  placeholder="e.g., 45"
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Sex</FieldLabel>
                <Dropdown
                  value={patientSex}
                  onChange={setPatientSex}
                  options={['Male', 'Female', 'Other']}
                  placeholder="Select"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <div className="space-y-1.5">
                <FieldLabel>Modality</FieldLabel>
                <Dropdown
                  value={modality}
                  onChange={v => setModality(v as LexaModality)}
                  options={ALL_MODALITIES}
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Scenario</FieldLabel>
                <Dropdown
                  value={scenario}
                  onChange={v => setScenario(v as LexaScenario)}
                  options={ALL_SCENARIOS}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <FieldLabel>Sub-scenario (optional)</FieldLabel>
              <TextInput
                value={subScenario}
                onChange={setSubScenario}
                placeholder="e.g., Asymmetric breast tissue, post-surgical follow-up"
                maxLength={200}
              />
            </div>

            <div className="space-y-1.5">
              <FieldLabel>Key findings</FieldLabel>
              <TextArea
                value={keyFindings}
                onChange={setKeyFindings}
                placeholder="Auto-composed from your BI-RADS form, ACR values, and view type."
                rows={5}
              />
            </div>

            <div className="space-y-1.5">
              <FieldLabel>Additional clinical details (optional)</FieldLabel>
              <TextArea
                value={additionalDetails}
                onChange={setAdditionalDetails}
                placeholder="Patient history, prior procedures, indications…"
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <FieldLabel>Previous report (optional)</FieldLabel>
              <TextArea
                value={previousReport}
                onChange={setPreviousReport}
                placeholder="Paste the previous report for comparison/follow-up context."
                rows={3}
              />
            </div>

            {mode === 'correct' && (
              <div className="space-y-1.5">
                <FieldLabel>Report to be reviewed</FieldLabel>
                <TextArea
                  value={reportText}
                  onChange={setReportText}
                  placeholder="Paste the resident-drafted report Lexa should review."
                  rows={6}
                />
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={isLoading || (mode === 'correct' && !reportText.trim())}
                className="min-w-28 h-auto rounded-[8px] px-4 py-2 text-xl font-medium text-white"
                style={{ backgroundColor: 'hsl(var(--highlight))' }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'hsl(var(--highlight) / 0.9)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'hsl(var(--highlight))';
                }}
              >
                {isLoading ? 'Working…' : mode === 'generate' ? 'Generate' : 'Review'}
              </Button>
              {error && <span className="text-sm text-[#FF2768]">{error}</span>}
            </div>
          </form>

          {/* OUTPUT — no own overflow; the parent body grid scrolls. The
              left-border + padding act as the visual partition between the
              input form and the report; on small screens (single column)
              the partition disappears so the layout stacks cleanly. */}
          <div className="md:border-l md:border-[#4F4F4F] md:pl-6">
            {!response && !isLoading && (
              <div
                className="rounded-lg border border-[#4F4F4F] p-4"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
              >
                <p className="text-primary-light text-base opacity-50">
                  Output will appear here after you{' '}
                  {mode === 'generate' ? 'generate' : 'review'} a report.
                </p>
              </div>
            )}
            {isLoading && (
              <div
                className="rounded-lg border border-[#4F4F4F] p-4"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
              >
                <TypingIndicator />
              </div>
            )}
            {response && !isLoading && <LexaReportOutput data={response} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LexaReportingPanel;
