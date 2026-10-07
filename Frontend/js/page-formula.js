/* ============================================
   ЛОГИКА НАСТРОЕК ФОРМУЛЫ (formula-settings.html)
   ============================================ */

const params = new URLSearchParams(window.location.search);
const formulaId = params.get('id');

const fieldsList = document.getElementById('fieldsList');
const saveBtn = document.getElementById('saveBtn');
const deleteBtn = document.getElementById('deleteBtn');

// Поля по умолчанию для новой формулы
let fields = [
    { label: 'Покупка', variable: 'A' },
    { label: 'Продажа', variable: 'B' }
];

/** Перерисовать список полей ввода */
function renderFields() {
    fieldsList.innerHTML = '';

    fields.forEach((f, idx) => {
        const row = document.createElement('div');
        row.className = 'formula-field-row';
        row.innerHTML = `
            <input type="text" class="field-label" value="${f.label}" placeholder="Название" 
                   data-idx="${idx}" data-key="label">
            <input type="text" class="field-var" value="${f.variable}" placeholder="A" 
                   maxlength="3" data-idx="${idx}" data-key="variable">
            <button class="formula-icon-btn delete" data-idx="${idx}" title="Удалить">
                <svg viewBox="0 0 24 24" fill="none">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" 
                          stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
        `;
        fieldsList.appendChild(row);
    });

    // Обработчики ввода
    fieldsList.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            const key = e.target.dataset.key;
            fields[idx][key] = e.target.value;
        });
    });

    // Обработчики удаления
    fieldsList.querySelectorAll('.delete').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx);
            if (fields.length <= 1) {
                showToast('Минимум одно поле', 'info');
                return;
            }
            fields.splice(idx, 1);
            renderFields();
        });
    });
}

/* ============================================
   ДОБАВЛЕНИЕ НОВОГО ПОЛЯ
   ============================================ */
document.getElementById('addFieldBtn').addEventListener('click', () => {
    const used = fields.map(f => f.variable);
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let next = 'A';

    // Ищем первую свободную букву
    for (const ch of alphabet) {
        if (!used.includes(ch)) {
            next = ch;
            break;
        }
    }

    fields.push({ label: '', variable: next });
    renderFields();
});

/* ============================================
   ЗАГРУЗКА СУЩЕСТВУЮЩЕЙ ФОРМУЛЫ
   ============================================ */
async function loadFormula() {
    if (!formulaId) {
        renderFields();
        return;
    }

    deleteBtn.style.display = 'block';

    try {
        const f = await API.getFormula(formulaId);
        document.getElementById('formulaName').value = f.name;
        document.getElementById('formulaExpression').value = f.expression;
        fields = f.fields.map(fld => ({ label: fld.label, variable: fld.variable }));
        renderFields();
    } catch (err) {
        showToast(err.message, 'info');
    }
}

/* ============================================
   СОХРАНЕНИЕ ФОРМУЛЫ
   ============================================ */
saveBtn.addEventListener('click', async () => {
    const name = document.getElementById('formulaName').value.trim();
    const expression = document.getElementById('formulaExpression').value.trim();

    // Валидация
    if (!name || !expression) {
        showToast('Заполните все поля', 'info');
        return;
    }
    if (fields.length === 0) {
        showToast('Добавьте хотя бы одно поле', 'info');
        return;
    }
    if (fields.some(f => !f.label || !f.variable)) {
        showToast('Все поля должны быть заполнены', 'info');
        return;
    }

    try {
        if (formulaId) {
            await API.updateFormula(formulaId, name, expression, fields);
            showToast('Формула обновлена', 'success');
        } else {
            await API.createFormula(name, expression, fields);
            showToast('Формула создана', 'success');
        }
        setTimeout(() => window.location.href = 'add-deal.html', 600);
    } catch (err) {
        showToast(err.message, 'info');
    }
});

/* ============================================
   УДАЛЕНИЕ ФОРМУЛЫ
   ============================================ */
deleteBtn.addEventListener('click', async () => {
    if (!confirm('Удалить формулу?')) return;
    try {
        await API.deleteFormula(formulaId);
        showToast('Формула удалена', 'success');
        setTimeout(() => window.location.href = 'add-deal.html', 600);
    } catch (err) {
        showToast(err.message, 'info');
    }
});

// Загружаем при старте
loadFormula();