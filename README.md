# Конфигуратор фасада — трафаретный кирпич

Одноэкранный mobile-first конфигуратор: выбор формы кладки, цвета кирпича и цвета шва с мгновенным превью на Canvas. Без сборки и зависимостей — три файла: `index.html`, `style.css`, `app.js`.

## Запуск локально

Любой статический сервер из корня папки, например:

```bash
npx --yes serve -l 5173 .
```

Открыть <http://localhost:5173>.

## Деплой на GitHub Pages

1. Создайте пустой репозиторий на GitHub (например `tile-color`).
2. В этой папке:

   ```bash
   git remote add origin https://github.com/<user>/tile-color.git
   git push -u origin main
   ```

3. В репозитории: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Workflow `.github/workflows/pages.yml` соберёт и опубликует сайт при каждом push в `main`.
   Ссылка: `https://<user>.github.io/tile-color/`.

## Подключение как Telegram Mini App

1. В [@BotFather](https://t.me/BotFather): `/newapp` → выбрать бота → указать URL страницы с GitHub Pages.
   Или `/mybots` → бот → **Bot Settings → Menu Button** → указать тот же URL.
2. Страница сама определяет запуск внутри Telegram: разворачивается на весь экран, берёт цвета темы, даёт вибро-отклик при выборе.
3. Вне Telegram работает как обычный сайт.

## Экспорт картинки

Кнопка «Сохранить картинку» формирует PNG 1600×1000 с подписью выбранных цветов (RAL/NCS).
На смартфоне открывается системное меню «Поделиться» (Web Share API); если оно недоступно — показывается картинка с кнопкой «Скачать PNG» и подсказкой сохранить долгим нажатием.

## Палитра

Цвета кирпича и шва заданы в `app.js` (`BRICK_COLORS`, `JOINT_COLORS`), паттерны кладки — в `PATTERNS` (размер кирпича и шва в мм, смещение ряда, флаг «состаренный»).
