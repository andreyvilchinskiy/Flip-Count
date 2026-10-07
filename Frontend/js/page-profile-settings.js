/* ============================================
   ЛОГИКА НАСТРОЕК ПРОФИЛЯ (profile-settings.html)
   ============================================ */

const params = new URLSearchParams(window.location.search);
const profileId = params.get('id');

if (!profileId) {
    showToast('Профиль не указан', 'info');
    setTimeout(() => window.location.href = 'profile.html', 800);
}

const avatarBox = document.getElementById('avatarBox');
const avatarInput = document.getElementById('avatarInput');
const profileNameInput = document.getElementById('profileName');
const saveBtn = document.getElementById('saveBtn');
const deleteBtn = document.getElementById('deleteBtn');

/** Загрузка данных профиля */
async function loadProfile() {
    try {
        const p = await API.getProfile(profileId);
        if (!p) return;

        profileNameInput.value = p.name;
        updateAvatarDisplay(p);
    } catch (err) {
        showToast(err.message, 'info');
    }
}

/** Обновить отображение аватара (картинка или буква) */
function updateAvatarDisplay(p) {
    if (p.avatarPath) {
        avatarBox.innerHTML = `
            <img src="http://localhost:8080${p.avatarPath}" alt="${p.name}">
            <div class="upload-overlay">Нажмите, чтобы<br>заменить картинку</div>
        `;
    } else {
        avatarBox.innerHTML = `
            <div class="profile-letter">${p.name.charAt(0).toUpperCase()}</div>
            <div class="upload-overlay">Нажмите, чтобы<br>загрузить картинку</div>
        `;
    }
}

// Клик по аватару — открыть выбор файла
avatarBox.addEventListener('click', () => avatarInput.click());

// Загрузка файла
avatarInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showToast('Файл больше 5 МБ', 'info');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const token = getToken();
        const response = await fetch(
            'http://localhost:8080/api/profiles/' + profileId + '/avatar',
            {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
                body: formData
            }
        );

        if (!response.ok) {
            const err = await response.text();
            throw new Error(err);
        }

        showToast('Картинка загружена', 'success');
        loadProfile();
    } catch (err) {
        showToast('Ошибка: ' + err.message, 'info');
    }
});

// Сохранение названия
saveBtn.addEventListener('click', async () => {
    const name = profileNameInput.value.trim();
    if (!name) {
        showToast('Введите название', 'info');
        return;
    }

    try {
        await API.updateProfile(profileId, name);
        showToast('Профиль сохранён', 'success');
        loadProfile();
    } catch (err) {
        showToast(err.message, 'info');
    }
});

// Удаление профиля
deleteBtn.addEventListener('click', async () => {
    if (!confirm('Удалить профиль? Все сделки будут потеряны.')) return;

    try {
        await API.deleteProfile(profileId);
        showToast('Профиль удалён', 'success');
        setTimeout(() => window.location.href = 'profile.html', 600);
    } catch (err) {
        showToast(err.message, 'info');
    }
});

loadProfile();