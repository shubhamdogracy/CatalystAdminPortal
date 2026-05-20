// ============================================================
// DATA CONTEXT — In-memory state for mutable entities
// Mentors list and notifications are managed here so state
// is shared between layout dropdowns and full pages.
// ============================================================

import { createContext, useContext, useState } from 'react';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [mentors, setMentors]   = useState([]);
  const [batches, setBatches]   = useState([]);
  const [students, setStudents] = useState([]);

  // ── Batch mutations ───────────────────────────────────────
  const addBatch = (batch) => setBatches((p) => [...p, batch]);

  const addStudentToBatch = (studentId, batchId) => {
    setBatches((p) => p.map((b) =>
      b.id === batchId && !b.studentIds.includes(studentId)
        ? { ...b, studentIds: [...b.studentIds, studentId] }
        : b
    ));
    setStudents((p) => p.map((s) =>
      s.id === studentId ? { ...s, batch: batchId } : s
    ));
  };

  const removeStudentFromBatch = (studentId, batchId) => {
    setBatches((p) => p.map((b) =>
      b.id === batchId
        ? { ...b, studentIds: b.studentIds.filter((id) => id !== studentId) }
        : b
    ));
    setStudents((p) => p.map((s) =>
      s.id === studentId ? { ...s, batch: '' } : s
    ));
  };

  const shiftStudent = (studentId, fromBatchId, toBatchId) => {
    setBatches((p) => p.map((b) => {
      if (b.id === fromBatchId) return { ...b, studentIds: b.studentIds.filter((id) => id !== studentId) };
      if (b.id === toBatchId && !b.studentIds.includes(studentId)) return { ...b, studentIds: [...b.studentIds, studentId] };
      return b;
    }));
    setStudents((p) => p.map((s) =>
      s.id === studentId ? { ...s, batch: toBatchId } : s
    ));
  };

  const addStudent = (student) => setStudents((p) => [...p, student]);

  // ── Mentor notifications ──────────────────────────────────
  const [mentorNotifications, setMentorNotifications] = useState([]);

  const markMentorNotifRead = (id) =>
    setMentorNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n));

  const markAllMentorNotifsRead = () =>
    setMentorNotifications(p => p.map(n => ({ ...n, read: true })));

  const deleteMentorNotif = (id) =>
    setMentorNotifications(p => p.filter(n => n.id !== id));

  // ── Operations notifications ──────────────────────────────
  const [opsNotifications, setOpsNotifications] = useState([]);

  const markOpsNotifRead = (id) =>
    setOpsNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n));

  const markAllOpsNotifsRead = () =>
    setOpsNotifications(p => p.map(n => ({ ...n, read: true })));

  const deleteOpsNotif = (id) =>
    setOpsNotifications(p => p.filter(n => n.id !== id));

  // ── Mentors ───────────────────────────────────────────────
  const addMentor = (mentor) => setMentors((prev) => [...prev, mentor]);

  return (
    <DataContext.Provider value={{
      mentors, addMentor,
      batches, addBatch, addStudentToBatch, removeStudentFromBatch, shiftStudent,
      students, addStudent,
      mentorNotifications, markMentorNotifRead, markAllMentorNotifsRead, deleteMentorNotif,
      opsNotifications,    markOpsNotifRead,    markAllOpsNotifsRead,    deleteOpsNotif,
    }}>
      {children}
    </DataContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
  return useContext(DataContext);
}
