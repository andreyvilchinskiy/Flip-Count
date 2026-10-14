/* ============================================
   ЛОГИКА ДОБАВЛЕНИЯ СДЕЛОК (add-deal.html)
   ============================================ */

let activeFormula = null;   // текущая активная формула
let dealMultiplier = 1;     // сколько крафтов делается за раз
let previewTimer = null;

/**
 * Загрузка списка формул (включая крафты).
 * Крафты помечаются бейджем КРАФТ.
 */
async function loadFormulas() {
    const row = document.getElementById('formulasRow');
    try {
        const formulas = await API.getFormulas();
        if (!formulas || !Array.isArray(formulas)) return;

        row.innerHTML = '';

        formulas.forEach(f => {
            const el = document.createElement('div');
            el.className = 'formula-row' + (f.active ? ' active' : '');
            el.dataset.id = f.id;

            const badge = f.isCraft
                ? '<span style="display:inline-block;padding:2px 8px;background:rgba(139,92,246,0.25);color:#A5B4FC;border-radius:6px;font-size:11px;font-weight:700;margin-right:8px;">КРАФТ</span>'
                : '';

            el.innerHTML = `
                <div class="formula-text">${badge}${f.name}</div>
                <div class="formula-actions">
                    <button class="formula-icon-btn" title="Изменить"
                            onclick="editFormula(${f.id}, ${f.isCraft}); event.stopPropagation();">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                                  stroke="currentColor" stroke-width="2"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                                  stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>
            `;

            el.addEventListener('click', async () => {
                if (f.active) return;
                try {
                    await API.activateFormula(f.id);
                    showToast('Формула «' + f.name + '» активна', 'success');
                    loadFormulas();
                    loadDynamicFields();
                } catch (err) {
                    showToast(err.message, 'info');
                }
            });

            row.appendChild(el);
        });

        // Кнопка "+ Новая формула"
        const addBtn = document.createElement('div');
        addBtn.className = 'formula-row formula-add-new';
        addBtn.innerHTML = `<div class="formula-text" style="color:#A5B4FC;">+ Новая формула</div>`;
        addBtn.addEventListener('click', () => {
            window.location.href = 'formula-settings.html';
        });
        row.appendChild(addBtn);

    } catch (err) {
        showToast(err.message, 'info');
    }
}

/**
 * Открыть формулу для редактирования.
 * Крафты — в визуальный редактор, ручные — в настройки.
 */
function editFormula(id, isCraft) {
    if (isCraft) {
        window.location.href = 'combined.html?edit=' + id;
    } else {
        window.location.href = 'formula-settings.html?id=' + id;
    }
}

/**
 * Загрузка полей ввода по активной формуле.
 * Если формула — крафт, показывает селект множителя.
 */
async function loadDynamicFields() {
    const container = document.getElementById('dynamicFields');
    container.innerHTML = '';

    try {
        activeFormula = await API.getActiveFormula();

        if (!activeFormula) {
            const p = document.createElement('p');
            p.style.cssText = 'color:#94A3B8; text-align:center; padding:20px;';
            p.textContent = 'Создайте формулу для начала работы';
            container.appendChild(p);
            document.getElementById('profitValue').textContent = '—';
            hideMultiplier();
            return;
        }

        // Создаём поля по переменным формулы
        activeFormula.fields.forEach(f => {
            const group = document.createElement('div');
            group.className = 'form-group';

            const label = document.createElement('label');
            label.setAttribute('for', 'field_' + f.variable);
            label.textContent = f.label + ' (' + f.variable + ')';

            const input = document.createElement('input');
            input.type = 'number';
            input.step = '0.01';
            input.id = 'field_' + f.variable;
            input.dataset.variable = f.variable;
            input.placeholder = '0.00';

            input.addEventListener('input', updateProfitPreview);
            input.addEventListener('change', updateProfitPreview);

            group.appendChild(label);
            group.appendChild(input);
            container.appendChild(group);
        });

        // Показываем селект множителя только для крафта
        if (activeFormula.isCraft) {
            showMultiplier();
            document.getElementById('dealMultiplier').value = 1;
            dealMultiplier = 1;
        } else {
            hideMultiplier();
            dealMultiplier = 1;
        }

        updateProfitPreview();
    } catch (err) {
        console.error('Ошибка загрузки полей:', err);
        showToast(err.message, 'info');
    }
}

/** Показать блок множителя */
function showMultiplier() {
    const block = document.getElementById('multiplierBlock');
    if (block) block.style.display = 'block';
}

/** Скрыть блок множителя */
function hideMultiplier() {
    const block = document.getElementById('multiplierBlock');
    if (block) block.style.display = 'none';
}

/** Обработчик селекта множителя */
document.getElementById('dealMultiplier')?.addEventListener('input', (e) => {
    let val = parseInt(e.target.value);

    // Ограничения: от 1 до 10 000 000
    if (isNaN(val) || val < 1) val = 1;
    if (val > 10000000) val = 10000000;

    dealMultiplier = val;
    updateProfitPreview();
});

document.querySelectorAll('.multiplier-presets button').forEach(btn => {
    btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.mult);
        document.getElementById('dealMultiplier').value = val;
        dealMultiplier = val;
        updateProfitPreview();
    });
});
/**
 * Подсчёт прибыли в реальном времени.
 * Работает и для ручных формул, и для крафтов.
 */
function updateProfitPreview() {
    const profitEl = document.getElementById('profitValue');
    const labelEl = document.getElementById('profitLabel');
    const preview = document.getElementById('profitPreview');

    if (!activeFormula) {
        profitEl.textContent = '—';
        return;
    }

    const values = {};
    document.querySelectorAll('#dynamicFields input').forEach(inp => {
        const val = inp.value.trim();
        values[inp.dataset.variable] = val === '' ? null : parseFloat(val);
    });

    const allFilled = Object.values(values).every(v => v !== null && !isNaN(v));
    if (!allFilled) {
        profitEl.textContent = '—';
        labelEl.textContent = 'Прибыль';
        preview.classList.remove('negative');
        return;
    }

    // Debounce 250 мс — не дёргаем API на каждое нажатие
    clearTimeout(previewTimer);
    previewTimer = setTimeout(async () => {
        try {
            const profiles = await API.getProfiles();
            const active = profiles.find(p => p.active);
            if (!active) return;

            const res = await API.previewDeal(
                active.id, activeFormula.id, values, dealMultiplier
            );
            const profit = parseFloat(res.profit);

            profitEl.textContent = profit.toFixed(2) + ' ₽';
            if (profit < 0) {
                labelEl.textContent = 'Убыль';
                preview.classList.add('negative');
            } else {
                labelEl.textContent = 'Прибыль';
                preview.classList.remove('negative');
            }
        } catch (err) {
            console.error(err);
        }
    }, 250);
}
/* ============================================
   СОХРАНЕНИЕ СДЕЛКИ
   ============================================ */
document.getElementById('dealForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!activeFormula) {
        showToast('Нет активной формулы', 'info');
        return;
    }

    const values = {};
    document.querySelectorAll('#dynamicFields input').forEach(inp => {
        values[inp.dataset.variable] = parseFloat(inp.value) || 0;
    });

    try {
        const profiles = await API.getProfiles();
        const active = profiles.find(p => p.active);
        if (!active) {
            showToast('Сначала создайте профиль', 'info');
            return;
        }

        const deal = await API.createDeal(
            active.id,
            activeFormula.id,
            values,
            dealMultiplier
        );
        showToast('Прибыль: ' + deal.profit + ' ₽', 'success');

        // Очищаем поля для следующей сделки
        document.querySelectorAll('#dynamicFields input').forEach(inp => inp.value = '');
        const multInput = document.getElementById('dealMultiplier');
        if (multInput) multInput.value = '1';
        dealMultiplier = 1;
        updateProfitPreview();
    } catch (err) {
        showToast(err.message, 'info');
    }
});

// Загружаем при старте
loadFormulas();
loadDynamicFields();