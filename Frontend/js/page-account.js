/* ============================================
   ЛОГИКА СТРАНИЦЫ АККАУНТА (account.html)
   ============================================ */

/** Загрузка данных пользователя с бэкенда */
async function loadUserData() {
    try {
        const me = await API.me();
        if (!me) return;

        document.getElementById('userNickname').textContent = me.nickname;
        document.getElementById('userEmail').textContent = maskEmail(me.email);
    } catch (err) {
        document.getElementById('userNickname').textContent = 'Ошибка';
        document.getElementById('userEmail').textContent = 'Ошибка';
        console.error(err);
    }
}

/**
 * Маскировка email — оставляет последние 3 символа имени и домен
 * Пример: andrey2507vilchinckey@mail.ru → •••••••••key@mail.ru
 */
function maskEmail(email) {
    if (!email || !email.includes('@')) return '•••••';

    const [name, domain] = email.split('@');

    if (name.length <= 3) return name + '@' + domain;

    const visiblePart = name.slice(-3);
    const hiddenPart = '•'.repeat(name.length - 3);

    return hiddenPart + visiblePart + '@' + domain;
}

/* ============================================
   ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК АККАУНТА
   ============================================ */
document.querySelectorAll('#accountMenu a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.dataset.tab;

        // Меняем активную кнопку в меню
        document.querySelectorAll('#accountMenu a').forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        // Показываем нужную панель, скрываем остальные
        document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
        document.getElementById('tab-' + tab).style.display = 'block';
    });
});

// Загружаем данные при старте
loadUserData();