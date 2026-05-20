// ============================================================
// MOCK TESTS PAGE — Manage SAT full-length mock exam configs
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { satTestConfigService } from '../../../services/api';
import { CreateSubjectModal, DiagnosticPairCard } from './examConfigShared';

export default function MockTestsPage() {
  const [configs,   setConfigs]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null); // { config, subject }

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await satTestConfigService.getAll({ type: 'mock' });
      setConfigs(res.data);
    } catch { console.error('Failed to load mock configs'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  const openCreate = () => { setEditing(null); setShowModal(true); };

  const openEdit = (config, subject) => {
    setEditing({ config, subject });
    setShowModal(true);
  };

  const handleToggleDemo = async (config) => {
    await satTestConfigService.patchDemoAccess(config.testId, !config.is_demo_accessible);
    loadConfigs();
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mock Tests</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure full-length adaptive mock exam modules and score bands</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-ops-primary text-white text-sm font-semibold hover:bg-violet-700 transition-colors">
          + New Mock Test
        </button>
      </div>

      {/* Stat */}
      <div className="w-fit">
        <div className="bg-white rounded-[14px] border border-gray-200 p-4 flex items-center gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <div className="text-2xl font-bold text-ops-primary">{configs.length}</div>
            <div className="text-xs text-gray-500">Mock Tests</div>
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-gray-100 rounded-[14px] animate-pulse" />)}
        </div>
      ) : configs.length === 0 ? (
        <div className="bg-white rounded-[14px] border border-gray-200 p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-semibold text-gray-600">No mock tests configured yet</p>
          <p className="text-sm mt-1">Create the first mock test using the button above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {configs.map(config => (
            <DiagnosticPairCard
              key={config.testId}
              config={config}
              onEdit={(subject) => openEdit(config, subject)}
              onToggleDemo={() => handleToggleDemo(config)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <CreateSubjectModal
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={loadConfigs}
          existing={editing?.config ?? null}
          defaultSubject={editing?.subject ?? 'rw'}
          defaultType="mock"
          lockedType="mock"
        />
      )}
    </div>
  );
}
