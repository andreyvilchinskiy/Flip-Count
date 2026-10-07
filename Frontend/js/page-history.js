/* ============================================
   ИСТОРИЯ СДЕЛОК (history.html)
   ============================================
   Содержит:
   - Загрузку списка сделок
   - Переключение График/Текст
   - Отрисовку графика на canvas
   - Зум и панорамирование
   - Выделение и удаление сделок
   ============================================ */

/* ---------- СОСТОЯНИЕ ---------- */
let allDeals = [];
let selectedDeals = new Set();
let activeView = 'chart';

let canvas, ctx;
let zoom = 1;
let offsetX = 0, offsetY = 0;
let hoverDeal = null;
let pendingDraw = false;
let lastMouseEvent = null;

let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let dragStartOffsetX = 0, dragStartOffsetY = 0;

let wheelAccum = 0;
const WHEEL_THRESHOLD = 100;

/* ---------- ЗАГРУЗКА ДАННЫХ ---------- */
async function loadHistory() {
    try {
        const profiles = await API.getProfiles();
        const active = profiles.find(p => p.active);
        if (!active) {
            showEmpty();
            return;
        }

        const deals = await API.getDeals(active.id);
        allDeals = Array.isArray(deals) ? deals : [];
        selectedDeals.clear();

        if (allDeals.length === 0) {
            showEmpty();
            return;
        }

        document.getElementById('emptyHistory').style.display = 'none';
        zoomIndex = 5;
        zoom = 1;
        offsetX = 0;
        offsetY = 0;

        if (canvas) clampOffsets(true);
        renderAll();
    } catch (err) {
        showToast(err.message, 'info');
    }
}

function showEmpty() {
    document.getElementById('emptyHistory').style.display = 'block';
    document.getElementById('viewChart').style.display = 'none';
    document.getElementById('viewText').style.display = 'none';
    updateFooter();
}

/* ---------- ПЕРЕКЛЮЧЕНИЕ ВИДА ---------- */
document.querySelectorAll('.history-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.history-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeView = tab.dataset.view;
        renderAll();
    });
});

function renderAll() {
    document.getElementById('viewChart').style.display = activeView === 'chart' ? 'block' : 'none';
    document.getElementById('viewText').style.display = activeView === 'text' ? 'block' : 'none';

    if (activeView === 'chart') {
        if (canvas) resizeCanvas();
        requestDraw();
    }
    if (activeView === 'text') renderText();

    updateFooter();
}

/* ---------- CANVAS ---------- */
function initCanvas() {
    canvas = document.getElementById('dealsCanvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();

    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('mousemove', onCanvasMove);
    canvas.addEventListener('wheel', onCanvasWheel, { passive: false });
    canvas.addEventListener('mousedown', onCanvasMouseDown);
    canvas.addEventListener('mouseup', onCanvasMouseUp);
    canvas.addEventListener('mouseleave', () => {
        hoverDeal = null;
        lastMouseEvent = null;
        requestDraw();
    });
}

function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    if (rect.width === 0) return;
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}

function requestDraw() {
    if (pendingDraw) return;
    pendingDraw = true;
    requestAnimationFrame(() => {
        pendingDraw = false;
        drawChart();
    });
}

/* ---------- LAYOUT ---------- */
function getLayout() {
    const W = canvas.width / window.devicePixelRatio;
    const H = canvas.height / window.devicePixelRatio;

    const padX = 60, padY = 40;
    const chartW = W - padX * 2;
    const chartH = H - padY * 2;

    const sorted = [...allDeals].sort((a, b) =>
        new Date(a.createdAt) - new Date(b.createdAt)
    );

    let cumulative = 0;
    const points = sorted.map(deal => {
        cumulative += parseFloat(deal.profit || 0);
        return { deal, cumulative: parseFloat(cumulative.toFixed(2)) };
    });

    const values = points.map(p => p.cumulative);
    const maxY = Math.max(...values, 0);
    const minY = Math.min(...values, 0);
    const rangeY = Math.max(maxY - minY, 1);

    const scaleY = (chartH / rangeY) * zoom;
    const scaleX = (chartW / Math.max(points.length - 1, 1)) * zoom;

    const zeroY = padY + chartH - (0 - minY) * scaleY + offsetY;

    return { W, H, padX, padY, chartW, chartH, sorted, points, maxY, minY, rangeY, scaleX, scaleY, zeroY, totalProfit: cumulative };
}

/* ---------- ОТРИСОВКА ---------- */
function drawChart() {
    if (!ctx) return;
    const { W, H, padX, padY, chartW, chartH, points, maxY, minY, scaleX, scaleY, zeroY } = getLayout();

    ctx.clearRect(0, 0, W, H);
    if (points.length === 0) return;

    drawAxes(W, H, padX, padY, chartW, chartH, zeroY, maxY, minY, scaleY);

    const coords = points.map((p, i) => ({
        x: padX + i * scaleX + offsetX,
        y: zeroY - p.cumulative * scaleY,
        point: p
    }));

    // Заливка под кривой
    if (coords.length > 1) {
        ctx.beginPath();
        ctx.moveTo(coords[0].x, zeroY);
        drawSmoothPath(coords);
        ctx.lineTo(coords[coords.length - 1].x, zeroY);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, padY, 0, zeroY);
        grad.addColorStop(0, 'rgba(139, 92, 246, 0.25)');
        grad.addColorStop(1, 'rgba(139, 92, 246, 0)');
        ctx.fillStyle = grad;
        ctx.fill();
    }

    // Плавная линия
    if (coords.length > 1) {
        ctx.beginPath();
        ctx.moveTo(coords[0].x, coords[0].y);
        drawSmoothPath(coords);
        ctx.strokeStyle = '#A5B4FC';
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    // Точки
    coords.forEach(({ x, y, point }) => {
        if (x < padX - 30 || x > W - padX + 30) return;

        const isSelected = selectedDeals.has(point.deal.id);
        const isHover = hoverDeal && hoverDeal.id === point.deal.id;

        if (isHover) {
            ctx.beginPath();
            ctx.arc(x, y, 14, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(165, 180, 252, 0.25)';
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(x, y, isSelected ? 8 : (isHover ? 7 : 5), 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? '#A5B4FC' : (point.cumulative >= 0 ? '#34D399' : '#EF4444');
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
    });

    drawXLabels(points, padX, H - padY + 8, scaleX, W);

    if (hoverDeal && lastMouseEvent) {
        const hp = points.find(p => p.deal.id === hoverDeal.id);
        if (hp) drawTooltip(hp, W, H);
    }
}

function drawSmoothPath(coords) {
    if (coords.length < 2) return;
    const tension = 0.4;

    for (let i = 0; i < coords.length - 1; i++) {
        const p0 = coords[i - 1] || coords[i];
        const p1 = coords[i];
        const p2 = coords[i + 1];
        const p3 = coords[i + 2] || p2;

        const cp1x = p1.x + (p2.x - p0.x) * tension / 6;
        const cp1y = p1.y + (p2.y - p0.y) * tension / 6;
        const cp2x = p2.x - (p3.x - p1.x) * tension / 6;
        const cp2y = p2.y - (p3.y - p1.y) * tension / 6;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
}

function drawAxes(W, H, padX, padY, chartW, chartH, zeroY, maxY, minY, scaleY) {
    if (zeroY >= padY && zeroY <= H - padY) {
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(padX, zeroY);
        ctx.lineTo(W - padX, zeroY);
        ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, padY);
    ctx.lineTo(padX, H - padY);
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const steps = 5;
    for (let i = 0; i <= steps; i++) {
        const value = minY + ((maxY - minY) / steps) * i;
        const y = zeroY - value * scaleY;
        if (y < padY - 5 || y > H - padY + 5) continue;

        ctx.fillText(value.toFixed(0) + ' ₽', padX - 8, y);

        ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padX, y);
        ctx.lineTo(W - padX, y);
        ctx.stroke();
    }
}

function drawXLabels(points, startX, y, scaleX, W) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const step = Math.max(1, Math.floor(points.length / 10));
    for (let i = 0; i < points.length; i += step) {
        const x = startX + i * scaleX + offsetX;
        if (x < startX - 40 || x > W - 20) continue;

        const date = new Date(points[i].deal.createdAt);
        const label = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) +
                    ' ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        ctx.fillText(label, x, y);
    }
}

function drawTooltip(point, W, H) {
    const profit = parseFloat(point.deal.profit);
    const cumulative = point.cumulative;

    const profitWord = profit < 0 ? 'Убыль' : 'Прибыль';
    const cumulativeWord = cumulative < 0 ? 'Общая убыль' : 'Общая прибыль';

    const text1 = profitWord + ': ' + profit.toFixed(2) + ' ₽';
    const text2 = cumulativeWord + ': ' + cumulative.toFixed(2) + ' ₽';
    const text3 = new Date(point.deal.createdAt).toLocaleString('ru-RU');

    ctx.font = 'bold 12px sans-serif';
    const w1 = ctx.measureText(text1).width;
    const w2 = ctx.measureText(text2).width;
    ctx.font = '11px sans-serif';
    const w3 = ctx.measureText(text3).width;
    const tooltipW = Math.max(w1, w2, w3) + 24;
    const tooltipH = 72;

    const mouse = getMousePos(lastMouseEvent);
    let tx = mouse.x + 16;
    let ty = mouse.y - tooltipH - 10;

    if (tx + tooltipW > W - 10) tx = mouse.x - tooltipW - 16;
    if (ty < 10) ty = mouse.y + 16;
    if (ty + tooltipH > H - 10) ty = H - tooltipH - 10;
    if (tx < 10) tx = 10;

    ctx.fillStyle = 'rgba(20, 25, 70, 0.97)';
    ctx.strokeStyle = '#8B5CF6';
    ctx.lineWidth = 1.5;
    roundRect(ctx, tx, ty, tooltipW, tooltipH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.fillStyle = profit < 0 ? '#EF4444' : '#34D399';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(text1, tx + 12, ty + 8);

    ctx.fillStyle = cumulative < 0 ? '#FCA5A5' : '#A5B4FC';
    ctx.fillText(text2, tx + 12, ty + 26);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '11px sans-serif';
    ctx.fillText(text3, tx + 12, ty + 46);
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

/* ---------- СОБЫТИЯ МЫШИ ---------- */
function onCanvasClick(e) {
    if (isDragging) return;
    const deal = findDealAtPoint(e);

    if (!deal) {
        if (!e.ctrlKey && !e.metaKey) {
            selectedDeals.clear();
            updateFooter();
            requestDraw();
        }
        return;
    }

    if (e.ctrlKey || e.metaKey) {
        if (selectedDeals.has(deal.id)) selectedDeals.delete(deal.id);
        else selectedDeals.add(deal.id);
    } else {
        selectedDeals.clear();
        selectedDeals.add(deal.id);
    }

    updateFooter();
    requestDraw();
}

function onCanvasMove(e) {
    lastMouseEvent = e;

    if (isDragging) {
        offsetX = dragStartOffsetX + (e.clientX - dragStartX);
        offsetY = dragStartOffsetY + (e.clientY - dragStartY);
        clampOffsets();
        requestDraw();
        return;
    }

    const deal = findDealAtPoint(e);
    const prevId = hoverDeal ? hoverDeal.id : null;
    const newId = deal ? deal.id : null;

    if (prevId !== newId) {
        hoverDeal = deal;
        requestDraw();
    } else if (hoverDeal) {
        requestDraw();
    }
}

function findDealAtPoint(e) {
    if (!canvas || allDeals.length === 0) return null;
    const mouse = getMousePos(e);
    const { padX, points, scaleX, scaleY, zeroY } = getLayout();

    let best = null;
    let bestDist = 15;

    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const x = padX + i * scaleX + offsetX;
        const y = zeroY - p.cumulative * scaleY;

        const dist = Math.hypot(mouse.x - x, mouse.y - y);
        if (dist < bestDist) {
            bestDist = dist;
            best = p.deal;
        }
    }
    return best;
}

/* ---------- ЗУМ ---------- */
const ZOOM_LEVELS = [
    0.5, 0.6, 0.7, 0.8, 0.9, 1.0,
    1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 2.0,
    2.2, 2.5, 2.8, 3.2, 3.6, 4.0, 4.5, 5.0
];
let zoomIndex = 5;

function getZoom() { return ZOOM_LEVELS[zoomIndex]; }

function setZoomIndex(index) {
    zoomIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, index));
    const newZoom = getZoom();
    const factor = newZoom / zoom;
    zoom = newZoom;

    if (canvas) {
        const W = canvas.width / window.devicePixelRatio;
        const H = canvas.height / window.devicePixelRatio;
        const centerX = W / 2;
        const centerY = H / 2;
        offsetX = centerX - (centerX - offsetX) * factor;
        offsetY = centerY - (centerY - offsetY) * factor;
    }

    clampOffsets();
    updateZoomLabel();
    requestDraw();
}

function updateZoomLabel() {
    const el = document.getElementById('zoomLevel');
    if (el) el.textContent = Math.round(getZoom() * 100) + '%';
}

function onCanvasWheel(e) {
    e.preventDefault();
    wheelAccum += e.deltaY;

    while (Math.abs(wheelAccum) >= WHEEL_THRESHOLD) {
        if (wheelAccum > 0) {
            if (zoomIndex > 0) setZoomIndex(zoomIndex - 1);
            wheelAccum -= WHEEL_THRESHOLD;
        } else {
            if (zoomIndex < ZOOM_LEVELS.length - 1) setZoomIndex(zoomIndex + 1);
            wheelAccum += WHEEL_THRESHOLD;
        }
    }

    if (zoomIndex === 0 || zoomIndex === ZOOM_LEVELS.length - 1) {
        if ((zoomIndex === 0 && wheelAccum > 0) ||
            (zoomIndex === ZOOM_LEVELS.length - 1 && wheelAccum < 0)) {
            wheelAccum = 0;
        }
    }
}

document.getElementById('zoomIn').addEventListener('click', () => setZoomIndex(zoomIndex + 1));
document.getElementById('zoomOut').addEventListener('click', () => setZoomIndex(zoomIndex - 1));

function clampOffsets(autoScrollToLast = false) {
    if (!canvas) return;
    const W = canvas.width / window.devicePixelRatio;
    const H = canvas.height / window.devicePixelRatio;
    const padX = 60, padY = 40;
    const chartW = W - padX * 2;
    const chartH = H - padY * 2;

    const sorted = [...allDeals].sort((a, b) =>
        new Date(a.createdAt) - new Date(b.createdAt)
    );
    if (sorted.length === 0) return;

    let cumulative = 0;
    const values = sorted.map(d => {
        cumulative += parseFloat(d.profit || 0);
        return cumulative;
    });

    const maxY = Math.max(...values, 0);
    const minY = Math.min(...values, 0);
    const rangeY = Math.max(maxY - minY, 1);

    const scaleX = (chartW / Math.max(sorted.length - 1, 1)) * zoom;
    const scaleY = (chartH / rangeY) * zoom;

    const n = sorted.length;
    if (n === 1) {
        offsetX = 0;
    } else {
        const totalWidth = (n - 1) * scaleX;
        const visibleW = chartW;

        if (totalWidth <= visibleW) {
            offsetX = 0;
        } else {
            const minOffsetX = visibleW - totalWidth;
            const maxOffsetX = 0;
            if (autoScrollToLast) offsetX = minOffsetX;
            else offsetX = Math.max(minOffsetX, Math.min(maxOffsetX, offsetX));
        }
    }

    const maxUp = chartH * 0.3;
    const maxDown = chartH * 0.3;
    offsetY = Math.max(-maxUp, Math.min(maxDown, offsetY));
}

/* ---------- DRAG ---------- */
function onCanvasMouseDown(e) {
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartOffsetX = offsetX;
    dragStartOffsetY = offsetY;
    isDragging = false;

    const startX = e.clientX;
    const startY = e.clientY;

    const checkDrag = (moveE) => {
        const dx = Math.abs(moveE.clientX - startX);
        const dy = Math.abs(moveE.clientY - startY);
        if (dx > 3 || dy > 3) {
            isDragging = true;
            canvas.style.cursor = 'grabbing';
            document.removeEventListener('mousemove', checkDrag);
        }
    };

    document.addEventListener('mousemove', checkDrag);
    document.addEventListener('mouseup', () => {
        document.removeEventListener('mousemove', checkDrag);
    }, { once: true });
}

function onCanvasMouseUp() {
    isDragging = false;
    if (canvas) canvas.style.cursor = 'default';
}

/* ---------- ТЕКСТОВЫЙ ВИД ---------- */
function renderText() {
    const container = document.getElementById('dealsText');
    container.innerHTML = '';
    if (allDeals.length === 0) return;

    [...allDeals].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    ).forEach(deal => {
        const div = document.createElement('div');
        div.className = 'deal-text-item';
        if (selectedDeals.has(deal.id)) div.classList.add('selected');

        const profit = parseFloat(deal.profit);
        const profitClass = profit < 0 ? 'negative' : 'positive';
        const profitWord = profit < 0 ? 'Убыль' : 'Прибыль';

        div.innerHTML = `
            <div class="deal-text-header">
                <span class="deal-text-date">${new Date(deal.createdAt).toLocaleString('ru-RU')}</span>
                <span class="deal-text-profit ${profitClass}">${profitWord}: ${profit.toFixed(2)} ₽</span>
            </div>
            <div class="deal-text-formula">Формула: ${deal.formulaUsed || '—'}</div>
        `;

        div.addEventListener('click', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (selectedDeals.has(deal.id)) selectedDeals.delete(deal.id);
                else selectedDeals.add(deal.id);
            } else {
                selectedDeals.clear();
                selectedDeals.add(deal.id);
            }
            updateFooter();
            renderText();
        });

        container.appendChild(div);
    });
}

/* ---------- НИЖНЯЯ ПОЛОСА ---------- */
function updateFooter() {
    const profitEl = document.getElementById('totalValue');
    const labelEl = document.getElementById('totalLabel');
    const profitBox = document.getElementById('totalProfit');
    const deleteBtn = document.getElementById('deleteSelectedBtn');

    const deals = selectedDeals.size > 0
        ? allDeals.filter(d => selectedDeals.has(d.id))
        : allDeals;

    const total = deals.reduce((sum, d) => sum + parseFloat(d.profit || 0), 0);

    profitEl.textContent = total.toFixed(2) + ' ₽';

    if (total < 0) {
        labelEl.textContent = 'Общая убыль';
        profitBox.classList.add('negative');
    } else {
        labelEl.textContent = 'Общая прибыль';
        profitBox.classList.remove('negative');
    }

    deleteBtn.disabled = selectedDeals.size === 0;
}

/* ---------- УДАЛЕНИЕ ---------- */
document.getElementById('deleteSelectedBtn').addEventListener('click', () => {
    if (selectedDeals.size === 0) return;

    const count = selectedDeals.size;
    document.getElementById('confirmText').textContent =
        'Вы точно хотите удалить ' + count + ' ' +
        pluralize(count, 'сделку', 'сделки', 'сделок') + '?';
    document.getElementById('confirmModal').classList.add('show');
});

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('show');
}

async function confirmDelete() {
    const ids = Array.from(selectedDeals);
    try {
        await API.deleteDealsBatch(ids);
        showToast('Удалено: ' + ids.length, 'success');
        selectedDeals.clear();
        closeConfirmModal();
        loadHistory();
    } catch (err) {
        showToast(err.message, 'info');
    }
}

function pluralize(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
}

/* ---------- СТАРТ ---------- */
window.addEventListener('load', () => {
    initCanvas();
    loadHistory();
});

window.addEventListener('resize', () => {
    if (!canvas) return;
    resizeCanvas();
    clampOffsets();
    requestDraw();
});