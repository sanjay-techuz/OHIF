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
import RichTextEditor from './RichTextEditor';
import { extractPdfText, PdfExtractionError } from './output/extractPdfText';
import { htmlToPlainText, plainTextToHtml } from './output/textHtml';

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
  /**
   * Pre-fill for the "Additional clinical details" textarea — typically the
   * case's `case_history` (patient history / prior procedures / indications).
   * Sent to Gemini as `additionalClinicalDetails` and helps it ground the
   * generated impression in the right clinical context. User edits win over
   * this default; saved-report inputs still take precedence when present.
   */
  defaultAdditionalDetails?: string;
  /** Optional default scenario (Diagnostic vs Screening view). */
  defaultScenario?: LexaScenario;
  /** Case label from caseList[currentCaseIndex].case_title (or caseId fallback). */
  defaultCaseName?: string;
  /** PatientAge digits stripped from DICOM (e.g. "045Y" → "45"). */
  defaultPatientAge?: string;
  /** "Male" / "Female" / "Other" — already mapped from DICOM PatientSex. */
  defaultPatientSex?: string;

  // ---- Save / load scope ----
  // All optional — when missing the Save Report button stays hidden and the
  // auto-load step is skipped, so existing OHIF entry points that don't yet
  // pass these are unaffected.
  /** Flat-course id (or fellowship program id when isFellowship). */
  courseId?: string | number | null;
  /** Module id (flat) OR fellowship_curriculum_module_id (fellowship). */
  moduleId?: string | number | null;
  /** Case row id — required for save/load. */
  caseId?: string | number | null;
  /** True when the surrounding URL is a fellowship case. */
  isFellowship?: boolean;
  /** Fellowship program id (only meaningful when isFellowship). */
  programId?: string | number | null;
  /** Fellowship phase id (only meaningful when isFellowship). */
  phaseId?: string | number | null;
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
  if (!slug) {
    return 'MG';
  }
  const s = String(slug).toUpperCase();
  if (s === 'DBT') {
    return 'DBT';
  }
  if (s === 'US' || s === 'US_BREAST') {
    return 'US';
  }
  if (s === 'MR' || s === 'MRI' || s === 'MRI_BREAST') {
    return 'MRI';
  }
  if (s === 'CEM') {
    return 'CEM';
  }
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
  <Select
    value={value || undefined}
    onValueChange={onChange}
  >
    <SelectTrigger
      className="w-full"
      style={FIELD_BASE_STYLE}
    >
      <SelectValue placeholder={placeholder || 'Select'} />
    </SelectTrigger>
    {/* SelectContent ships with z-50 baked in, but the panel backdrop also
        runs at z-[55]+, so without an explicit override the dropdown opens
        BEHIND the backdrop and looks invisible. Force it above the panel. */}
    <SelectContent className="z-[70]">
      {options.map(option => (
        <SelectItem
          key={option}
          value={option}
        >
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
  defaultAdditionalDetails = '',
  defaultScenario = 'Diagnostic Evaluation',
  defaultCaseName = '',
  defaultPatientAge = '',
  defaultPatientSex = '',
  courseId = null,
  moduleId = null,
  caseId = null,
  isFellowship = false,
  programId = null,
  phaseId = null,
}) => {
  const initialModality = useMemo(() => slugToModality(modalitySlug), [modalitySlug]);

  const [caseName, setCaseName] = useState<string>(defaultCaseName);
  const [patientAge, setPatientAge] = useState<string>(defaultPatientAge);
  const [patientSex, setPatientSex] = useState<string>(defaultPatientSex);
  const [modality, setModality] = useState<LexaModality>(initialModality);
  const [scenario, setScenario] = useState<LexaScenario>(defaultScenario);
  const [subScenario, setSubScenario] = useState<string>('');
  const [keyFindings, setKeyFindings] = useState<string>(defaultKeyFindings);
  const [additionalDetails, setAdditionalDetails] = useState<string>(defaultAdditionalDetails);
  const [previousReport, setPreviousReport] = useState<string>('');
  const [reportText, setReportText] = useState<string>('');
  // Editor renders HTML; `reportText` (plain) remains the source of truth
  // shipped to Gemini. Conversions happen at PDF-extract and editor-onChange
  // boundaries.
  const [reportHtml, setReportHtml] = useState<string>('');
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const reportFileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<any>(null);

  // Ref to the inner panel content. Used by the document-level outside-click
  // listener (below) to decide whether a click should dismiss the panel.
  const panelContentRef = useRef<HTMLDivElement>(null);

  // Saved-report state. `loadedReports` caches both modes' saved data so a
  // user toggling Generate ↔ Correct can see whichever they previously
  // saved without an extra round-trip. Each entry holds BOTH the
  // generated/corrected `response` (for the right-side renderer) and the
  // `inputs` snapshot (for re-populating the left-side form/editor), so
  // the user can see what they typed AND what they got back.
  // `isSaving`/`savedAtMs` drive the Save button label.
  type SavedEntry = { response: any; inputs?: any };
  const [loadedReports, setLoadedReports] = useState<{
    generate?: SavedEntry;
    correct?: SavedEntry;
  }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedAtMs, setSavedAtMs] = useState<number | null>(null);
  const [saveFailedAtMs, setSaveFailedAtMs] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadedAtMs, setDownloadedAtMs] = useState<number | null>(null);
  const [downloadFailedAtMs, setDownloadFailedAtMs] = useState<number | null>(null);

  const canPersist = Boolean(caseId && moduleId);
  const persistBaseEndpoint =
    userType === 'faculty' ? '/admin/cases/lexa/report' : '/user/cases/lexa/report';

  /**
   * Build the scope query/body that the persistence endpoints expect.
   * Mirrors the backend `extractFellowshipContext` logic from the FE side.
   */
  const buildScopePayload = (): Record<string, unknown> => {
    if (isFellowship) {
      return {
        is_fellowship: true,
        fellowship_program_id: programId ?? undefined,
        phase_id: phaseId ?? undefined,
        fellowship_curriculum_module_id: moduleId ?? undefined,
      };
    }
    return {
      course_id: courseId ?? undefined,
      module_id: moduleId ?? undefined,
    };
  };

  const buildScopeQuery = (): string => {
    const qs = new URLSearchParams();
    if (caseId !== null && caseId !== undefined) {
      qs.set('case_id', String(caseId));
    }
    if (isFellowship) {
      qs.set('is_fellowship', 'true');
      if (programId) {
        qs.set('fellowship_program_id', String(programId));
      }
      if (phaseId) {
        qs.set('phase_id', String(phaseId));
      }
      if (moduleId) {
        qs.set('fellowship_curriculum_module_id', String(moduleId));
      }
    } else {
      if (courseId) {
        qs.set('course_id', String(courseId));
      }
      if (moduleId) {
        qs.set('module_id', String(moduleId));
      }
    }
    const s = qs.toString();
    return s ? `?${s}` : '';
  };

  const handleReportPdfPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset the input so the SAME file can be re-uploaded after a clear.
    if (event.target) {
      event.target.value = '';
    }
    if (!file) {
      return;
    }
    setError(null);
    setIsExtractingPdf(true);
    try {
      const text = await extractPdfText(file);
      if (!text.trim()) {
        throw new PdfExtractionError(
          'No readable text found in this PDF — it may be scanned/image-based.'
        );
      }
      setReportText(text);
      setReportHtml(plainTextToHtml(text));
      setPdfFileName(file.name);
    } catch (err: any) {
      setError(err?.message || 'Failed to extract PDF text.');
    } finally {
      setIsExtractingPdf(false);
    }
  };

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
  const lastDefaultAdditionalDetails = useRef<string | null>(null);

  const syncFromDefault = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    lastRef: React.MutableRefObject<string | null>,
    nextDefault: string
  ) => {
    if (!nextDefault) {
      return;
    }
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
  useEffect(() => {
    syncFromDefault(setAdditionalDetails, lastDefaultAdditionalDetails, defaultAdditionalDetails);
  }, [defaultAdditionalDetails]);

  // Modality is loaded async from the case API and arrives AFTER the panel
  // first mounts (the panel is always mounted; only `open` toggles its
  // visibility). Without this effect, the initial useState call sees
  // modalitySlug=null and locks in 'MG' even when the case is MR/US/etc.
  // Re-sync on every change — case navigation also flows through here.
  useEffect(() => {
    if (modalitySlug) {
      setModality(slugToModality(modalitySlug));
    }
  }, [modalitySlug]);

  // When the user switches tools (Generate ↔ Correct), swap in whichever
  // saved report we already have for that mode (or null when none). Output
  // then persists naturally — generating fresh OR loading from DB.
  useEffect(() => {
    setError(null);
    setResponse(loadedReports[mode]?.response ?? null);
    setSavedAtMs(null);
    setSaveFailedAtMs(null);
    setDownloadedAtMs(null);
    setDownloadFailedAtMs(null);
  }, [mode, loadedReports]);

  // Hydrate the form/editor state from the saved `inputs` snapshot for the
  // current mode. Only fields actually present on the snapshot are
  // overwritten — anything missing keeps whatever the auto-default chain
  // already set (DICOM age/sex, ROI-derived findings, etc.). Strict typeof
  // guards prevent corrupted-shape rows from poisoning state.
  useEffect(() => {
    const inp = loadedReports[mode]?.inputs as Record<string, unknown> | undefined;
    if (!inp || typeof inp !== 'object') {
      return;
    }

    if (
      typeof inp.modality === 'string' &&
      (ALL_MODALITIES as readonly string[]).includes(inp.modality)
    ) {
      setModality(inp.modality as LexaModality);
    }
    if (
      typeof inp.scenario === 'string' &&
      (ALL_SCENARIOS as readonly string[]).includes(inp.scenario)
    ) {
      setScenario(inp.scenario as LexaScenario);
    }
    if (mode === 'generate') {
      if (typeof inp.caseName === 'string') {
        setCaseName(inp.caseName);
      }
      if (typeof inp.patientAge === 'string') {
        setPatientAge(inp.patientAge);
      }
      if (typeof inp.patientSex === 'string') {
        setPatientSex(inp.patientSex);
      }
      if (typeof inp.subScenario === 'string') {
        setSubScenario(inp.subScenario);
      }
      if (typeof inp.keyFindings === 'string') {
        setKeyFindings(inp.keyFindings);
      }
      if (typeof inp.additionalDetails === 'string') {
        setAdditionalDetails(inp.additionalDetails);
      }
      if (typeof inp.previousReport === 'string') {
        setPreviousReport(inp.previousReport);
      }
    } else if (mode === 'correct') {
      if (typeof inp.reportText === 'string') {
        setReportText(inp.reportText);
      }
      if (typeof inp.reportHtml === 'string') {
        setReportHtml(inp.reportHtml);
      }
      if (typeof inp.pdfFileName === 'string') {
        setPdfFileName(inp.pdfFileName);
      }
    }
  }, [mode, loadedReports]);

  // Auto-load any saved Generate / Correct reports for this case+user. Runs
  // whenever the case (or its scope) changes. Only fires when caseId +
  // moduleId are both available — older OHIF entry points that haven't yet
  // wired the new props simply skip the load.
  useEffect(() => {
    if (!canPersist) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await apiCall(() =>
          apiService.get(`${persistBaseEndpoint}${buildScopeQuery()}`)
        );
        if (cancelled) {
          return;
        }
        if (result.success) {
          const data = ((result.data as any)?.data || result.data || {}) as {
            generate?: SavedEntry;
            correct?: SavedEntry;
          };
          // Tolerate a row that comes back as a bare response (older saves
          // before the wrapper change) by sniffing for `.response`. Bare
          // payloads get hoisted into `{ response }` so the rest of the
          // panel can keep its shape assumption.
          const normalize = (v: unknown): SavedEntry | undefined => {
            if (!v) {
              return undefined;
            }
            if (typeof v === 'object' && 'response' in (v as object)) {
              return v as SavedEntry;
            }
            return { response: v };
          };
          setLoadedReports({
            generate: normalize(data.generate),
            correct: normalize(data.correct),
          });
        }
      } catch {
        // Non-fatal — the panel still works without prior saves.
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, moduleId, courseId, isFellowship, programId, phaseId, userType]);

  /**
   * Persist the currently-displayed `response` for the active mode. The
   * server upserts on (scope, case, user, mode) so re-saving overwrites.
   */
  /**
   * Snapshot of the user-controlled inputs that produced the current
   * `response`. Mode-specific because the Generate form and the Correct
   * upload/editor share almost no fields. Modality + scenario are common
   * because they're sent to Gemini in both paths.
   */
  const buildInputsSnapshot = (): Record<string, string> => {
    if (mode === 'generate') {
      return {
        caseName,
        patientAge,
        patientSex,
        modality,
        scenario,
        subScenario,
        keyFindings,
        additionalDetails,
        previousReport,
      };
    }
    return {
      modality,
      scenario,
      reportText,
      reportHtml,
      pdfFileName,
    };
  };

  /**
   * Hit the save endpoint with the current response + inputs. Pulled out
   * of the click handler so Download can reuse it as its prerequisite step
   * (the server-side PDF renderer reads from the same row).
   *
   * Returns true on success so callers can sequence work (Download proceeds
   * to the GET only after this resolves true).
   */
  const persistCurrent = async (): Promise<boolean> => {
    if (!canPersist || !response) {
      return false;
    }
    const inputs = buildInputsSnapshot();
    const body = {
      ...buildScopePayload(),
      case_id: caseId,
      mode,
      modality,
      scenario,
      response,
      inputs,
    };
    const result = await apiCall(() => apiService.post(`${persistBaseEndpoint}/save`, body));
    if (result.success) {
      setLoadedReports(prev => ({ ...prev, [mode]: { response, inputs } }));
      return true;
    }
    return false;
  };

  const handleSaveReport = async () => {
    if (!canPersist || !response || isSaving) {
      return;
    }
    setIsSaving(true);
    setError(null);
    setSavedAtMs(null);
    setSaveFailedAtMs(null);
    try {
      const ok = await persistCurrent();
      if (ok) {
        setSavedAtMs(Date.now());
      } else {
        setError('Failed to save report.');
        setSaveFailedAtMs(Date.now());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save report.');
      setSaveFailedAtMs(Date.now());
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Download the active mode's PDF. Auto-saves first so the server has a
   * row to render — this matters when the user clicks Generate → Download
   * without an explicit Save in between (idempotent upsert, so re-saving
   * just refreshes the row to the current response).
   */
  const handleDownloadReport = async () => {
    if (!canPersist || !response || isDownloading) {
      return;
    }
    setIsDownloading(true);
    setDownloadedAtMs(null);
    setDownloadFailedAtMs(null);
    setError(null);
    try {
      const ok = await persistCurrent();
      if (!ok) {
        setError('Could not save the report; download aborted.');
        setDownloadFailedAtMs(Date.now());
        return;
      }
      // Build the download URL with the same scope params as the GET.
      const qs = new URLSearchParams();
      qs.set('case_id', String(caseId));
      qs.set('mode', mode);
      if (isFellowship) {
        qs.set('is_fellowship', 'true');
        if (programId) {
          qs.set('fellowship_program_id', String(programId));
        }
        if (phaseId) {
          qs.set('phase_id', String(phaseId));
        }
        if (moduleId) {
          qs.set('fellowship_curriculum_module_id', String(moduleId));
        }
      } else {
        if (courseId) {
          qs.set('course_id', String(courseId));
        }
        if (moduleId) {
          qs.set('module_id', String(moduleId));
        }
      }
      const url = `${persistBaseEndpoint}/download?${qs.toString()}`;
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      const filename = `lexa-${mode}-report-case-${caseId}-${ts}.pdf`;
      // apiService.download streams the response as a blob and triggers
      // the browser's "Save As" via a hidden <a>. No extra deps; mirrors
      // the certificate download flow elsewhere in the app.
      await apiService.download(url, filename);
      setDownloadedAtMs(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download report.');
      setDownloadFailedAtMs(Date.now());
    } finally {
      setIsDownloading(false);
    }
  };

  // Panel stays mounted across close/open so form inputs and the generated
  // report aren't wiped. We toggle visibility via CSS instead of unmounting.

  const endpoint = userType === 'faculty' ? '/admin/cases/lexa/report' : '/user/cases/lexa/report';

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    setResponse(null);
    try {
      const patient: Record<string, string> = {};
      if (caseName.trim()) {
        patient.name = caseName.trim();
      }
      if (patientAge.trim()) {
        patient.age = patientAge.trim();
      }
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

  // Outside-click dismiss.
  //
  // The visible backdrop only covers the area above the OHIF bottom toolbar
  // (`bottom: BOTTOM_BAR_HEIGHT`) so the toolbar stays interactive while
  // the panel is open. An onClick on the backdrop div would therefore miss
  // any clicks the user makes in the toolbar zone — they wanted the panel
  // to dismiss there too. So instead we listen at the document level and
  // ask "was this click inside the panel's content area?". Anything else
  // (toolbar, viewer surface, study sidebar, etc.) closes.
  //
  // Two exemptions:
  //   1. Clicks inside Radix portals (Select dropdowns, etc.) — those are
  //      rendered into document.body so they're not inside panelContentRef
  //      DOM-wise, but they ARE part of the panel UX and must not dismiss.
  //   2. Anything inside the panel content itself.
  //
  // `mousedown` is preferred over `click` so the panel dismisses on press,
  // matching native modal feel and avoiding races with the press-to-focus
  // behavior of inputs/buttons under the click site.
  useEffect(() => {
    if (!open) {
      return;
    }
    const handleDocumentMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || !panelContentRef.current) {
        return;
      }
      // Inside the panel content — ignore.
      if (panelContentRef.current.contains(target)) {
        return;
      }
      // Inside a Radix-portaled popper (Select dropdown options, tooltips) —
      // these live outside the panel DOM subtree but are part of its UX.
      if (target.closest('[data-radix-popper-content-wrapper]')) {
        return;
      }
      if (target.closest('[role="listbox"]')) {
        return;
      }
      onClose();
    };
    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, [open, onClose]);

  // bg-black/60 matches the shared Dialog/Modal overlay opacity so the dim
  // level looks identical to the ACR modal and other Radix-driven dialogs
  // in the viewer.
  return (
    <div
      className="fixed left-0 right-0 top-0 z-[55] items-end justify-center bg-black/60"
      style={{ bottom: BOTTOM_BAR_HEIGHT, display: open ? 'flex' : 'none' }}
      role="presentation"
    >
      <div
        ref={panelContentRef}
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
            {/* GENERATE MODE — all clinical context fields. The Correct flow
                hides everything except the upload zone and the report
                editor; modality/scenario/etc. are still populated under the
                hood (auto-derived from props/defaults) so the backend gets
                what it needs without showing the user a long form. */}
            {mode === 'generate' && (
              <>
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
              </>
            )}

            {/* CORRECT MODE — minimal: upload zone OR text editor. */}
            {mode === 'correct' && (
              <>
                <input
                  ref={reportFileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleReportPdfPick}
                />
                <button
                  type="button"
                  onClick={() => reportFileInputRef.current?.click()}
                  disabled={isExtractingPdf || isLoading}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#4F4F4F] px-6 py-10 text-center transition-colors hover:border-[#FF2768] disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ backgroundColor: 'rgba(11, 10, 10, 0.4)' }}
                >
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary-light"
                  >
                    <path d="M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9" />
                    <polyline points="16 16 12 12 8 16" />
                    <line
                      x1="12"
                      y1="12"
                      x2="12"
                      y2="21"
                    />
                  </svg>
                  <p className="text-primary-light text-base font-semibold">
                    {isExtractingPdf
                      ? 'Extracting…'
                      : pdfFileName
                        ? `Replace: ${pdfFileName}`
                        : 'Click to Upload report'}
                  </p>
                  <p className="text-primary-light text-xs opacity-60">PDF</p>
                </button>

                <div className="my-1 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#4F4F4F]" />
                  <span className="text-primary-light text-xs font-medium tracking-wide opacity-60">
                    OR
                  </span>
                  <div className="h-px flex-1 bg-[#4F4F4F]" />
                </div>

                <RichTextEditor
                  value={reportHtml}
                  onChange={html => {
                    setReportHtml(html);
                    setReportText(htmlToPlainText(html));
                  }}
                  placeholder="Paste or write the report Lexa should review and correct."
                  minHeight={300}
                />
              </>
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
                  Output will appear here after you {mode === 'generate' ? 'generate' : 'review'} a
                  report.
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
            {response && !isLoading && (
              <LexaReportOutput
                data={response}
                onSave={canPersist ? handleSaveReport : undefined}
                isSaving={isSaving}
                savedAtMs={savedAtMs}
                saveFailedAtMs={saveFailedAtMs}
                onDownload={canPersist ? handleDownloadReport : undefined}
                isDownloading={isDownloading}
                downloadedAtMs={downloadedAtMs}
                downloadFailedAtMs={downloadFailedAtMs}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LexaReportingPanel;
