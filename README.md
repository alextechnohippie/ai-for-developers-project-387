# Календарь звонков (продолжение)


[![hexlet-check](https://github.com/alextechnohippie/ai-for-developers-project-387/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/alextechnohippie/ai-for-developers-project-387/actions)
[![ci](https://github.com/alextechnohippie/ai-for-developers-project-387/actions/workflows/ci.yml/badge.svg)](https://github.com/alextechnohippie/ai-for-developers-project-387/actions/workflows/ci.yml)

Интегрируйте работу агентов в GitHub проект

Учебный проект Хекслета: https://ru.hexlet.io/programs/ai-for-developers
Как это должно работать: https://files.hexlet.app/a/2ipc5m

## О проекте

Это продолжение проекта [«Календарь звонков»](https://github.com/alextechnohippie/ai-for-developers-project-386):
готовое приложение перенесено сюда вместе с тестами, линтерами, воркфлоу и настройками
агентных скиллов, а процесс разработки вокруг него автоматизируется в GitHub — разбор
задач из issue, реализация, ревью в pull request, регулярные проверки.

Исходные спецификация и решения первого проекта:
[спецификация (386#7)](https://github.com/alextechnohippie/ai-for-developers-project-386/issues/7),
[карта проектирования (386#1)](https://github.com/alextechnohippie/ai-for-developers-project-386/issues/1),
[ADR](docs/adr/), [словарь](GLOSSARY.md). Подробнее — в [AGENTS.md](AGENTS.md#истоки).

## Запущенное приложение

Публичная ссылка: **https://calendar-zvonkov-96m9.onrender.com**

Бесплатный инстанс Render засыпает без трафика, поэтому первый запрос может
выполняться до ~30–60 секунд.

По ссылке проходит полный сценарий: гость выбирает тип встречи и свободный слот,
создаёт запись, она появляется в списке владельца (`/#/owner`), а повторная
пересекающаяся запись отклоняется.

> ⚠️ **Хранение данных.** Типы встреч заданы заранее (seed), а записи хранятся
> **в памяти процесса** и **сбрасываются при каждом перезапуске** (передеплой,
> рестарт или засыпание бесплатного инстанса Render). Постоянного хранилища нет —
> это осознанное ограничение учебного проекта.

## Сценарий

Владелец календаря задаёт типы встреч с названием, описанием и длительностью.
Гость без регистрации выбирает тип встречи, свободное время в пределах ближайших
14 календарных дней и подтверждает запись. Она появляется в списке предстоящих
встреч владельца. Пересекающиеся встречи, в том числе разных типов, недопустимы.

## Стек

- Окружение и задачи: **mise** (Java 21, Node 24)
- Контракт API: **TypeSpec → OpenAPI 3.0.0**, клиентский SDK — `@hey-api/openapi-ts`
- Бэкенд: **Kotlin + Ktor** (Gradle)
- Фронтенд: **React + TypeScript + Vite**
- Проверки: detekt, Oxlint + oxfmt, Vitest/JUnit, Playwright e2e; git-хуки — hk; CI — GitHub Actions

## Локальный запуск

```bash
git clone https://github.com/alextechnohippie/ai-for-developers-project-387.git
cd ai-for-developers-project-387
mise install        # инструменты (Java, Node, hk)
mise run install    # npm-зависимости и браузер для e2e
```

```bash
mise run dev:backend    # Ktor на http://localhost:8080
mise run dev:frontend   # Vite на http://localhost:5173 (проксирует /api)
mise run check          # все проверки (линт, типы, тесты, сборка, браузерный e2e)
```

### В Docker

Один образ (multi-stage [`Dockerfile`](Dockerfile)): Ktor отдаёт и API (`/api`),
и собранный фронтенд.

```bash
docker build -t calendar-zvonkov .
docker run --rm -e PORT=3000 -p 3000:3000 calendar-zvonkov
# открыть http://localhost:3000
```

Приложение слушает порт из переменной окружения **`PORT`** (по умолчанию `8080`).

Рабочие команды и правила проекта — в [AGENTS.md](AGENTS.md).

## Воркфлоу GitHub Actions

| Воркфлоу | Событие | Назначение | Где смотреть результат |
|---|---|---|---|
| [`opencode.yml`](.github/workflows/opencode.yml) | `issue_comment`, `pull_request_review_comment` (`types: [created]`) с командой `/oc` или `/opencode` | Агент OpenCode отвечает в обсуждении issue/PR, правит PR | Комментарий от `opencode-agent[bot]` в issue/PR; прогон — [Actions → opencode](https://github.com/alextechnohippie/ai-for-developers-project-387/actions/workflows/opencode.yml) |
| [`ci.yml`](.github/workflows/ci.yml) | `push` в любую ветку, `pull_request` | `mise run install` + `mise run check` (линт, тесты, сборка, e2e) | Статус коммита/PR; [Actions → ci](https://github.com/alextechnohippie/ai-for-developers-project-387/actions/workflows/ci.yml) |
| [`release-please.yml`](.github/workflows/release-please.yml) | `push` в `main` | Готовит release-PR по Conventional Commits | Открытый release-PR |
| [`hexlet-check.yml`](.github/workflows/hexlet-check.yml) | `push` | Автопроверка Хекслета (не редактировать) | [Actions → hexlet-check](https://github.com/alextechnohippie/ai-for-developers-project-387/actions/workflows/hexlet-check.yml) |

### Агент в GitHub (OpenCode)

Агент — [OpenCode](https://opencode.ai/docs/github/) через GitHub App
[opencode-agent](https://github.com/apps/opencode-agent), установленный на этот репозиторий.
Вызов — комментарием, например `/oc explain this issue` или
`/oc запусти скилл to-spec по обсуждению этого issue`.

- **Модель:** `anthropic/claude-sonnet-5-5`; ключ — секрет `ANTHROPIC_API_KEY`
  (Settings → Secrets and variables → Actions). Каждый вызов расходует токены провайдера.
- **Команды (`mentions`):** набор по умолчанию — `/opencode,/oc`, задан в воркфлоу явно.
- **Публикация сессий (`share`):** `false` — сессии не публикуются. В закреплённой версии
  action (v1.19.5) параметр помечен как устаревший и игнорируется: шаринг сессий
  в OpenCode отключён; значение оставлено как явно записанное решение.
- **Кто может вызвать:** только владелец, участники и коллабораторы
  (`author_association`), комментарии ботов игнорируются — иначе задание пропускается
  без вызова модели. OpenCode дополнительно требует у автора права `write`/`admin`.
  Fork-PR секретов не получают: `pull_request_target` не используется.
- **Права:** `contents: read` и `id-token: write` (OIDC-токен меняется на токен
  GitHub App — им агент комментирует и пушит), `persist-credentials: false` у checkout.
  Сверх стандарта — `issues: read` и `GH_TOKEN` (токен только на чтение), чтобы скиллы
  читали трекер через `gh`.
- **Ограничения:** `timeout-minutes: 30`; `concurrency` — один прогон на номер issue/PR,
  следующий ждёт в очереди. Остановить текущий прогон — *Cancel workflow*, отключить
  будущие — *Disable workflow* в Actions; при необходимости ключ отзывается у провайдера.
- **Скиллы и настройки на раннере:** раннер стартует с чистого окружения, но скиллы
  [mattpocock/skills](https://github.com/mattpocock/skills) лежат в репозитории
  (`.claude/skills/`, `.agents/skills/`), а OpenCode ищет проектные скиллы и в этих
  каталогах. Вместе с кодом приходят `AGENTS.md` и настройки трекера `docs/agents/`.
  Глобальных скиллов воркфлоу не требует.

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
