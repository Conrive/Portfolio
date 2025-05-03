const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const userList = document.querySelector('#searchUsers ul');
const projectList = document.querySelector('#searchProjects ul');
const filterButtons = document.querySelectorAll('.filter-btn');

let currentFilter = 'all';

function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('hidden');
}

// Закрытие меню при клике вне его
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('userDropdown');
    const avatar = document.querySelector('img[alt="avatar"]');
    if (dropdown && !dropdown.contains(e.target) && e.target !== avatar) {
        dropdown.classList.add('hidden');
    }
});

searchInput.addEventListener('focus', () => {
    searchResults.classList.remove('hidden');
});

document.addEventListener('click', (e) => {
    if (!searchResults.contains(e.target) && e.target !== searchInput) {
        searchResults.classList.add('hidden');
    }
});

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        currentFilter = button.dataset.filter;
        filterButtons.forEach(b => b.classList.remove('bg-blue-500', 'text-white'));
        button.classList.add('bg-blue-500', 'text-white');
        triggerSearch();
    });
});

let searchTimeout;

async function triggerSearch() {
    const query = searchInput.value.trim();

    if (!query) {
        userList.innerHTML = '';
        projectList.innerHTML = '';
        return;
    }

    try {
        // Показать индикатор загрузки
        userList.innerHTML = '<div class="text-center text-gray-400">Загрузка...</div>';
        projectList.innerHTML = '';

        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&filter=${currentFilter}`);
        if (!res.ok) throw new Error('Ошибка при запросе данных');

        const data = await res.json();

        renderResults(data);
    } catch (err) {
        userList.innerHTML = `<div class="text-red-500 text-center">Ошибка загрузки: ${err.message}</div>`;
        projectList.innerHTML = '';
    }
}

searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(triggerSearch, 300); // debounce
});

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        if (q.length > 0) {
            window.location.href = `/search?q=${encodeURIComponent(q)}&filter=${currentFilter}`;
        }
    }
});

filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        const query = searchInput.value.trim().toLowerCase();
        if (query.length > 0) searchInput.dispatchEvent(new Event('input'));
    });
});

function renderResults(data) {
    const users = Array.isArray(data.users) ? data.users : [];
    const projects = Array.isArray(data.projects) ? data.projects : [];

    userList.innerHTML = '';
    projectList.innerHTML = '';

    if (currentFilter === 'all' || currentFilter === 'users') {
        users.forEach(user => {
            const li = document.createElement('li');
            li.innerHTML = `
                <a href="/profile/${user.id}" class="flex items-center gap-3 hover:bg-gray-100 p-2 rounded">
                    <img src="${user.avatar || '/default-avatar.png'}" alt="avatar" class="w-10 h-10 rounded-full object-cover border">
                    <span class="font-semibold">${user.name}</span>
                </a>
            `;
            userList.appendChild(li);
        });
    }

    if (currentFilter === 'all' || currentFilter === 'projects') {
        projects.forEach(project => {
            const li = document.createElement('li');
            li.innerHTML = `
                <a href="/project/${project.id}/view" class="block hover:bg-gray-100 p-2 rounded">
                    <div class="font-semibold">${project.title}</div>
                    <div class="text-sm text-gray-600 overflow-hidden whitespace-nowrap text-ellipsis">${project.description || 'Без описания'}</div>
                </a>
            `;
            projectList.appendChild(li);
        });
    }

    if (users.length === 0 && projects.length === 0) {
        userList.innerHTML = `<div class="text-gray-500 text-center">Ничего не найдено</div>`;
        projectList.innerHTML = '';
        return;
    }

    document.getElementById('searchUsers').style.display = (currentFilter === 'all' || currentFilter === 'users') ? '' : 'none';
    document.getElementById('searchProjects').style.display = (currentFilter === 'all' || currentFilter === 'projects') ? '' : 'none';
}