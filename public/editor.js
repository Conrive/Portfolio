let selectedElement = null;
let draggedElement = null;
let offsetX = 0;
let offsetY = 0;

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

        default:
            alert('Тип элемента не реализован');
            return;
    }

    newEl.style.position = 'absolute';
    newEl.style.left = '120px';
    newEl.style.top = '120px';

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
      <input type="number" value="${parseInt(el.style.fontSize)}" oninput="selectedElement.style.fontSize = this.value + 'px'">
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

