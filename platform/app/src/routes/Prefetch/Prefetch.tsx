/* eslint-disable */
/**
 * @author Sanjay Balai
 * @description /prefetch — student-facing page (OHIF origin) that lists a
 * course module's cases and lets the student prefetch selected studies into the
 * browser (Cache Storage via the service worker) so they open instantly later.
 * Modeled on the Results.tsx pattern (getCustomParams + apiService).
 */
import { apiCall, apiService, buildFellowshipQuery, encrypt, getCustomParams } from '@ohif/core';
import { Button } from '@ohif/ui-next';
import React, { useEffect, useState } from 'react';
import {
  clearDicomCache,
  getStorageEstimate,
  isStudyPrefetched,
  prefetchStudies,
  type PrefetchProgress,
} from '../../prefetch/prefetchManager';

interface CaseRow {
  case_id: number;
  case_title?: string | number;
  case_no?: string | null;
  study_instance_uid: string;
  view_type?: string;
  modality_slug?: string | null;
  prior_study_ids?: string | null;
}

const viewTypeName = (v?: string): string => (String(v) === '2' ? 'screening' : 'diagnostic');

function parsePriorUids(prior?: string | null): string[] {
  if (!prior) return [];
  try {
    const parsed = typeof prior === 'string' ? JSON.parse(prior) : prior;
    if (Array.isArray(parsed)) return parsed.filter((u: any): u is string => typeof u === 'string' && !!u);
  } catch {
    if (typeof prior === 'string' && prior.includes(',')) {
      return prior.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}

function formatBytes(n: number): string {
  if (!n) return '0 MB';
  const mb = n / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
}

const Prefetch = () => {
  const { courseId, moduleId, studentId, isFellowship, programId, phaseId } = getCustomParams();
  const urlCourseId = isFellowship ? programId : courseId;

  const [moduleTitle, setModuleTitle] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusMap, setStatusMap] = useState<Record<string, PrefetchProgress>>({});
  const [storage, setStorage] = useState({ usage: 0, quota: 0 });
  const [prefetching, setPrefetching] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshStorage = () => getStorageEstimate().then(setStorage);

  useEffect(() => {
    refreshStorage();
    const fetchCases = async () => {
      const result = await apiCall(() =>
        apiService.get(
          `/user/cases/cases/${moduleId}${buildFellowshipQuery({ isFellowship, programId, phaseId, moduleId })}`
        )
      );
      if (result.success) {
        const env: any = result.data;
        const payload = env?.data ?? env;
        setModuleTitle(payload?.module_title || '');
        setCourseTitle(payload?.course_title || '');
        setCases(Array.isArray(payload?.cases) ? payload.cases : []);
      } else {
        console.error('Failed to fetch module cases:', (result as any).error);
      }
      setLoading(false);
    };
    fetchCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  const toggle = (uid: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });

  const allSelected = cases.length > 0 && selected.size === cases.length;
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(cases.map(c => c.study_instance_uid)));

  const onPrefetch = async () => {
    if (prefetching) return;
    const picked = cases.filter(c => selected.has(c.study_instance_uid));
    if (picked.length === 0) return;
    // Each case's main study + its prior studies (priors are loaded by the HP).
    const uids: string[] = [];
    picked.forEach(c => {
      uids.push(c.study_instance_uid);
      parsePriorUids(c.prior_study_ids).forEach(p => uids.push(p));
    });
    setPrefetching(true);
    await prefetchStudies(uids, {
      onProgress: p => setStatusMap(prev => ({ ...prev, [p.studyInstanceUid]: p })),
    });
    setPrefetching(false);
    refreshStorage();
  };

  const onClear = async () => {
    await clearDicomCache();
    setStatusMap({});
    refreshStorage();
  };

  const onOpen = (c: CaseRow) => {
    const priors = parsePriorUids(c.prior_study_ids).filter(u => u !== c.study_instance_uid);
    const studyUids = [c.study_instance_uid, ...priors];
    const studyParams = studyUids
      .map(uid => `StudyInstanceUIDs=${encodeURIComponent(encrypt(uid))}`)
      .join('&');
    // Keep the auth token (t=/data=) from the current URL; swap per-case params.
    const base = new URLSearchParams(window.location.search);
    base.delete('StudyInstanceUIDs');
    base.delete('caseId');
    base.delete('viewType');
    base.set('caseId', String(c.case_id));
    base.set('viewType', viewTypeName(c.view_type));
    const rest = base.toString();
    window.open(`/viewer?${studyParams}${rest ? '&' + rest : ''}`, '_blank');
  };

  const statusFor = (c: CaseRow): PrefetchProgress | { state: 'idle' } => {
    const st = statusMap[c.study_instance_uid];
    if (st) return st;
    if (isStudyPrefetched(c.study_instance_uid)) {
      return { studyInstanceUid: c.study_instance_uid, done: 0, total: 0, state: 'ready' };
    }
    return { state: 'idle' };
  };

  const StatusChip: React.FC<{ s: PrefetchProgress | { state: 'idle' } }> = ({ s }) => {
    const base = 'inline-flex items-center rounded-full px-2.5 py-[2px] text-xs border';
    if (s.state === 'ready') {
      return <span className={`${base} border-emerald-500/60 text-emerald-300`}>✓ Ready</span>;
    }
    if (s.state === 'warming' || s.state === 'enumerating') {
      const label =
        s.state === 'enumerating'
          ? 'Preparing…'
          : `Warming ${(s as PrefetchProgress).done}/${(s as PrefetchProgress).total}`;
      return <span className={`${base} border-amber-500/60 text-amber-300`}>⏳ {label}</span>;
    }
    if (s.state === 'error') {
      return <span className={`${base} border-rose-500/60 text-rose-300`}>Failed</span>;
    }
    return <span className={`${base} border-white/20 text-white/50`}>Not cached</span>;
  };

  const quotaPct = storage.quota ? Math.min(100, (storage.usage / storage.quota) * 100) : 0;
  const themeBg = '#0B0A0A';

  return (
    <div className="flex h-full w-full flex-col text-white" style={{ backgroundColor: themeBg }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-10 py-4">
        <div className="flex flex-col">
          <h2 className="text-[20px] font-semibold">Prefetch cases</h2>
          <p className="text-sm text-white/60">
            {courseTitle ? `${courseTitle} · ` : ''}
            {moduleTitle || `Module ${moduleId}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Storage meter */}
          <div className="hidden min-w-[220px] sm:block">
            <div className="mb-1 flex justify-between text-xs text-white/60">
              <span>Browser storage</span>
              <span>
                {formatBytes(storage.usage)}
                {storage.quota ? ` / ${formatBytes(storage.quota)}` : ''}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${quotaPct}%` }} />
            </div>
          </div>
          <Button variant="secondary" className="h-8 px-3 text-sm" onClick={onClear} disabled={prefetching}>
            Clear cache
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-10 py-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-white/80">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 accent-emerald-500" />
          Select all ({selected.size}/{cases.length})
        </label>
        <Button
          className="h-9 px-4 text-sm font-medium"
          style={{ backgroundColor: 'hsl(var(--highlight))' }}
          onClick={onPrefetch}
          disabled={prefetching || selected.size === 0}
        >
          {prefetching ? 'Prefetching…' : `Prefetch selected (${selected.size})`}
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto px-10 pb-10">
        {loading ? (
          <div className="py-20 text-center text-white/50">Loading cases…</div>
        ) : cases.length === 0 ? (
          <div className="py-20 text-center text-white/50">No cases in this module.</div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-white/50">
                <th className="w-10 py-2"></th>
                <th className="py-2">Case</th>
                <th className="py-2">Modality</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {cases.map(c => {
                const checked = selected.has(c.study_instance_uid);
                return (
                  <tr key={c.case_id} className="border-b border-white/5 hover:bg-white/[0.03]">
                    <td className="py-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(c.study_instance_uid)}
                        className="h-4 w-4 accent-emerald-500"
                      />
                    </td>
                    <td className="py-3">
                      <div className="font-medium">{c.case_no || c.case_title || `Case ${c.case_id}`}</div>
                      {c.case_no && c.case_title ? (
                        <div className="text-[11px] text-white/40">{c.case_title}</div>
                      ) : null}
                    </td>
                    <td className="py-3 text-white/70">{c.modality_slug || '-'}</td>
                    <td className="py-3">
                      <StatusChip s={statusFor(c)} />
                    </td>
                    <td className="py-3 text-right">
                      <button
                        className="text-xs font-medium text-[#348cfd] hover:underline"
                        onClick={() => onOpen(c)}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Prefetch;
