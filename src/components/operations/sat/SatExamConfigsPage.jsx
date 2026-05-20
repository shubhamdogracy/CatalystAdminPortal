// ============================================================
// SAT EXAM CONFIGS — Overview of all exam configurations
// (Resources > Exam Configs)
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { satAdminService } from '../../../services/api';
import {
  CreateSubjectModal,
  CreatePracticeModal,
  SubjectConfigCard,
  PracticeConfigCard,
} from './examConfigShared';

export default function SatExamConfigsPage() {
  const [subjectConfigs,  setSubjectConfigs]  = useState([]);
  const [practiceConfigs, setPracticeConfigs] = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [tab,             setTab]             = useState('mock');
  const [showSubjectModal,  setShowSubjectModal]  = useState(false);
  const [showPracticeModal, setShowPracticeModal] = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [createType, setCreateType] = useState('mock');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sc, pc] = await Promise.all([
        satAdminService.getExamConfigs(),
        satAdminService.getPracticeConfigs(),
      ]);
      setSubjectConfigs(sc.data);
      setPracticeConfigs(pc.data);
    } catch { console.error('Failed to load SAT configs'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const openCreate = () => {
    setEditing(null);
    if (tab === 'mock' || tab === 'diagnostic') {
      setCreateType(tab);
      setShowSubjectModal(true);
    } else {
      setShowPracticeModal(true);
    }
  };

  const mockConfigs       = subjectConfigs.filter(c => c.type === 'mock' || !c.type);
  const diagnosticConfigs = subjectConfigs.filter(c => c.type === 'diagnostic');
  const createLabel       = tab === 'mock' ? 'Mock Test' : tab === 'diagnostic' ? 'Diagnostic Test' : 'Practice Test';
  const activeConfigs     = tab === 'mock' ? mockConfigs : tab === 'diagnostic' ? diagnosticConfigs : practiceConfigs;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">SAT Exam Configurations</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview of all module rules, difficulty ratios, and adaptive score bands</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-ops-primary text-white text-sm font-semibold hover:bg-violet-700 transition-colors">
          + New {createLabel}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Mock Tests',       val: mockConfigs.length,       icon: '📋' },
          { label: 'Diagnostic Tests', val: diagnosticConfigs.length, icon: '🔬' },
          { label: 'Practice Tests',   val: practiceConfigs.length,   icon: '✏️' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-[14px] border border-gray-200 p-4 flex items-center gap-3">
            <span className="text-2xl">{c.icon}</span>
            <div>
              <div className="text-2xl font-bold text-ops-primary">{c.val}</div>
              <div className="text-xs text-gray-500">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-[12px] p-1 w-fit">
        {[
          { key: 'mock',       label: 'Mock Tests' },
          { key: 'diagnostic', label: 'Diagnostic Tests' },
          { key: 'practice',   label: 'Practice Tests' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-[10px] text-sm font-medium transition-colors ${tab === t.key ? 'bg-white text-ops-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-gray-100 rounded-[14px] animate-pulse" />)}
        </div>
      ) : tab === 'practice' ? (
        activeConfigs.length === 0 ? (
          <div className="bg-white rounded-[14px] border border-gray-200 p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">✏️</p>
            <p className="font-semibold text-gray-600">No practice tests configured yet</p>
            <p className="text-sm mt-1">Run the seed script or create practice tests manually here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeConfigs.map(c => <PracticeConfigCard key={c._id} config={c} onEdit={cfg => { setEditing(cfg); setShowPracticeModal(true); }} />)}
          </div>
        )
      ) : (
        activeConfigs.length === 0 ? (
          <div className="bg-white rounded-[14px] border border-gray-200 p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">{tab === 'mock' ? '📋' : '🔬'}</p>
            <p className="font-semibold text-gray-600">No {tab} tests configured yet</p>
            <p className="text-sm mt-1">
              {tab === 'diagnostic'
                ? 'Standard counts: R&W 11–11Q · Math 9–9Q per module.'
                : 'Create the first mock test using the button above.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeConfigs.map(c => <SubjectConfigCard key={c._id} config={c} onEdit={cfg => { setEditing(cfg); setCreateType(c.type || 'mock'); setShowSubjectModal(true); }} />)}
          </div>
        )
      )}

      {showSubjectModal && (
        <CreateSubjectModal
          onClose={() => { setShowSubjectModal(false); setEditing(null); }}
          onSaved={loadAll}
          existing={editing}
          defaultType={createType}
        />
      )}
      {showPracticeModal && (
        <CreatePracticeModal
          onClose={() => { setShowPracticeModal(false); setEditing(null); }}
          onSaved={loadAll}
          existing={editing}
        />
      )}
    </div>
  );
}
