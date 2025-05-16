// Функция обработчика комментариев, их изменения и удаления
document.addEventListener('DOMContentLoaded', () => {
    const placeholder = document.getElementById('comment-placeholder');
    const form = document.getElementById('comment-form');
    const textarea = document.getElementById('comment-input');
    textarea.value = textarea.value.replace(/^\s+/, '');
    const counter = document.getElementById('char-count');
    const toolbar = createToolbar(textarea);

    if (placeholder && form && textarea) {
        placeholder.addEventListener('click', () => {
            placeholder.style.display = 'none';
            form.classList.remove('hidden');
            textarea.focus();
            toolbar.classList.remove('hidden');
        });
    }

    if (textarea && counter) {
        textarea.addEventListener('input', () => {
            const length = textarea.value.length;
            counter.textContent = `${length} / 1000`;
        });
    }

    if (textarea && form && placeholder) {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && !form.classList.contains('hidden')) {
                form.classList.add('hidden');
                placeholder.style.display = '';
                toolbar.classList.add('hidden');
                textarea.value = '';
                counter.textContent = '0 / 1000';
            }
        };

        textarea.addEventListener('focus', () => {
            document.addEventListener('keydown', handleEscape);
        });

        textarea.addEventListener('blur', () => {
            setTimeout(() => {
                if (form.classList.contains('hidden')) {
                    document.removeEventListener('keydown', handleEscape);
                }
            }, 200);
        });
    }

    document.querySelectorAll('.edit-comment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const commentId = btn.dataset.commentId;
            const contentEl = document.getElementById(`comment-content-${commentId}`);
            const textareaEl = document.getElementById(`edit-textarea-${commentId}`);
            const actionsEl = document.getElementById(`edit-actions-${commentId}`);
            const deleteBtn = document.querySelector(`#delete-comment-${commentId}`);

            contentEl.classList.add('hidden');
            textareaEl.classList.remove('hidden');
            actionsEl.classList.remove('hidden');
            if (deleteBtn) {
                deleteBtn.disabled = true;
                deleteBtn.classList.remove('text-red-500');
                deleteBtn.classList.add('text-gray-500');
            }

            textareaEl.focus();

            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    textareaEl.classList.add('hidden');
                    actionsEl.classList.add('hidden');
                    contentEl.classList.remove('hidden');
                    if (deleteBtn) {
                        deleteBtn.disabled = false;
                        deleteBtn.classList.remove('text-gray-500');
                        deleteBtn.classList.add('text-red-500');
                    }
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    });

    document.querySelectorAll('.save-comment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const commentId = btn.dataset.commentId;
            const textareaEl = document.getElementById(`edit-textarea-${commentId}`);
            const newContent = textareaEl.value.trim();

            if (newContent.length === 0) {
                alert('Комментарий не может быть пустым.');
                return;
            }

            fetch(`/profile/comment/edit/${commentId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': document.querySelector('input[name="_csrf"]').value
                },
                body: JSON.stringify({ content: newContent })
            }).then(res => {
                if (res.ok) location.reload();
                else alert('Ошибка при сохранении комментария.');
            });
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

// Форматирование текста
function formatText(textarea, syntax) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end);

    let formatted, cursorOffset;

    if (syntax === '[]()') {
        formatted = selected ? `[${selected}](https://)` : `[текст](https://)`;
        cursorOffset = selected ? formatted.length : 1;
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