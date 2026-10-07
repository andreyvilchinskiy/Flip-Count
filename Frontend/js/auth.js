/* ============================================
   АВТОРИЗАЦИЯ — токен, вход/выход
   ============================================ */

/**
 * Получить токен (localStorage или sessionStorage)
 * Если "Запомнить меня" — используется localStorage,
 * иначе sessionStorage (стирается при закрытии вкладки)
 */
function getToken() {
    return localStorage.getItem('flipcount_token')
        || sessionStorage.getItem('flipcount_token');
}

/** Получить никнейм текущего пользователя */
function getNickname() {
    return localStorage.getItem('flipcount_nickname')
        || sessionStorage.getItem('flipcount_nickname')
        || '';
}

/** Получить email текущего пользователя */
function getEmail() {
    return localStorage.getItem('flipcount_email')
        || sessionStorage.getItem('flipcount_email')
        || '';
}

/**
 * Сохранить данные после логина
 * @param {string} token — JWT-токен
 * @param {string} nickname — никнейм
 * @param {string} email — email
 * @param {boolean} remember — использовать localStorage (постоянно) или sessionStorage
 */
function saveAuth(token, nickname, email, remember = false) {
    const storage = remember ? localStorage : sessionStorage;

    // Очищаем оба хранилища перед сохранением
    localStorage.removeItem('flipcount_token');
    localStorage.removeItem('flipcount_nickname');
    localStorage.removeItem('flipcount_email');
    sessionStorage.removeItem('flipcount_token');
    sessionStorage.removeItem('flipcount_nickname');
    sessionStorage.removeItem('flipcount_email');

    storage.setItem('flipcount_token', token);
    storage.setItem('flipcount_nickname', nickname);
    storage.setItem('flipcount_email', email);
}

/** Выйти из аккаунта — очистить всё и на главную */
function logout() {
    localStorage.removeItem('flipcount_token');
    localStorage.removeItem('flipcount_nickname');
    localStorage.removeItem('flipcount_email');
    sessionStorage.removeItem('flipcount_token');
    sessionStorage.removeItem('flipcount_nickname');
    sessionStorage.removeItem('flipcount_email');
    window.location.href = 'index.html';
}

/** Проверить, залогинен ли пользователь */
function isLoggedIn() {
    return !!getToken();
}