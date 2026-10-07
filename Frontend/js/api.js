/* ============================================
   API — обёртка над fetch
   Все запросы к бэкенду идут через эту функцию
   ============================================ */

const API_URL = 'http://localhost:8080/api';

/**
 * Универсальный запрос к API.
 * Автоматически добавляет токен, обрабатывает 401/403.
 *
 * @param {string} endpoint — путь (например, '/auth/login')
 * @param {object} options — опции fetch (method, body, headers)
 * @returns {Promise<any>} — распарсенный JSON или текст
 */
async function apiRequest(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    // Добавляем JWT-токен, если он есть
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const response = await fetch(API_URL + endpoint, { ...options, headers });

    // Если токен протух — разлогиниваем
    if (response.status === 401 || response.status === 403) {
        logout();
        return null;
    }

    // Пытаемся распарсить JSON, если не получается — отдаём текст
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }

    if (!response.ok) {
        throw new Error(typeof data === 'string' ? data : 'Ошибка запроса');
    }
    return data;
}

/* ============================================
   Все методы API в одном объекте
   ============================================ */
const API = {
    // --- Авторизация ---
    register: (nickname, email, password) =>
        apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ nickname, email, password })
        }),

    login: (email, password) =>
        apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        }),

    me: () => apiRequest('/auth/me'),

    // --- Профили ---
    getProfiles: () => apiRequest('/profiles'),
    getProfile: (id) => apiRequest('/profiles/' + id),
    createProfile: (name, imageUrl) =>
        apiRequest('/profiles', {
            method: 'POST',
            body: JSON.stringify({ name, imageUrl })
        }),
    updateProfile: (id, name) =>
        apiRequest('/profiles/' + id, {
            method: 'PUT',
            body: JSON.stringify({ name })
        }),
    activateProfile: (id) =>
        apiRequest('/profiles/' + id + '/activate', { method: 'PUT' }),
    deleteProfile: (id) =>
        apiRequest('/profiles/' + id, { method: 'DELETE' }),

    // Загрузка аватара (multipart/form-data, не JSON!)
    uploadAvatar: (id, file) => {
        const formData = new FormData();
        formData.append('file', file);
        const token = getToken();
        return fetch(API_URL + '/profiles/' + id + '/avatar', {
            method: 'POST',
            headers: token ? { 'Authorization': 'Bearer ' + token } : {},
            body: formData
        }).then(r => r.ok ? r.text() : r.text().then(t => Promise.reject(new Error(t))));
    },

    // --- Формулы ---
    getFormulas: () => apiRequest('/formulas'),
    getFormula: (id) => apiRequest('/formulas/' + id),
    getActiveFormula: () => apiRequest('/formulas/active'),
    createFormula: (name, expression, fields) =>
        apiRequest('/formulas', {
            method: 'POST',
            body: JSON.stringify({ name, expression, fields })
        }),
    updateFormula: (id, name, expression, fields) =>
        apiRequest('/formulas/' + id, {
            method: 'PUT',
            body: JSON.stringify({ name, expression, fields })
        }),
    activateFormula: (id) =>
        apiRequest('/formulas/' + id + '/activate', { method: 'PUT' }),
    deleteFormula: (id) =>
        apiRequest('/formulas/' + id, { method: 'DELETE' }),

    // --- Сделки ---
    getDeals: (profileId) => apiRequest('/deals/profile/' + profileId),
    createDeal: (profileId, formulaId, values) =>
        apiRequest('/deals', {
            method: 'POST',
            body: JSON.stringify({ profileId, formulaId, values })
        }),
    deleteDeal: (id) => apiRequest('/deals/' + id, { method: 'DELETE' }),
    deleteDealsBatch: (ids) =>
        apiRequest('/deals/batch', {
            method: 'DELETE',
            body: JSON.stringify({ ids })
        }),

    // --- Крафты ---
    getCrafts: () => apiRequest('/crafts'),
    getCraft: (id) => apiRequest('/crafts/' + id),
    createCraftFull: (data) =>
        apiRequest('/crafts', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
    updateCraftFull: (id, data) =>
        apiRequest('/crafts/' + id, {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
    deleteCraft: (id) => apiRequest('/crafts/' + id, { method: 'DELETE' }),

    // --- Поддержка ---
    sendSupport: (topic, message) =>
        apiRequest('/support', {
            method: 'POST',
            body: JSON.stringify({ topic, message })
        })
};