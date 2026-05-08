const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const req = (url, options = {}) => {
  const token = sessionStorage.getItem('catalyst_token');
  return fetch(`${BASE_URL}${url}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  }).then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Something went wrong');
    return data;
  });
};

export const batchService = {
  getAll:       (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req(`/batches${qs ? `?${qs}` : ''}`);
  },
  getById:      (id)          => req(`/batches/${id}`),
  create:       (payload)     => req('/batches', { method: 'POST', body: JSON.stringify(payload) }),
  update:       (id, payload) => req(`/batches/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove:       (id)          => req(`/batches/${id}`, { method: 'DELETE' }),
  getMentors:   ()            => req('/batches/mentors'),
  getStudents:  ()            => req('/batches/students'),
};

export const mentorService = {
  getAll:  ()              => req('/mentors'),
  getById: (id)            => req(`/mentors/${id}`),
  create:  (payload)       => req('/mentors', { method: 'POST', body: JSON.stringify(payload) }),
  update:  (id, payload)   => req(`/mentors/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove:  (id)            => req(`/mentors/${id}`, { method: 'DELETE' }),
};

export const studentService = {
  getAll:       ()              => req('/students'),
  getById:      (id)            => req(`/students/${id}`),
  getByMentor:  (mentorId)      => req(`/students/by-mentor/${mentorId}`),
  create:       (payload)       => req('/students', { method: 'POST', body: JSON.stringify(payload) }),
  update:       (id, payload)   => req(`/students/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove:       (id)            => req(`/students/${id}`, { method: 'DELETE' }),
  grantAccess:  (id)            => req(`/students/${id}/grant-access`, { method: 'PUT' }),
};


// ── SAT Admin service ────────────────────────────────────────
const reqFile = (url, formData) => {
  const token = sessionStorage.getItem('catalyst_token');
  return fetch(`${BASE_URL}${url}`, {
    credentials: 'include',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    method: 'POST',
    body: formData,
  }).then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Something went wrong');
    return data;
  });
};

export const satAdminService = {
  // Question bank
  bulkUpload:       (formData)     => reqFile('/sat/admin/question-bank/bulk-upload', formData),
  getQuestions:     (params = {})  => { const qs = new URLSearchParams(params).toString(); return req(`/sat/admin/question-bank${qs ? `?${qs}` : ''}`); },
  getStats:         ()             => req('/sat/admin/question-bank/stats'),
  updateQuestion:   (id, payload)  => req(`/sat/admin/question-bank/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteQuestion:   (id)           => req(`/sat/admin/question-bank/${id}`, { method: 'DELETE' }),
  // Subject exam configs (mock + diagnostic)
  getExamConfigs:   (params = {})  => { const qs = new URLSearchParams(params).toString(); return req(`/sat/admin/exam-configs${qs ? `?${qs}` : ''}`); },
  getExamConfigById:(id)           => req(`/sat/admin/exam-configs/${id}`),
  createExamConfig: (payload)      => req('/sat/admin/exam-configs', { method: 'POST', body: JSON.stringify(payload) }),
  updateExamConfig: (id, payload)  => req(`/sat/admin/exam-configs/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  // Full length configs
  getFullLengthConfigs:   ()              => req('/sat/admin/full-length-configs'),
  createFullLengthConfig: (payload)       => req('/sat/admin/full-length-configs', { method: 'POST', body: JSON.stringify(payload) }),
  updateFullLengthConfig: (id, payload)   => req(`/sat/admin/full-length-configs/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  // Practice test configs
  getPracticeConfigs:   (params = {})  => { const qs = new URLSearchParams(params).toString(); return req(`/sat/admin/practice-configs${qs ? `?${qs}` : ''}`); },
  createPracticeConfig: (payload)      => req('/sat/admin/practice-configs', { method: 'POST', body: JSON.stringify(payload) }),
  updatePracticeConfig: (id, payload)  => req(`/sat/admin/practice-configs/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
};

export const satMentorService = {
  getStudentSessions:         (studentId) => req(`/sat/mentor/student/${studentId}/sessions`),
  getStudentPracticeSessions: (studentId) => req(`/sat/mentor/student/${studentId}/practice-sessions`),
  getSessionResults:          (sessionId) => req(`/sat/mentor/sessions/${sessionId}/results`),
  getPracticeResults:         (sessionId) => req(`/sat/mentor/practice-sessions/${sessionId}/results`),
};

export const chatService = {
  getConversations: (userId)               => req(`/chat/conversations/${userId}`),
  getMessages:      (userId, otherId, page = 1) => req(`/chat/messages/${userId}/${otherId}?page=${page}`),
  markRead:         (senderId, receiverId)  => req('/chat/messages/read', { method: 'PUT', body: JSON.stringify({ senderId, receiverId }) }),
  searchUsers:      (q)                    => req(`/chat/users/search${q ? `?q=${encodeURIComponent(q)}` : ''}`),
};
