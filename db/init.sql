-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                     name TEXT NOT NULL,
                                     email TEXT UNIQUE NOT NULL,
                                     password TEXT NOT NULL,
                                     role TEXT CHECK(role IN (1, 3, 2)) DEFAULT 1,
                                     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                     FOREIGN KEY (role) REFERENCES roles(id) ON DELETE CASCADE
    );

-- Таблица проектов
CREATE TABLE IF NOT EXISTS projects (
                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                        user_id INTEGER NOT NULL,
                                        title TEXT NOT NULL,
                                        description TEXT,
                                        link TEXT,
                                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

-- Таблица комментариев (для отзывов преподавателей)
CREATE TABLE IF NOT EXISTS comments (
                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                        project_id INTEGER NOT NULL,
                                        teacher_id INTEGER NOT NULL,
                                        content TEXT NOT NULL,
                                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
    );


CREATE TABLE IF NOT EXISTS roles (
                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                     name TEXT UNIQUE NOT NULL
);