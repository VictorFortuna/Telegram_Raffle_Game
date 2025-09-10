# Telegram Raffle Stars - Техническое задание

## Тип проекта
**HTML5 игра для Telegram** (НЕ Mini App)
- Создается через /newgame в @BotFather
- Запускается через команду /game или inline кнопки
- Требует иконку 512x512 пикселей

## Концепция игры
Лотерея с использованием Telegram Stars. Пользователи делают ставки (1 звезда), при достижении заданного количества участников автоматически определяется победитель.

**Распределение выигрыша:**
- Победитель: 70% от общего банка
- Организатор: 30% комиссия

## Функции для пользователей
- Автоматическая авторизация через Telegram WebApp API
- Проверка баланса Telegram Stars
- Участие в активной лотерее ставкой 1 звезда
- Real-time обновления статуса игры через WebSocket
- Уведомления о результатах розыгрыша

## Функции администратора
- Веб-панель по адресу /admin
- Настройка параметров: количество участников, размер ставки, процент распределения
- Принудительная отмена розыгрыша
- Статистика: пользователи, активные игры, история, доходы
- Мониторинг системы

## Критически важные технические требования

### Авторизация и безопасность
- Корректная обработка Telegram initData в server.js
- JWT токены для API аутентификации
- Валидация всех входящих данных
- Rate limiting для защиты от спама

### База данных (PostgreSQL)
```sql
- users (telegram_id, username, first_name, created_at, last_active)
- raffles (id, required_participants, bet_amount, status, winner_id, created_at)
- bids (id, raffle_id, user_telegram_id, amount, placed_at)
- raffle_settings (participants_limit, bet_amount, winner_percentage)
- star_transactions (id, user_id, amount, type, status)
- audit_logs (id, admin_action, timestamp, details)
```

### Telegram интеграция
- Webhook endpoint: /api/webhook/telegram
- Обработка Telegram Stars платежей
- Telegram Bot API для уведомлений
- Домен должен быть добавлен в настройки бота через @BotFather

### Хостинг и деплой
- Автоматический деплой GitHub → Railway
- Переменные окружения:
  - DATABASE_URL (PostgreSQL connection string)
  - TELEGRAM_BOT_TOKEN 
  - JWT_SECRET
  - ADMIN_PASSWORD_HASH (bcrypt hash)
  - PORT (default: 3000)

### Исправления известных проблем
- CSP настройки должны разрешать загрузку Bootstrap CSS для админ-панели
- Express.js middleware совместимость (избегать устаревших модулей)
- Корректная обработка ошибок подключения к базе данных
- WebSocket соединения должны корректно переподключаться

## Архитектура приложения

### Backend (Node.js + Express)
- RESTful API для всех операций
- WebSocket (Socket.IO) для real-time обновлений
- Модульная структура: routes, models, services, middleware
- Централизованная обработка ошибок

### Frontend
- HTML5 игровой интерфейс для Telegram
- Vanilla JavaScript (без фреймворков для скорости)
- Bootstrap админ-панель
- Telegram WebApp API интеграция

### База данных
- PostgreSQL с индексами для высокой нагрузки
- Connection pooling
- Транзакции для критических операций

## MVP функционал
1. Регистрация пользователя через Telegram
2. Участие в лотерее ставкой 1 звезда
3. Автоматический розыгрыш при достижении лимита участников
4. Отправка Telegram Stars победителю
5. Базовая админ-панель для управления

## Этапы разработки
1. **Настройка инфраструктуры**: база данных, деплой, переменные окружения
2. **Telegram интеграция**: авторизация, webhook, Stars API
3. **Игровая логика**: ставки, розыгрыш, выплаты
4. **Real-time функции**: WebSocket уведомления
5. **Админ-панель**: управление и мониторинг
6. **Тестирование**: функциональность и безопасность

## Особенности реализации
- Криптографически стойкий алгоритм выбора победителя
- Обработка конкурентных запросов без race conditions
- Логирование всех финансовых операций
- Graceful shutdown с сохранением данных

## Готовые данные для переиспользования
- DATABASE_URL: существующая PostgreSQL база в Railway
- TELEGRAM_BOT_TOKEN: 7599940711:AAFIlo4g7MZzZWKu8NoJQFXotrBzMev-o9Y
- JWT_SECRET: 922137fa77b75ab5653d9477c726c21e
- ADMIN_PASSWORD_HASH: $2a$12$FVDv8Cb2AyjXULcUgLDB3ufz8K.Q51/aWL0XmqyMdtpOrwsJV8Ci2
- Админ логин: admin / пароль: fortunaforever0910
- Railway проект: telegram-raffle-app-production.up.railway.app

## Тестирование
- Функциональное тестирование игрового процесса
- Интеграционные тесты с Telegram API
- Нагрузочное тестирование WebSocket соединений
- Безопасность: проверка на SQL injection, XSS

## Метрики успеха
- Стабильная работа без ошибок авторизации
- Корректное проведение лотерей с выплатами
- Работающая админ-панель без CSP ошибок
- Возможность тестирования в реальном Telegram боте