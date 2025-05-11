document.addEventListener('DOMContentLoaded', () => {
    const placeholder = document.getElementById('comment-placeholder');
    const form = document.getElementById('comment-form');
    const textarea = document.getElementById('comment-input');
    textarea.value = textarea.value.replace(/^\s+/, '');
    const counter = document.getElementById('char-count');
    const toolbar = createToolbar(textarea);

    // Показ формы
    if (placeholder && form && textarea) {
        placeholder.addEventListener('click', () => {
            placeholder.style.display = 'none';
            form.classList.remove('hidden');
            textarea.focus();
            toolbar.classList.remove('hidden');
        });
    }

    // Счётчик символов
    if (textarea && counter) {
        textarea.addEventListener('input', () => {
            const length = textarea.value.length;
            counter.textContent = `${length} / 1000`;
        });
    }

    // Редактирование комментариев
    document.querySelectorAll('.edit-comment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const content = btn.dataset.content;
            const commentId = btn.dataset.commentId;
            const newContent = prompt("Измените комментарий:", content);
            if (newContent && newContent.trim().length > 0) {
                fetch(`/profile/comment/edit/${commentId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': document.querySelector('input[name="_csrf"]').value
                    },
                    body: JSON.stringify({ content: newContent })
                }).then(res => location.reload());
            }
        });
    });
});

// Создаёт панель форматирования
function createToolbar(textarea) {
    const toolbar = document.createElement('div');
    toolbar.className = 'bg-white border rounded p-1 mb-2 flex gap-2 text-sm text-gray-700 hidden';

    const buttons = [
        { label: 'B', command: '**', tooltip: 'Жирный' },
        { label: 'I', command: '_', tooltip: 'Курсив' },
        { label: 'S', command: '~~', tooltip: 'Зачёркнутый' },
        { label: '🔗', command: '[]()', tooltip: 'Ссылка' }
    ];

    buttons.forEach(({ label, command, tooltip }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.innerText = label;
        btn.title = tooltip;
        btn.className = 'hover:text-blue-600';
        btn.addEventListener('click', () => {
            formatText(textarea, command);
        });
        toolbar.appendChild(btn);
    });

    textarea.parentElement.insertBefore(toolbar, textarea);
    return toolbar;
}

function formatText(textarea, syntax) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end);

    let formatted, cursorOffset;

    if (syntax === '[]()') {
        formatted = selected ? `[${selected}](https://)` : `[текст](https://)`;
        cursorOffset = selected ? formatted.length : 1; // после [текст
    } else {
        if (selected) {
            formatted = `${syntax}${selected}${syntax}`;
            cursorOffset = formatted.length;
        } else {
            formatted = `${syntax}${syntax}`;
            cursorOffset = syntax.length;
        }
    }

    textarea.setRangeText(formatted, start, end, 'end');
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + cursorOffset;
}