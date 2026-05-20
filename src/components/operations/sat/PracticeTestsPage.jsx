// ============================================================
// PRACTICE TESTS PAGE — Manage SAT practice test configs
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { satAdminService } from '../../../services/api';
import { CreatePracticeModal, PracticeConfigCard } from './examConfigShared';

export default function PracticeTestsPage() {
  const [configs,   setConfigs]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await satAdminService.getPracticeConfigs();
      setConfigs(res.data);
    } catch { console.error('Failed to load practice configs'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  const openCreate = () => { setEditing(null); setShowModal(true); };
  const openEdit   = (cfg) => { setEditing(cfg); setShowModal(true); };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Practice Tests</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure topic-focused practice tests with difficulty distributions</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-ops-primary text-white text-sm font-semibold hover:bg-violet-700 transition-colors">
          + New Practice Test
        </button>
      </div>

      {/* Stat */}
      <div className="w-fit">
        <div className="bg-white rounded-[14px] border border-gray-200 p-4 flex items-center gap-3">
          <span className="text-2xl">✏️</span>
          <div>
            <div className="text-2xl font-bold text-ops-primary">{configs.length}</div>
            <div className="text-xs text-gray-500">Practice Configs</div>
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-[14px] animate-pulse" />)}
        </div>
      ) : configs.length === 0 ? (
        <div className="bg-white rounded-[14px] border border-gray-200 p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">✏️</p>
          <p className="font-semibold text-gray-600">No practice tests configured yet</p>
          <p className="text-sm mt-1">Run the seed script or create practice tests manually here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {configs.map(c => (
            <PracticeConfigCard key={c._id} config={c} onEdit={openEdit} />
          ))}
        </div>
      )}

      {showModal && (
        <CreatePracticeModal
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={loadConfigs}
          existing={editing}
        />
      )}
    </div>
  );
}
