/* ============================================
   UI — тосты, cookie, никнейм в шапке
   ============================================ */

/** Год в подвале (обновляется автоматически) */
document.querySelectorAll('#year, .year').forEach(el => {
    el.textContent = new Date().getFullYear();
});

/**
 * Показать всплывающее уведомление (тост)
 * @param {string} message — текст
 * @param {'info'|'success'} type — тип (цвет)
 */
window.showToast = function (message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        container.setAttribute('aria-live', 'polite');
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    container.appendChild(toast);

    // Появление через requestAnimationFrame (плавно)
    requestAnimationFrame(() => toast.classList.add('show'));

    // Автоудаление через 3 секунды
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

/* ============================================
   COOKIE-БАННЕР
   ============================================ */
(function () {
    const banner = document.getElementById('cookieBanner');
    if (!banner) return;

    const accept = document.getElementById('cookieAccept');

    // Показываем, если ещё не приняли
    if (!localStorage.getItem('flipcount_cookie_ok')) {
        setTimeout(() => banner.classList.add('show'), 1000);
    }

    if (accept) {
        accept.addEventListener('click', () => {
            localStorage.setItem('flipcount_cookie_ok', '1');
            banner.classList.remove('show');
            showToast('Спасибо! Настройки сохранены.', 'success');
        });
    }
})();

/* ============================================
   ЗАЩИТА ПРИВАТНЫХ СТРАНИЦ
   ============================================ */
const protectedPages = [
    'account.html',
    'profile.html',
    'profile-settings.html',
    'add-deal.html',
    'combined.html',
    'history.html',
    'formula-settings.html'
];

const currentPage = window.location.pathname.split('/').pop();

if (protectedPages.includes(currentPage) && !isLoggedIn()) {
    window.location.href = 'login.html';
}

/* ============================================
   ЗАМЕНА КНОПКИ "ВОЙТИ" НА НИКНЕЙМ
   ============================================ */
(function () {
    const nickname = getNickname();
    if (!nickname) return;

    document.querySelectorAll('.login-btn').forEach(btn => {
        // Кнопка "Выйти" — отдельная логика
        if (btn.textContent.trim().toLowerCase().includes('выйти')) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                logout();
            });
            return;
        }

        // Кнопка "Войти" → никнейм пользователя
        btn.innerHTML = `
            <svg class="login-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z" fill="currentColor"/>
            </svg>
            <span>${nickname}</span>`;
        btn.href = 'account.html';
        btn.title = 'Перейти в аккаунт';
    });
})();