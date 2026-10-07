/* ============================================
   ЛОГИКА ПРОФИЛЕЙ (profile.html)
   ============================================ */

/**
 * Загрузка списка профилей и отрисовка строки.
 * Первый клик — активация, второй (быстрый) — открытие настроек.
 */
async function loadProfiles() {
    const row = document.getElementById('profilesRow');
    try {
        const profiles = await API.getProfiles();
        if (!profiles || !Array.isArray(profiles)) return;

        row.innerHTML = '';

        profiles.forEach(p => {
            const el = document.createElement('div');
            el.className = 'profile-square' + (p.active ? ' active' : '');
            el.dataset.id = p.id;

            // Аватар — картинка или буква
            const avatarContent = p.avatarPath
                ? `<img src="http://localhost:8080${p.avatarPath}" alt="${p.name}">`
                : `<div class="profile-letter">${p.name.charAt(0).toUpperCase()}</div>`;

            el.innerHTML = `
                <div class="profile-square-avatar">${avatarContent}</div>
                <div class="profile-square-name">${p.name}</div>
            `;

            // Разделяем одинарный и двойной клик
            let lastClickTime = 0;

            el.addEventListener('click', async (e) => {
                const now = Date.now();

                if (e.detail === 1) {
                    // Одинарный клик — активируем через 300мс,
                    // если не было двойного
                    lastClickTime = now;
                    setTimeout(async () => {
                        if (Date.now() - lastClickTime >= 300) {
                            if (p.active) return; // уже активен — выходим
                            try {
                                await API.activateProfile(p.id);
                                showToast('Профиль «' + p.name + '» активирован', 'success');
                                loadProfiles();
                            } catch (err) {
                                showToast(err.message, 'info');
                            }
                        }
                    }, 300);
                }

                if (e.detail === 2) {
                    // Двойной клик — в настройки
                    window.location.href = 'profile-settings.html?id=' + p.id;
                }
            });

            row.appendChild(el);
        });

        // Кнопка "+" — в конце строки
        const addBtn = document.createElement('div');
        addBtn.className = 'profile-square add-new';
        addBtn.title = 'Создать профиль';
        addBtn.innerHTML = `
            <div class="profile-square-avatar">
                <div class="profile-plus">+</div>
            </div>
            <div class="profile-square-name">Новый</div>
        `;
        addBtn.addEventListener('click', createProfile);
        row.appendChild(addBtn);

    } catch (err) {
        showToast(err.message, 'info');
    }
}

/** Создание нового профиля с автоматическим именем */
async function createProfile() {
    try {
        const profiles = await API.getProfiles();
        const count = Array.isArray(profiles) ? profiles.length : 0;
        const name = 'Профиль ' + (count + 1);

        const p = await API.createProfile(name, null);
        showToast('Создан профиль «' + name + '»', 'success');

        // Первый профиль сразу активируем
        if (count === 0) {
            await API.activateProfile(p.id);
        }

        loadProfiles();
    } catch (err) {
        showToast(err.message, 'info');
    }
}

// Загружаем список при старте
loadProfiles();