// ============================================================
// API UTILITY — Central place for all backend calls
// Automatically attaches JWT token to every request
// ============================================================

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ── Core request function ────────────────────────────────────
const request = async (endpoint, options = {}) => {
    // Get token from sessionStorage (tab-scoped)
    const token = sessionStorage.getItem('catalyst_token');

    // Build headers
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }), // 👈 auto attach token
        ...options.headers,
    };

    const config = {
        ...options,
        headers,
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await response.json();

    // If token expired or invalid — log user out automatically
    if (response.status === 401) {
        sessionStorage.removeItem('catalyst_token');
        sessionStorage.removeItem('catalyst_user');
        window.location.href = '/';
        return;
    }

    if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
    }

    return data;
};

// ── HTTP method helpers ──────────────────────────────────────
export const api = {
    get: (endpoint) =>
        request(endpoint, { method: 'GET' }),

    post: (endpoint, body) =>
        request(endpoint, { method: 'POST', body: JSON.stringify(body) }),

    put: (endpoint, body) =>
        request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),

    delete: (endpoint) =>
        request(endpoint, { method: 'DELETE' }),
};
