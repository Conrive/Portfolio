let selectedElement = null;
let draggedElement = null;
let offsetX = 0;
let offsetY = 0;

function rgb2hex(rgb) {
    const result = rgb.match(/\d+/g);
    return result ? "#" + result.map(x => (+x).toString(16).padStart(2, "0")).join("") : "#ffffff";
}

function toggleStyle(style) {
    if (!selectedElement) return;
    const current = selectedElement.style;

    switch (style) {
        case 'bold':
            current.fontWeight = current.fontWeight === 'bold' ? 'normal' : 'bold';
            break;
        case 'italic':
            current.fontStyle = current.fontStyle === 'italic' ? 'normal' : 'italic';
            break;
        case 'underline':
            if (current.textDecoration.includes('underline')) {
                current.textDecoration = current.textDecoration.replace('underline', '').trim();
            } else {
                current.textDecoration = (current.textDecoration + ' underline').trim();
            }
            break;
        case 'line-through':
            if (current.textDecoration.includes('line-through')) {
                current.textDecoration = current.textDecoration.replace('line-through', '').trim();
            } else {
                current.textDecoration = (current.textDecoration + ' line-through').trim();
            }
            break;
    }
}


function addElement(type) {
    const canvas = document.getElementById('canvas');
    let newEl;

    switch (type) {
        case 'text':
            newEl = document.createElement('div');
            newEl.textContent = 'Новый текст';
            newEl.style.fontSize = '18px';
            newEl.style.cursor = 'pointer';
            newEl.contentEditable = true;
            break;

        case 'divider':
            newEl = document.createElement('hr');
            newEl.style.width = '100%';
            break;

        case 'link':
            newEl = document.createElement('a');
            newEl.href = '#';
            newEl.textContent = 'Новая ссылка';
            newEl.target = '_blank';
            newEl.style.textDecoration = 'underline';
            newEl.style.color = '#3498db';
            newEl.style.fontSize = '18px';
            newEl.style.cursor = 'pointer';
            break;

        case 'polygon':
            newEl = document.createElement('pol');
            newEl.style.width = '100px';
            newEl.style.height = '100px';
            newEl.style.backgroundColor = '#3498db';
            newEl.style.clipPath = getPolygonClipPath(5); // стандарт 5 сторон
            newEl.dataset.sides = 5;
            newEl.style.cursor = 'pointer';
            break;

        default:
            alert('Тип элемента не реализован');
            return;
    }

    newEl.style.position = 'absolute';
    newEl.style.left = '0px';
    newEl.style.top = '0px';

    newEl.classList.add('element');
    newEl.onclick = () => selectElement(newEl);
    canvas.appendChild(newEl);

    updateObjectTree();
    selectElement(newEl);
}

document.addEventListener('keydown', function (e) {
    if (e.key === 'Delete' && selectedElement) {
        removeElement(selectedElement);
    }
});

window.addEventListener('resize', () => {
    document.querySelectorAll('#canvas > *').forEach(el => {
        const leftPx = el.offsetLeft;
        const topPx = el.offsetTop;

        const canvas = document.getElementById('canvas');
        const leftPercent = (leftPx / canvas.offsetWidth) * 100;
        const topPercent = (topPx / canvas.offsetHeight) * 100;

        el.style.left = `${leftPercent}%`;
        el.style.top = `${topPercent}%`;
    });
});


function selectElement(el) {
    selectedElement = el;
    const propsPanel = document.getElementById('propertiesContent');
    propsPanel.innerHTML = '';

    if (el.tagName === 'DIV') {
        propsPanel.innerHTML = `
        <label>Размер текста</label>
        <input type="number" value="${parseInt(el.style.fontSize)}" 
               oninput="selectedElement.style.fontSize = this.value + 'px'">
          
        <label class="mt-2 block">Цвет фона</label>
        <input type="color" value="${rgb2hex(getComputedStyle(el).backgroundColor)}" 
               oninput="selectedElement.style.backgroundColor = this.value">
        
        <label class="mt-2 block">Цвет текста</label>
        <input type="color" value="${rgb2hex(getComputedStyle(el).color)}" 
               oninput="selectedElement.style.color = this.value">
        
         <label class="mt-2 block">Начертание текста</label>
            <div class="flex gap-2 mt-1 flex-col items-start">
                <button class="hover:bg-gray-100" onclick="toggleStyle('bold')">Жирный</button>
                <button class="hover:bg-gray-100" onclick="toggleStyle('italic')">Курсив</button>
                <button class="hover:bg-gray-100" onclick="toggleStyle('underline')">Подчеркнутый</button>
                <button class="hover:bg-gray-100" onclick="toggleStyle('line-through')">Зачеркнутый</button>
            </div>

            <label class="mt-2 block">Шрифт</label>
            <select onchange="selectedElement.style.fontFamily = this.value">
                <option value="Arial">Arial</option>
                <option value="Verdana">Verdana</option>
                <option value="Georgia">Georgia</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Tahoma">Tahoma</option>
            </select>
        
        `;
    } else  if (el.tagName === 'IMG') {
        propsPanel.innerHTML = `
        <label>Ширина</label>
        <input type="text" value="${el.style.width || '100%'}" 
               oninput="selectedElement.style.width = this.value">
    
        <label class="mt-2 block">Закругление</label>
        <input type="text" value="${el.style.borderRadius || '0px'}" 
               oninput="selectedElement.style.borderRadius = this.value">
  `;
    } else if (el.tagName === 'POL' && el.dataset.sides) {
        propsPanel.innerHTML = `
            <label>Количество сторон</label>
            <input type="number" value="${el.dataset.sides}" min="3" max="12"
                   oninput="updatePolygonSides(this.value)">
            
            <label class="mt-2 block">Цвет заливки</label>
            <input type="color" value="${rgb2hex(getComputedStyle(el).backgroundColor)}" 
                   oninput="selectedElement.style.backgroundColor = this.value">
            
            <label class="mt-2 block">Ширина</label>
            <input type="text" value="${selectedElement.style.width}" 
                   oninput="selectedElement.style.width = this.value">

            <label class="mt-2 block">Высота</label>
            <input type="text" value="${selectedElement.style.height}" 
                   oninput="selectedElement.style.height = this.value">
        `;
    } else if (el.tagName === 'A') {
        // Ссылка
        propsPanel.innerHTML = `
            <label>Текст ссылки</label>
            <input type="text" value="${el.textContent}" 
                   oninput="selectedElement.textContent = this.value">

            <label class="mt-2 block">URL</label>
            <input type="text" value="${el.href}" 
                   oninput="selectedElement.href = this.value">

            <label class="mt-2 block">Цвет текста</label>
            <input type="color" value="${rgb2hex(getComputedStyle(el).color)}" 
                   oninput="selectedElement.style.color = this.value">

            <label class="mt-2 block">Размер текста</label>
            <input type="number" value="${parseInt(el.style.fontSize)}" 
                   oninput="selectedElement.style.fontSize = this.value + 'px'">

            <label class="mt-2 block">Начертание текста</label>
            <div class="flex gap-2 mt-1 flex-col">
                <button class="hover:bg-gray-100" onclick="toggleStyle('bold')">Жирный</button>
                <button class="hover:bg-gray-100" onclick="toggleStyle('italic')">Курсив</button>
                <button class="hover:bg-gray-100" onclick="toggleStyle('underline')">Подчеркнутый</button>
                <button class="hover:bg-gray-100" onclick="toggleStyle('line-through')">Зачеркнутый</button>
            </div>

            <label class="mt-2 block">Шрифт</label>
            <select onchange="selectedElement.style.fontFamily = this.value">
                <option value="Arial">Arial</option>
                <option value="Verdana">Verdana</option>
                <option value="Georgia">Georgia</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Tahoma">Tahoma</option>
            </select>
        `;
    } else {
        propsPanel.textContent = 'Нет настроек';
    }

    updatePropsPanel(el)
}

document.getElementById('uploadForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    const projectId = window.location.pathname.split('/')[2];

    const res = await fetch(`/project/${projectId}/upload-image`, {
        method: 'POST',
        body: formData
    });

    const data = await res.json();
    if (data.imageUrl) {
        addImageElement(data.imageUrl);
    } else {
        alert('Ошибка загрузки');
    }
});

document.getElementById('canvas').addEventListener('click', (e) => {
    if (e.target.id === 'canvas') {
        selectedElement = document.getElementById('canvas');
        updatePropsPanel(selectedElement);
    }
});

function getPolygonClipPath(sides) {
    const angle = 360 / sides;
    let points = "";
    for (let i = 0; i < sides; i++) {
        const x = 50 + 50 * Math.cos((angle * i - 90) * Math.PI / 180);
        const y = 50 + 50 * Math.sin((angle * i - 90) * Math.PI / 180);
        points += `${x}% ${y}%, `;
    }
    return `polygon(${points.slice(0, -2)})`;
}

function updatePolygonSides(sides) {
    sides = Math.max(3, Math.min(12, +sides));
    selectedElement.dataset.sides = sides;
    selectedElement.style.clipPath = getPolygonClipPath(sides);
}

function addImageElement(url) {
    const img = document.createElement('img');
    img.src = url;
    img.classList.add('max-w-full', 'rounded', 'absolute');
    img.style.cursor = 'pointer';
    img.onclick = () => selectElement(img);
    document.getElementById('canvas').appendChild(img);
    updateObjectTree();
    selectElement(img);
}

function updatePropsPanel(el) {
    selectedElement = el;
    const propsPanel = document.getElementById('propertiesContent');
    const canvas = document.getElementById('canvas');
    const canvasWidth = canvas.offsetWidth;
    const canvasHeight = canvas.offsetHeight;

    const left = (parseFloat(el.offsetLeft) / canvasWidth) * 100;
    const top = (parseFloat(el.offsetTop) / canvasHeight) * 100;

    if (el.id === 'canvas') {
        // Панель для фона
        propsPanel.innerHTML = `
      <div class="mb-2">
        <label class="block text-sm mb-1">Цвет фона</label>
        <input type="color" id="backgroundColor" value="${rgb2hex(getComputedStyle(el).backgroundColor)}" class="w-full">
      </div>
      <div class="mb-2">
        <label class="block text-sm mb-1">Фон-картинка (URL)</label>
        <input type="text" id="backgroundImage" placeholder="https://example.com/image.png" class="w-full">
      </div>
    `;

        document.getElementById('backgroundColor').addEventListener('input', (e) => {
            el.style.backgroundColor = e.target.value;
        });

        document.getElementById('backgroundImage').addEventListener('change', (e) => {
            const url = e.target.value.trim();
            el.style.backgroundImage = url ? `url(${url})` : '';
            el.style.backgroundSize = 'cover';
            el.style.backgroundPosition = 'center';
        });

    } else {
        propsPanel.innerHTML += `
    <label class="block mt-2">Позиция X (%):
      <input type="number" id="posX" value="${left.toFixed(1)}" class="border p-1 w-full" step="0.1" />
    </label>
    <label class="block mt-2">Позиция Y (%):
      <input type="number" id="posY" value="${top.toFixed(1)}" class="border p-1 w-full" step="0.1" />
    </label>
    <button onclick="removeElement(selectedElement)" class="mt-4 bg-red-500 text-white px-2 py-1 rounded">
      Удалить элемент
    </button>
  `;
        document.getElementById('posX').addEventListener('input', updateElementPosition);
        document.getElementById('posY').addEventListener('input', updateElementPosition);
    }
}

function updateElementPosition() {
    if (!selectedElement) return;

    const canvas = document.getElementById('canvas');
    const canvasWidth = canvas.offsetWidth;
    const canvasHeight = canvas.offsetHeight;

    let inputX = parseFloat(document.getElementById('posX').value);
    let inputY = parseFloat(document.getElementById('posY').value);

    // Ограничения: чтобы элемент не вышел за границы
    const maxX = 100 - (selectedElement.offsetWidth / canvasWidth) * 100;
    const maxY = 100 - (selectedElement.offsetHeight / canvasHeight) * 100;

    inputX = Math.max(0, Math.min(inputX, maxX));
    inputY = Math.max(0, Math.min(inputY, maxY));

    selectedElement.style.left = `${inputX}%`;
    selectedElement.style.top = `${inputY}%`;

    document.getElementById('posX').value = inputX.toFixed(1);
    document.getElementById('posY').value = inputY.toFixed(1);
}

function removeElement(el) {
    const propsPanel = document.getElementById('propertiesContent');
    if (el.tagName === 'IMG' && el.src.includes('/uploads/')) {
        const filePath = new URL(el.src).pathname;
        fetch('/delete-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: filePath })
        });
    }
    el.remove();
    updateObjectTree();
    propsPanel.innerHTML = '';
    selectedElement = null;
}

function updateObjectTree() {
    const propsPanel = document.getElementById('propertiesContent');
    const tree = document.getElementById('objectTree');
    tree.innerHTML = '';

    const elements = document.querySelectorAll('#canvas > *');
    elements.forEach((el, index) => {
        const id = el.dataset.uid || `element-${index + 1}`;
        el.dataset.uid = id;

        const li = document.createElement('li');
        li.className = 'cursor-pointer hover:bg-gray-100 p-1 rounded flex items-center justify-between';
        li.innerHTML = `
      <span class="truncate max-w-[80%]">${el.dataset.name || id}</span>
      <button class="text-red-500 hover:text-red-700" title="Удалить">🗑️</button>
    `;

        // Выбор элемента
        li.addEventListener('click', () => {
            propsPanel.innerHTML = '';
            selectElement(el);
        });

        tree.appendChild(li);
    });
}