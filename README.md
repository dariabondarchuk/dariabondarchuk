# Реестр ПДн — ГК «Самолёт»

Веб-приложение для учёта процессов обработки персональных данных: компании, анкеты, процессы, уведомления РКН, журналы обращений, мониторинг изменений в ЕГРЮЛ (DaData).

## Стек

| Часть | Технологии |
|-------|------------|
| Frontend | React 19, Vite, TypeScript, Ant Design |
| Backend | Node.js, Express 5, Prisma, PostgreSQL |
| БД | PostgreSQL 16 (Docker) |
| Почта (dev) | Mailpit |

## Структура репозитория

```
├── backend/          # API, Prisma, миграции, seed
├── frontend/         # React-интерфейс
├── docker-compose.yml
└── legal/
```

## Требования

- **Node.js** 20+
- **Docker Desktop** (для PostgreSQL локально)
- **npm**

## Быстрый старт (разработка)

### 1. Клонирование и переход в проект

```powershell
git clone https://github.com/dariabondarchuk/dariabondarchuk.git
cd dariabondarchuk
```

> Если репозиторий лежит в подпапке на диске, перейдите в каталог с `docker-compose.yml` и папками `backend/`, `frontend/`.

### 2. База данных

```powershell
docker compose up -d db
```

PostgreSQL будет доступна на порту **5433** (см. `docker-compose.yml`).

Опционально — почта для тестов приглашений:

```powershell
docker compose up -d mailpit
```

Веб-интерфейс Mailpit: http://localhost:8025

### 3. Настройка backend

```powershell
cd backend
copy .env.example .env
npm install
```

В `.env` для Docker укажите порт **5433**:

```
DATABASE_URL="postgresql://pdn_user:your_secure_password@localhost:5433/pdn_registry"
```

Миграции и начальные данные:

```powershell
npm run db:migrate
npm run db:seed
```

### 4. Запуск backend

```powershell
npm run dev
```

API: http://localhost:4000  
Проверка: http://localhost:4000/api/health → `{"ok":true}`

### 5. Запуск frontend (отдельный терминал)

```powershell
cd frontend
npm install
npm run dev
```

Интерфейс: http://localhost:5173

### Вход

| Поле | Значение |
|------|----------|
| Email | `admin@samolet.ru` |
| Пароль | `admin123` |

---

## Продакшен (один сервер)

Backend раздаёт собранный фронтенд из `frontend/dist`.

```powershell
cd frontend
npm run build

cd ../backend
npm run build
npm start
```

В `backend/.env`:

```
PUBLIC_URL=https://ваш-домен.ru
DATABASE_URL=postgresql://...
JWT_SECRET=длинный-секрет-32+символов
```

Приложение доступно на порту **4000** (интерфейс + `/api`).

---

## Показать ссылку на другом устройстве (туннель)

1. Запустите backend и frontend (см. выше).
2. Убедитесь, что локально открывается http://localhost:5173.
3. В отдельном терминале:

```powershell
npx --yes localtunnel --port 5173
```

4. Отправьте ссылку вида `https://....loca.lt` на другое устройство.

> Туннель работает, пока запущены ваш ПК, backend, frontend и процесс localtunnel.

Для продакшена с одним портом можно туннелировать **4000** после `npm run build` в frontend.

---

## Переменные окружения (`backend/.env`)

| Переменная | Описание |
|------------|----------|
| `DATABASE_URL` | Строка подключения PostgreSQL |
| `JWT_SECRET` | Секрет для JWT (мин. 32 символа) |
| `PORT` | Порт API (по умолчанию 4000) |
| `PUBLIC_URL` | URL фронтенда для CORS |
| `UPLOAD_DIR` | Каталог загрузок |
| `DADATA_API_KEY` | Ключ DaData (подсказки по организациям) |
| `SMTP_*` | Настройки почты для приглашений |

---

## Основные разделы приложения

- **Компании** — реестр, DaData, карточка с анкетами и процессами
- **Шаблоны анкет** — типовые анкеты по компаниям
- **Процессы** — процессы компаний и общекорпоративные
- **Уведомления РКН** — реестр уведомлений и документы
- **Журналы обращений** — субъекты ПДн и РКН
- **Уведомления** — мониторинг изменений ЕГРЮЛ
- **Документы** — сгенерированные документы компаний
- **Настройки** — журнал аудита

---

## Полезные команды

```powershell
# Backend
cd backend
npm run dev          # разработка
npm run build        # сборка TypeScript
npm start            # продакшен
npm run db:migrate   # миграции
npm run db:seed      # тестовый admin

# Frontend
cd frontend
npm run dev          # разработка
npm run build        # сборка для продакшена
```

---

## Решение проблем

| Проблема | Решение |
|----------|---------|
| `docker compose: not found` | Запустите из каталога с `docker-compose.yml`, не из родительской папки |
| `Connection refused` к БД | `docker compose up -d db`, в `.env` порт **5433** |
| Неверный пароль | `npm run db:seed` в `backend/` |
| Backend долго стартует | Первый запуск `ts-node` может занять 1–2 минуты |
| CORS при доступе по IP | В `.env` задайте `PUBLIC_URL` с вашим Network URL |

---

## Лицензия

Внутренний проект ГК «Самолёт».
