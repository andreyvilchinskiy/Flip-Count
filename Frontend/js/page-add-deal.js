/* ============================================
   ЛОГИКА ДОБАВЛЕНИЯ СДЕЛОК (add-deal.html)
   ============================================ */

let activeFormula = null; // текущая активная формула

/**
 * Загрузка списка формул (включая крафты).
 * Крафты помечаются бейджем 🔧.
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

            // Бейдж "КРАФТ" для визуально созданных формул
            const badge = f.isCraft
                ? '<span style="display:inline-block;padding:2px 8px;background:rgba(139,92,246,0.25);color:#A5B4FC;border-radius:6px;font-size:11px;font-weight:700;margin-right:8px;">🔧 КРАФТ</span>'
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
 * Крафты → в визуальный редактор, ручные → в настройки.
 */
function editFormula(id, isCraft) {
    if (isCraft) {
        window.location.href = 'combined.html?edit=' + id;
    } else {
        window.location.href = 'formula-settings.html?id=' + id;
    }
}

/** Загрузка полей ввода по активной формуле */
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

            group.appendChild(label);
            group.appendChild(input);
            container.appendChild(group);

            input.addEventListener('input', updateProfitPreview);
        });

        updateProfitPreview();
    } catch (err) {
        showToast(err.message, 'info');
    }
}

/**
 * Подсчёт прибыли в реальном времени.
 * Значения подставляются в формулу и результат пересчитывается на лету.
 */
function updateProfitPreview() {
    const profitEl = document.getElementById('profitValue');
    const labelEl = document.getElementById('profitLabel');
    const preview = document.getElementById('profitPreview');

    if (!activeFormula) {
        profitEl.textContent = '—';
        return;
    }

    // Собираем значения из полей
    const values = {};
    document.querySelectorAll('#dynamicFields input').forEach(inp => {
        const val = inp.value.trim();
        values[inp.dataset.variable] = val === '' ? null : parseFloat(val);
    });

    // Проверяем, все ли заполнены
    const allFilled = Object.values(values).every(v => v !== null && !isNaN(v));
    if (!allFilled) {
        profitEl.textContent = '—';
        labelEl.textContent = 'Прибыль';
        preview.classList.remove('negative');
        return;
    }

    // Подставляем значения в формулу
    let expr = activeFormula.expression.split('=')[0].trim();
    for (const [key, val] of Object.entries(values)) {
        expr = expr.replace(new RegExp('\\b' + key + '\\b', 'g'), val);
    }

    try {
        const result = Function('"use strict"; return (' + expr + ')')();
        const profit = parseFloat(result.toFixed(2));

        if (isNaN(profit) || !isFinite(profit)) {
            profitEl.textContent = '—';
            preview.classList.remove('negative');
            return;
        }

        profitEl.textContent = profit.toFixed(2) + ' ₽';

        // Меняем надпись и цвет в зависимости от знака
        if (profit < 0) {
            labelEl.textContent = 'Убыль';
            preview.classList.add('negative');
        } else {
            labelEl.textContent = 'Прибыль';
            preview.classList.remove('negative');
        }
    } catch (e) {
        profitEl.textContent = '—';
        preview.classList.remove('negative');
    }
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

        const deal = await API.createDeal(active.id, activeFormula.id, values);
        showToast('Прибыль: ' + deal.profit + ' ₽', 'success');

        // Очищаем поля для следующей сделки
        document.querySelectorAll('#dynamicFields input').forEach(inp => inp.value = '');
        updateProfitPreview();
    } catch (err) {
        showToast(err.message, 'info');
    }
});

// Загружаем при старте
loadFormulas();
loadDynamicFields();