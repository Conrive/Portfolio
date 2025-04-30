const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const userList = document.querySelector('#searchUsers ul');
const projectList = document.querySelector('#searchProjects ul');
const filterButtons = document.querySelectorAll('.filter-btn');

let currentFilter = 'all';

searchInput.addEventListener('focus', () => {
    searchResults.classList.remove('hidden');
});

document.addEventListener('click', (e) => {
    if (!searchResults.contains(e.target) && e.target !== searchInput) {
        searchResults.classList.add('hidden');
    }
});

searchInput.addEventListener('input', async () => {
    const query = searchInput.value.trim().toLowerCase();
    if (query.length === 0) {
        userList.innerHTML = '';
        projectList.innerHTML = '';
        return;
    }

    // Пример API-запроса
    const res = await fetch(`/api/search?q=${query}`);
    const data = await res.json();

    renderResults(data);
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
    const { users = [], projects = [] } = data;

    userList.innerHTML = '';
    projectList.innerHTML = '';

    if (currentFilter === 'all' || currentFilter === 'users') {
        users.forEach(user => {
            const li = document.createElement('li');
            li.textContent = user.name;
            userList.appendChild(li);
        });
    }

    if (currentFilter === 'all' || currentFilter === 'projects') {
        projects.forEach(project => {
            const li = document.createElement('li');
            li.textContent = project.title;
            projectList.appendChild(li);
        });
    }

    document.getElementById('searchUsers').style.display = (currentFilter === 'all' || currentFilter === 'users') ? '' : 'none';
    document.getElementById('searchProjects').style.display = (currentFilter === 'all' || currentFilter === 'projects') ? '' : 'none';
}