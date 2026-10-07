/* ============================================
   РЕДАКТОР КРАФТОВ (combined.html)
   ============================================
   Визуальный редактор в стиле Miro/draw.io.
   Пользователь добавляет фигуры, соединяет их стрелками,
   система автоматически строит формулу прибыли.

   Режимы:
   - select — выбор и перемещение фигур (ЛКМ на пустом — панорамирование)
   - link   — создание связей между фигурами
   - rect/circle/diamond — добавление фигур
   ============================================ */

/* ---------- DOM-ЭЛЕМЕНТЫ ---------- */
const svg = document.getElementById('craftSvg');
const viewport = document.getElementById('viewport');
const nodesLayer = document.getElementById('nodesLayer');
const edgesLayer = document.getElementById('edgesLayer');
const editor = document.getElementById('craftEditor');

/* ---------- СОСТОЯНИЕ РЕДАКТОРА ---------- */
let editingCraftId = null;       // ID редактируемого крафта (null — новый)
let currentCraftName = null;     // имя редактируемого крафта

let nodes = [];                  // массив фигур
let edges = [];                  // массив стрелок
let nextTempId = 1;              // временный ID для фигур
let nextVariable = 0;            // счётчик переменных A, B, C...

let currentMode = 'select';      // текущий режим
let selectedNodeTempId = null;   // выделенная фигура
let selectedEdgeIndex = null;    // выделенная стрелка
let linkingFrom = null;          // временный ID начала стрелки

// Панорамирование и зум
let view = { x: 0, y: 0, scale: 1 };
let isPanning = false;
let panStart = { x: 0, y: 0 };
let viewStart = { x: 0, y: 0 };

// Drag фигуры
let draggingNode = null;
let dragOffset = { x: 0, y: 0 };

// Resize фигуры
let resizing = null;

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/* ============================================
   ПЕРЕКЛЮЧЕНИЕ РЕЖИМОВ
   ============================================ */
document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.craft-tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
        linkingFrom = null;
        updateHint();
    });
});

document.querySelectorAll('[data-shape]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.craft-tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.shape;
        updateHint();
    });
});

/* ============================================
   ПРЕОБРАЗОВАНИЕ КООРДИНАТ
   ============================================ */
/** Экранные координаты → мировые (с учётом view-трансформации) */
function screenToWorld(clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    return {
        x: (sx - view.x) / view.scale,
        y: (sy - view.y) / view.scale
    };
}

/* ============================================
   ДОБАВЛЕНИЕ ФИГУРЫ
   ============================================ */
svg.addEventListener('click', (e) => {
    if (e.target.closest('.craft-node')) return;
    if (e.target.closest('.resize-handle')) return;

    // Режим добавления фигуры — создаём по клику
    if (['rect', 'circle', 'diamond'].includes(currentMode)) {
        const pt = screenToWorld(e.clientX, e.clientY);
        addNode(currentMode, pt.x, pt.y);
        currentMode = 'select';
        document.querySelectorAll('.craft-tool-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('modeCursor').classList.add('active');
        updateHint();
    } else if (currentMode === 'select') {
        // Клик по пустому полю — снимаем выделение
        selectedNodeTempId = null;
        selectedEdgeIndex = null;
        document.getElementById('propsPanel').style.display = 'none';
        document.getElementById('edgePropsPanel').style.display = 'none';
        render();
    }
});

/** Создать фигуру с автоматической переменной A, B, C... */
function addNode(shape, x, y) {
    const variable = alphabet[nextVariable % 26] +
        (nextVariable >= 26 ? Math.floor(nextVariable / 26) : '');
    nextVariable++;

    nodes.push({
        tempId: nextTempId++,
        variable,
        label: 'Новый',
        shape,
        x, y,
        width: 100,
        height: 50,
        price: null,
        output: 1
    });

    render();
    selectNode(nodes[nodes.length - 1].tempId);
    updateFormula();
}

/* ============================================
   ОТРИСОВКА ВСЕГО РЕДАКТОРА
   ============================================ */
function render() {
    // Применяем трансформацию к viewport
    viewport.setAttribute('transform',
        `translate(${view.x}, ${view.y}) scale(${view.scale})`);

    nodesLayer.innerHTML = '';
    edgesLayer.innerHTML = '';

    /* --- Стрелки (рисуем первыми, под фигурами) --- */
    edges.forEach((edge, index) => {
        const from = nodes.find(n => n.tempId === edge.fromTempId);
        const to = nodes.find(n => n.tempId === edge.toTempId);
        if (!from || !to) return;

        const path = createEdgePath(from, to);
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.classList.add('craft-edge');

        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', path.d);
        g.appendChild(pathEl);

        // Число на стрелке (количество)
        const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textEl.setAttribute('x', path.midX);
        textEl.setAttribute('y', path.midY - 4);
        textEl.textContent = edge.quantity;
        g.appendChild(textEl);

        g.addEventListener('click', (e) => {
            e.stopPropagation();
            selectEdge(index);
        });

        edgesLayer.appendChild(g);
    });

    /* --- Фигуры --- */
    nodes.forEach(node => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.classList.add('craft-node');
        g.dataset.tempId = node.tempId;

        if (selectedNodeTempId === node.tempId) g.classList.add('selected');

        const w = node.width || 100;
        const h = node.height || 50;
        const x = node.x - w / 2;
        const y = node.y - h / 2;

        // Создаём фигуру нужной формы
        let shape;
        if (node.shape === 'rect') {
            shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            shape.setAttribute('x', x);
            shape.setAttribute('y', y);
            shape.setAttribute('width', w);
            shape.setAttribute('height', h);
            shape.setAttribute('rx', 10);
        } else if (node.shape === 'circle') {
            shape = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            shape.setAttribute('cx', node.x);
            shape.setAttribute('cy', node.y);
            shape.setAttribute('rx', w / 2);
            shape.setAttribute('ry', h / 2);
        } else {
            shape = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            shape.setAttribute('points', `
                ${node.x},${y - 5}
                ${node.x + w / 2},${node.y}
                ${node.x},${y + h + 5}
                ${node.x - w / 2},${node.y}
            `);
        }
        g.appendChild(shape);

        // Название (по центру)
        const labelEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        labelEl.setAttribute('x', node.x);
        labelEl.setAttribute('y', node.y + 5);
        labelEl.setAttribute('text-anchor', 'middle');
        labelEl.textContent = node.label;
        g.appendChild(labelEl);

        // Переменная (A, B, C...) над фигурой
        const varEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        varEl.setAttribute('x', node.x);
        varEl.setAttribute('y', y - 8);
        varEl.setAttribute('text-anchor', 'middle');
        varEl.classList.add('node-variable');
        varEl.textContent = node.variable;
        g.appendChild(varEl);

        // Бейдж output (если > 1) — правый верхний угол
        if (node.output && node.output > 1) {
            const outputBadge = document.createElementNS('http://www.w3.org/2000/svg', 'g');

            const badgeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            badgeRect.setAttribute('x', x + w - 24);
            badgeRect.setAttribute('y', y + 4);
            badgeRect.setAttribute('width', 20);
            badgeRect.setAttribute('height', 16);
            badgeRect.setAttribute('rx', 4);
            badgeRect.setAttribute('fill', '#8B5CF6');
            outputBadge.appendChild(badgeRect);

            const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            badgeText.setAttribute('x', x + w - 14);
            badgeText.setAttribute('y', y + 16);
            badgeText.setAttribute('text-anchor', 'middle');
            badgeText.setAttribute('fill', '#ffffff');
            badgeText.setAttribute('font-size', '11');
            badgeText.setAttribute('font-weight', '700');
            badgeText.textContent = node.output;
            outputBadge.appendChild(badgeText);

            g.appendChild(outputBadge);
        }

        // Обработчики
        g.addEventListener('mousedown', (e) => startDrag(e, node));
        g.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentMode === 'link') {
                handleLinkClick(node);
            } else if (currentMode === 'select') {
                selectNode(node.tempId);
            }
        });

        nodesLayer.appendChild(g);

        // Маркеры ресайза — только если фигура выделена
        if (selectedNodeTempId === node.tempId && currentMode === 'select') {
            const handles = [
                { x: x, y: y, cursor: 'nw' },
                { x: x + w, y: y, cursor: 'ne' },
                { x: x + w, y: y + h, cursor: 'se' },
                { x: x, y: y + h, cursor: 'sw' }
            ];
            handles.forEach(hd => {
                const handle = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                handle.setAttribute('x', hd.x - 5);
                handle.setAttribute('y', hd.y - 5);
                handle.setAttribute('width', 10);
                handle.setAttribute('height', 10);
                handle.setAttribute('rx', 2);
                handle.classList.add('resize-handle', hd.cursor);
                handle.addEventListener('mousedown', (e) => startResize(e, node, hd.cursor));
                nodesLayer.appendChild(handle);
            });
        }
    });
}

/* ============================================
   ПУТЬ СТРЕЛКИ МЕЖДУ ДВУМЯ ФИГУРАМИ
   ============================================ */
function createEdgePath(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    // Отступ от края фигуры
    const r1 = Math.max(from.width || 100, from.height || 50) / 2 + 5;
    const r2 = Math.max(to.width || 100, to.height || 50) / 2 + 15;

    const nx = dx / dist;
    const ny = dy / dist;

    const x1 = from.x + nx * r1;
    const y1 = from.y + ny * r1;
    const x2 = to.x - nx * r2;
    const y2 = to.y - ny * r2;

    // Слегка изогнутая линия (для красоты)
    const midX = (x1 + x2) / 2 + (y2 - y1) * 0.1;
    const midY = (y1 + y2) / 2 - (x2 - x1) * 0.1;

    return {
        d: `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`,
        midX,
        midY
    };
}

/* ============================================
   DRAG ФИГУРЫ
   ============================================ */
function startDrag(e, node) {
    if (currentMode === 'link') return;
    if (currentMode !== 'select') return;

    e.preventDefault();
    e.stopPropagation();

    const pt = screenToWorld(e.clientX, e.clientY);
    draggingNode = node;
    dragOffset.x = pt.x - node.x;
    dragOffset.y = pt.y - node.y;

    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
}

function onDragMove(e) {
    if (!draggingNode) return;
    const pt = screenToWorld(e.clientX, e.clientY);
    draggingNode.x = pt.x - dragOffset.x;
    draggingNode.y = pt.y - dragOffset.y;
    render();
}

function onDragEnd() {
    draggingNode = null;
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    updateFormula();
}

/* ============================================
   РЕСАЙЗ ФИГУРЫ (тянуть за угол)
   ============================================ */
function startResize(e, node, corner) {
    e.preventDefault();
    e.stopPropagation();
    resizing = {
        node,
        corner,
        startX: e.clientX,
        startY: e.clientY,
        startW: node.width,
        startH: node.height
    };
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeEnd);
}

function onResizeMove(e) {
    if (!resizing) return;
    const dx = (e.clientX - resizing.startX) / view.scale;
    const dy = (e.clientY - resizing.startY) / view.scale;

    let newW = resizing.startW;
    let newH = resizing.startH;

    if (resizing.corner === 'se') {
        newW = Math.max(40, resizing.startW + dx * 2);
        newH = Math.max(30, resizing.startH + dy * 2);
    } else if (resizing.corner === 'sw') {
        newW = Math.max(40, resizing.startW - dx * 2);
        newH = Math.max(30, resizing.startH + dy * 2);
    } else if (resizing.corner === 'ne') {
        newW = Math.max(40, resizing.startW + dx * 2);
        newH = Math.max(30, resizing.startH - dy * 2);
    } else if (resizing.corner === 'nw') {
        newW = Math.max(40, resizing.startW - dx * 2);
        newH = Math.max(30, resizing.startH - dy * 2);
    }

    resizing.node.width = newW;
    resizing.node.height = newH;
    render();
}

function onResizeEnd() {
    resizing = null;
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeEnd);
}

/* ============================================
   ПАНОРАМИРОВАНИЕ (ЛКМ по пустому, ПКМ, СКМ)
   ============================================ */
editor.addEventListener('mousedown', (e) => {
    const isEmptyClick = e.button === 0
        && currentMode === 'select'
        && !e.target.closest('.craft-node')
        && !e.target.closest('.craft-props')
        && !e.target.closest('.craft-toolbar')
        && !e.target.closest('.craft-zoom-controls')
        && !e.target.closest('.craft-hint');

    if (e.button === 1 || e.button === 2 || isEmptyClick) {
        if (e.target.closest('.craft-props') || e.target.closest('.craft-toolbar')) return;
        e.preventDefault();
        isPanning = true;
        panStart = { x: e.clientX, y: e.clientY };
        viewStart = { x: view.x, y: view.y };
        editor.classList.add('dragging');
        document.addEventListener('mousemove', onPanMove);
        document.addEventListener('mouseup', onPanEnd);
    }
});

editor.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

function onPanMove(e) {
    if (!isPanning) return;
    view.x = viewStart.x + (e.clientX - panStart.x);
    view.y = viewStart.y + (e.clientY - panStart.y);
    render();
}

function onPanEnd() {
    isPanning = false;
    editor.classList.remove('dragging');
    document.removeEventListener('mousemove', onPanMove);
    document.removeEventListener('mouseup', onPanEnd);
}

/* ============================================
   ЗУМ
   ============================================ */
const ZOOM_LEVELS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];
let zoomIndex = 6;  // 100%

function setZoomIndex(idx, mouseX, mouseY) {
    const newIdx = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, idx));
    if (newIdx === zoomIndex) return;

    const oldScale = view.scale;
    zoomIndex = newIdx;
    const newScale = ZOOM_LEVELS[zoomIndex];

    if (mouseX !== undefined) {
        view.x = mouseX - (mouseX - view.x) * (newScale / oldScale);
        view.y = mouseY - (mouseY - view.y) * (newScale / oldScale);
    } else {
        const rect = svg.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        view.x = cx - (cx - view.x) * (newScale / oldScale);
        view.y = cy - (cy - view.y) * (newScale / oldScale);
    }

    view.scale = newScale;
    document.getElementById('zoomLevelCraft').textContent = Math.round(view.scale * 100) + '%';
    render();
}

editor.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (e.deltaY > 0) setZoomIndex(zoomIndex - 1, mx, my);
    else setZoomIndex(zoomIndex + 1, mx, my);
}, { passive: false });

document.getElementById('zoomInCraft').addEventListener('click', () => setZoomIndex(zoomIndex + 1));
document.getElementById('zoomOutCraft').addEventListener('click', () => setZoomIndex(zoomIndex - 1));

/* ============================================
   СОЗДАНИЕ СВЯЗИ (СТРЕЛКИ)
   ============================================ */
function handleLinkClick(node) {
    if (!linkingFrom) {
        linkingFrom = node.tempId;
        showToast('Выберите вторую фигуру для связи', 'info');
        updateHint();
        return;
    }

    if (linkingFrom === node.tempId) {
        linkingFrom = null;
        updateHint();
        return;
    }

    const exists = edges.some(e =>
        e.fromTempId === linkingFrom && e.toTempId === node.tempId
    );
    if (exists) {
        showToast('Такая связь уже есть', 'info');
        linkingFrom = null;
        updateHint();
        return;
    }

    edges.push({
        fromTempId: linkingFrom,
        toTempId: node.tempId,
        quantity: 1
    });

    linkingFrom = null;
    render();
    updateFormula();
    updateHint();
}

/* ============================================
   ВЫДЕЛЕНИЕ
   ============================================ */
function selectNode(tempId) {
    selectedNodeTempId = tempId;
    selectedEdgeIndex = null;

    const node = nodes.find(n => n.tempId === tempId);
    if (!node) {
        document.getElementById('propsPanel').style.display = 'none';
        render();
        return;
    }

    document.getElementById('edgePropsPanel').style.display = 'none';
    document.getElementById('propsPanel').style.display = 'block';
    document.getElementById('propLabel').value = node.label;
    document.getElementById('propPrice').value = node.price || '';
    document.getElementById('propOutput').value = node.output || 1;
    render();
}

function selectEdge(index) {
    selectedEdgeIndex = index;
    selectedNodeTempId = null;

    document.getElementById('propsPanel').style.display = 'none';
    document.getElementById('edgePropsPanel').style.display = 'block';
    document.getElementById('propQuantity').value = edges[index].quantity;
    render();
}

/* ============================================
   ИЗМЕНЕНИЕ СВОЙСТВ
   ============================================ */
document.getElementById('propLabel').addEventListener('input', (e) => {
    const node = nodes.find(n => n.tempId === selectedNodeTempId);
    if (node) {
        node.label = e.target.value || 'Без названия';
        render();
    }
});

document.getElementById('propPrice').addEventListener('input', (e) => {
    const node = nodes.find(n => n.tempId === selectedNodeTempId);
    if (node) {
        node.price = parseFloat(e.target.value) || null;
        updateFormula();
    }
});

document.getElementById('propOutput').addEventListener('input', (e) => {
    const node = nodes.find(n => n.tempId === selectedNodeTempId);
    if (node) {
        node.output = parseInt(e.target.value) || 1;
        updateFormula();
        render();
    }
});

document.getElementById('propQuantity').addEventListener('input', (e) => {
    if (selectedEdgeIndex === null) return;
    const q = parseInt(e.target.value) || 1;
    edges[selectedEdgeIndex].quantity = q;
    render();
    updateFormula();
});

document.getElementById('deleteNodeBtn').addEventListener('click', () => {
    if (selectedNodeTempId === null) return;
    nodes = nodes.filter(n => n.tempId !== selectedNodeTempId);
    edges = edges.filter(e =>
        e.fromTempId !== selectedNodeTempId && e.toTempId !== selectedNodeTempId
    );
    selectedNodeTempId = null;
    document.getElementById('propsPanel').style.display = 'none';
    render();
    updateFormula();
});

document.getElementById('deleteEdgeBtn').addEventListener('click', () => {
    if (selectedEdgeIndex === null) return;
    edges.splice(selectedEdgeIndex, 1);
    selectedEdgeIndex = null;
    document.getElementById('edgePropsPanel').style.display = 'none';
    render();
    updateFormula();
});

/* ============================================
   ФОРМУЛА — построение и отображение
   ============================================ */
function updateFormula() {
    const body = document.getElementById('formulaBody');
    body.innerHTML = '';

    const withOutgoing = new Set(edges.map(e => e.fromTempId));
    const finals = nodes.filter(n => !withOutgoing.has(n.tempId));

    if (nodes.length < 2 || finals.length === 0) {
        body.innerHTML = '<div class="formula-placeholder">Добавьте фигуры и связи, чтобы построить формулу</div>';
        return '';
    }

    const finalNode = finals[finals.length - 1];
    const buildResult = buildPrettyExpression(finalNode.tempId, new Set());

    if (!buildResult) {
        body.innerHTML = '<div class="formula-placeholder">Не удалось построить формулу</div>';
        return '';
    }

    renderPrettyFormula(body, buildResult, finalNode);
    return buildResult.plain + ' = ' + finalNode.variable + ' (продажа)';
}

/**
 * Рекурсивное построение выражения.
 * Каждая часть возвращается в виде:
 * { tokens: [{type,text}], plain: string, simple: bool }
 */
function buildPrettyExpression(nodeTempId, visited) {
    if (visited.has(nodeTempId)) return null;
    visited.add(nodeTempId);

    const node = nodes.find(n => n.tempId === nodeTempId);
    if (!node) return null;

    const incoming = edges.filter(e => e.toTempId === nodeTempId);

    // Базовый узел — просто переменная
    if (incoming.length === 0) {
        return {
            tokens: [{ type: 'var', text: node.variable }],
            plain: node.variable,
            simple: true
        };
    }

    const parts = incoming.map(edge => {
        const from = nodes.find(n => n.tempId === edge.fromTempId);
        if (!from) return null;

        const subExpr = buildPrettyExpression(from.tempId, new Set(visited));

        let tokens = [...subExpr.tokens];
        let plain = subExpr.plain;
        let simple = subExpr.simple;

        // Деление на output (если узел производит >1 за крафт)
        const output = from.output || 1;
        if (output > 1) {
            if (!simple) {
                tokens = [{ type: 'op', text: '(' }, ...tokens, { type: 'op', text: ')' }];
                plain = `(${plain})`;
            }
            tokens.push({ type: 'op', text: '/' });
            tokens.push({ type: 'num', text: output });
            plain += ` / ${output}`;
            simple = false;
        }

        // Умножение на количество
        if (edge.quantity !== 1) {
            if (!simple) {
                tokens = [{ type: 'op', text: '(' }, ...tokens, { type: 'op', text: ')' }];
                plain = `(${plain})`;
            }
            tokens.push({ type: 'op', text: '×' });
            tokens.push({ type: 'num', text: edge.quantity });
            plain += ` × ${edge.quantity}`;
            simple = false;
        }

        return { tokens, plain, simple };
    }).filter(Boolean);

    if (parts.length === 0) {
        return { tokens: [{ type: 'var', text: node.variable }], plain: node.variable, simple: true };
    }
    if (parts.length === 1) return parts[0];

    // Несколько входов — суммируем
    const tokens = [];
    const plains = [];
    parts.forEach((p, i) => {
        if (i > 0) {
            tokens.push({ type: 'op', text: '+' });
            plains.push('+');
        }
        tokens.push(...p.tokens);
        plains.push(p.plain);
    });

    return {
        tokens,
        plain: parts.map(p => p.plain).join(' + '),
        simple: false
    };
}

/** Красивое отображение формулы с токенами и легендой */
function renderPrettyFormula(container, result, finalNode) {
    const line = document.createElement('div');
    line.className = 'formula-line';

    result.tokens.forEach(tok => {
        const span = document.createElement('span');
        span.className = 'formula-token ' + tok.type;
        span.textContent = tok.text;
        line.appendChild(span);
    });

    const eq = document.createElement('span');
    eq.className = 'formula-token op';
    eq.textContent = '=';
    line.appendChild(eq);

    const saleToken = document.createElement('span');
    saleToken.className = 'formula-token sale';
    saleToken.textContent = finalNode.variable + ' · продажа';
    line.appendChild(saleToken);

    container.appendChild(line);

    // Легенда переменных
    const legend = document.createElement('div');
    legend.className = 'formula-legend';

    nodes.forEach(n => {
        const item = document.createElement('div');
        item.className = 'formula-legend-item';

        const dot = document.createElement('div');
        dot.className = 'formula-legend-dot';
        dot.style.background = n.shape === 'circle' ? '#60A5FA'
            : (n.shape === 'diamond' ? '#A78BFA' : '#818CF8');

        const label = document.createElement('span');
        label.textContent = `${n.variable} — ${n.label}`;
        if (n.output && n.output > 1) label.textContent += ` (${n.output} ед.)`;

        item.appendChild(dot);
        item.appendChild(label);
        legend.appendChild(item);
    });

    container.appendChild(legend);
}

/* ============================================
   СОХРАНЕНИЕ КРАФТА
   ============================================ */
document.getElementById('saveCraftBtn').addEventListener('click', () => {
    if (nodes.length === 0) {
        showToast('Добавьте хотя бы одну фигуру', 'info');
        return;
    }
    openCraftModal();
});

function openCraftModal() {
    document.getElementById('craftModalTitle').textContent =
        editingCraftId ? 'Сохранить изменения' : 'Новый крафт';

    document.getElementById('craftNameInput').value =
        editingCraftId && currentCraftName
            ? currentCraftName
            : 'Крафт ' + new Date().toLocaleDateString('ru-RU');

    document.getElementById('craftModal').classList.add('show');
    setTimeout(() => {
        document.getElementById('craftNameInput').focus();
        document.getElementById('craftNameInput').select();
    }, 100);
}

function closeCraftModal() {
    document.getElementById('craftModal').classList.remove('show');
}

async function confirmSaveCraft() {
    const name = document.getElementById('craftNameInput').value.trim();
    if (!name) {
        showToast('Введите название', 'info');
        return;
    }

    // Текст формулы берём из отрисованной (первая строка)
    const formula = document.getElementById('formulaBody').innerText
        .split('\n').filter(l => l.trim())[0] || '';

    // Маппинг временных ID → порядковые номера для бэка
    const tempIdToIndex = {};
    nodes.forEach((n, i) => { tempIdToIndex[n.tempId] = i + 1; });

    const req = {
        name,
        formula,
        nodes: nodes.map(n => ({
            id: tempIdToIndex[n.tempId],
            variable: n.variable,
            label: n.label,
            shape: n.shape,
            posX: n.x,
            posY: n.y,
            itemPrice: n.price,
            output: n.output || 1
        })),
        edges: edges.map(e => ({
            fromNodeId: tempIdToIndex[e.fromTempId],
            toNodeId: tempIdToIndex[e.toTempId],
            quantity: e.quantity
        }))
    };

    try {
        if (editingCraftId) {
            await API.updateCraftFull(editingCraftId, req);
            showToast('Крафт обновлён!', 'success');
        } else {
            await API.createCraftFull(req);
            showToast('Крафт создан!', 'success');
        }
        closeCraftModal();
        resetEditor();
        loadCrafts();
    } catch (err) {
        showToast(err.message, 'info');
    }
}

function resetEditor() {
    nodes = [];
    edges = [];
    selectedNodeTempId = null;
    selectedEdgeIndex = null;
    nextTempId = 1;
    nextVariable = 0;
    view = { x: 0, y: 0, scale: 1 };
    zoomIndex = 6;
    editingCraftId = null;
    currentCraftName = null;
    document.getElementById('zoomLevelCraft').textContent = '100%';
    document.getElementById('propsPanel').style.display = 'none';
    document.getElementById('edgePropsPanel').style.display = 'none';
    render();
    updateFormula();
}

/* ============================================
   СПИСОК СОХРАНЁННЫХ КРАФТОВ
   ============================================ */
async function loadCrafts() {
    const container = document.getElementById('craftsList');
    try {
        const crafts = await API.getCrafts();
        if (!crafts || !Array.isArray(crafts) || crafts.length === 0) {
            container.className = 'profiles-empty';
            container.innerHTML = `<h4>Пока нет крафтов</h4><p>Создайте первый крафт в редакторе выше</p>`;
            return;
        }

        container.className = 'formulas-row';
        container.innerHTML = '';

        crafts.forEach(c => {
            const el = document.createElement('div');
            el.className = 'formula-row';
            el.innerHTML = `
                <div class="formula-text">
                    <strong>${c.name}</strong>
                    ${c.formula ? '<br><small style="color:#94A3B8;">' + c.formula + '</small>' : ''}
                </div>
                <div class="formula-actions">
                    <button class="formula-icon-btn edit" title="Редактировать" data-action="edit" data-id="${c.id}">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                    <button class="formula-icon-btn delete" title="Удалить" data-action="delete" data-id="${c.id}">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"
                                stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
            `;

            el.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
                e.stopPropagation();
                loadCraftToEditor(c.id);
            });

            el.querySelector('[data-action="delete"]').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm('Удалить крафт?')) return;
                try {
                    await API.deleteCraft(c.id);
                    showToast('Удалено', 'success');
                    loadCrafts();
                } catch (err) { showToast(err.message, 'info'); }
            });

            container.appendChild(el);
        });
    } catch (err) { console.error(err); }
}

/** Загрузить сохранённый крафт обратно в редактор */
async function loadCraftToEditor(craftId) {
    try {
        const craft = await API.getCraft(craftId);
        if (!craft) return;

        nodes = [];
        edges = [];
        nextTempId = 1;
        nextVariable = 0;

        const idToTempId = {};
        craft.nodes.forEach(n => {
            const tempId = nextTempId++;
            idToTempId[n.id] = tempId;

            const idx = alphabet.indexOf(n.variable[0]);
            if (idx >= nextVariable) nextVariable = idx + 1;

            nodes.push({
                tempId,
                variable: n.variable,
                label: n.label,
                shape: n.shape,
                x: n.posX || 0,
                y: n.posY || 0,
                width: 100,
                height: 50,
                price: n.itemPrice,
                output: n.output || 1
            });
        });

        craft.edges.forEach(e => {
            edges.push({
                fromTempId: idToTempId[e.fromNodeId],
                toTempId: idToTempId[e.toNodeId],
                quantity: e.quantity
            });
        });

        editingCraftId = craft.id;
        currentCraftName = craft.name;

        render();
        updateFormula();
        showToast('Крафт загружен в редактор', 'success');

        document.querySelector('.craft-editor')
            .scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
        showToast(err.message, 'info');
    }
}

/* ============================================
   КОПИРОВАНИЕ ФОРМУЛЫ
   ============================================ */
document.getElementById('copyFormulaBtn').addEventListener('click', () => {
    const text = document.getElementById('formulaBody').innerText
        .split('\n').filter(l => l.trim())[0] || '';
    navigator.clipboard.writeText(text);
    showToast('Формула скопирована', 'success');
});

/* ============================================
   ПОДСКАЗКА
   ============================================ */
function updateHint() {
    const hint = document.getElementById('hintText');
    if (currentMode === 'link') {
        hint.textContent = linkingFrom
            ? 'Выберите вторую фигуру'
            : 'Кликните на первую фигуру';
    } else if (['rect', 'circle', 'diamond'].includes(currentMode)) {
        hint.textContent = 'Кликните на поле — добавится фигура';
    } else {
        hint.textContent = 'Тащите фигуры. ЛКМ по пустому — панорамирование. Колёсико — зум';
    }
}

/* ============================================
   СТАРТ
   ============================================ */
updateHint();
render();
updateFormula();
loadCrafts();

// Если URL содержит ?edit=ID — загружаем крафт в редактор
(function () {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (editId) {
        setTimeout(() => loadCraftToEditor(parseInt(editId)), 500);
    }
})();