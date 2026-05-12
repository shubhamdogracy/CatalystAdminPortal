// ============================================================
// DIAGNOSTIC TESTS PAGE — Manage SAT diagnostic exam configs
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { satAdminService } from '../../../services/api';
import { CreateSubjectModal, DiagnosticPairCard } from './examConfigShared';

const getSeriesName = (name) => name.replace(/ — (Math|Reading & Writing)$/, '').trim();

export default function DiagnosticTestsPage() {
  const [configs,   setConfigs]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await satAdminService.getExamConfigs();
      setConfigs(res.data.filter(c => c.type === 'diagnostic'));
    } catch { console.error('Failed to load diagnostic configs'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  // Group paired configs by series name
  const groups = configs.reduce((acc, c) => {
    const series = getSeriesName(c.name);
    if (!acc[series]) acc[series] = { seriesName: series, math: null, rw: null };
    if (c.subject === 'math') acc[series].math = c;
    else acc[series].rw = c;
    return acc;
  }, {});
  const groupList = Object.values(groups);

  const openCreate = () => { setEditing(null); setShowModal(true); };
  const openEdit   = (cfg) => { setEditing(cfg); setShowModal(true); };

  const handleToggleDemo = async (g, newValue) => {
    await satAdminService.patchPairDemoAccess(g.math?._id, g.rw?._id, newValue);
    loadConfigs();
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Diagnostic Tests</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure adaptive diagnostic exam modules and difficulty ratios</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-ops-primary text-white text-sm font-semibold hover:bg-violet-700 transition-colors">
          + New Diagnostic Test
        </button>
      </div>

      {/* Stat */}
      <div className="w-fit">
        <div className="bg-white rounded-[14px] border border-gray-200 p-4 flex items-center gap-3">
          <span className="text-2xl">🔬</span>
          <div>
            <div className="text-2xl font-bold text-ops-primary">{groupList.length}</div>
            <div className="text-xs text-gray-500">Diagnostic Tests</div>
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-gray-100 rounded-[14px] animate-pulse" />)}
        </div>
      ) : groupList.length === 0 ? (
        <div className="bg-white rounded-[14px] border border-gray-200 p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">🔬</p>
          <p className="font-semibold text-gray-600">No diagnostic tests configured yet</p>
          <p className="text-sm mt-1">Standard counts: R&amp;W 11–11Q · Math 9–9Q per module</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {groupList.map(g => (
            <DiagnosticPairCard
              key={g.seriesName}
              seriesName={g.seriesName}
              mathConfig={g.math}
              rwConfig={g.rw}
              onEdit={openEdit}
              onToggleDemo={(newVal) => handleToggleDemo(g, newVal)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <CreateSubjectModal
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={loadConfigs}
          existing={editing}
          defaultType="diagnostic"
          lockedType="diagnostic"
        />
      )}
    </div>
  );
}
