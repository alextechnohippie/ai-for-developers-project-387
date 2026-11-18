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
| [`claude.yml`](.github/workflows/claude.yml) | `issue_comment`, `pull_request_review_comment` (`types: [created]`) с командой `@claude` | Агент Claude Code отвечает в обсуждении issue/PR, правит PR | Комментарий от `claude[bot]` в issue/PR; прогон — [Actions → claude](https://github.com/alextechnohippie/ai-for-developers-project-387/actions/workflows/claude.yml) |
| [`claude-triage.yml`](.github/workflows/claude-triage.yml) | `issues` (`types: [opened]`) | Автотриаж: предварительный разбор нового обращения по скиллу `triage`, метки и один комментарий | Комментарий `claude[bot]` и метки в issue; [Actions → claude-triage](https://github.com/alextechnohippie/ai-for-developers-project-387/actions/workflows/claude-triage.yml) |
| [`claude-review.yml`](.github/workflows/claude-review.yml) | `pull_request` (`opened`, `synchronize`, `reopened`, `ready_for_review`) | Независимое авторевью PR по критериям `REVIEW.md` | Комментарий «Авторевью для `<head SHA>`» в PR; Actions → claude-review |
| [`pr-e2e.yml`](.github/workflows/pr-e2e.yml) | `pull_request` (те же типы) | Браузерный e2e на head SHA PR, артефакт с trace | Артефакт `e2e-<head SHA>` и сводка прогона; Actions → pr-e2e |
| [`ci.yml`](.github/workflows/ci.yml) | `push` в любую ветку, `pull_request` | `mise run install` + `mise run check` (линт, тесты, сборка, e2e) | Статус коммита/PR; [Actions → ci](https://github.com/alextechnohippie/ai-for-developers-project-387/actions/workflows/ci.yml) |
| [`release-please.yml`](.github/workflows/release-please.yml) | `push` в `main` | Готовит release-PR по Conventional Commits | Открытый release-PR |
| [`hexlet-check.yml`](.github/workflows/hexlet-check.yml) | `push` | Автопроверка Хекслета (не редактировать) | [Actions → hexlet-check](https://github.com/alextechnohippie/ai-for-developers-project-387/actions/workflows/hexlet-check.yml) |

### Агент в GitHub (Claude Code)

Агент — [Claude Code](https://github.com/anthropics/claude-code-action) через GitHub App
[Claude](https://github.com/apps/claude), установленный на этот репозиторий.
Вызов — комментарием, например `@claude explain this issue` или
`@claude запусти скилл to-spec по обсуждению этого issue`.

**Как пользоваться.**

- Команды — комментарием в issue/PR от доверенного участника:
  `@claude explain this issue`, `@claude запусти скилл to-spec по обсуждению этого issue`.
- Ответ — комментарий `claude[bot]` в том же issue/PR со ссылкой «View job» на прогон
  в Actions.
- Если нужны правки кода, агент коммитит в ветку `claude/...` и даёт ссылку на создание PR.
  PR создаёт и мержит человек.

**Почему не OpenCode.** Задание предлагает OpenCode, но допускает другого агента с теми же
сценариями. OpenCode работает только с API-ключом провайдера (оплата за токены отдельно
от подписки), а Claude Code GitHub Action умеет работать по подписке Claude Pro/Max.
Сценарии те же: вызов командой в комментарии issue/PR и в строке diff, ответ
комментарием от имени приложения, правки в ветке PR, скиллы проекта и трекер из
`docs/agents/`. Отличия: команда — `@claude` вместо `/oc`, приложение — `claude[bot]`
вместо `opencode-agent[bot]`, секрет — `CLAUDE_CODE_OAUTH_TOKEN` вместо API-ключа.

- **Модель:** `claude-sonnet-5-5` (`claude_args: --model`), не больше 100 ходов
  (`--max-turns 100`), `Bash(mise run:*)` разрешён без проверки. Перед агентом на раннер ставятся
  инструменты mise и зависимости (как в `ci.yml`), чтобы он мог перегенерировать OpenAPI/SDK и
  запускать `mise run check`. Авторизация — секрет `CLAUDE_CODE_OAUTH_TOKEN`
  (Settings → Secrets and variables → Actions), токен выдаёт `claude setup-token`;
  вызовы расходуют лимиты подписки, а не API-баланс.
- **Команда (аналог `mentions`):** `trigger_phrase: "@claude"` — значение по умолчанию,
  задано в воркфлоу явно. Одна команда, других не добавляем.
- **Публикация сессий (аналог `share`):** у Claude Code Action публичных ссылок на
  сессии нет — сессии не публикуются. Результат — комментарий агента в issue/PR, ход
  прогона — в логе Actions. Отчёт в Step Summary (`display_report`) и полный вывод
  (`show_full_output`) оставлены выключенными (по умолчанию), чтобы в публичные логи
  репозитория не попадали содержимое сессии и секреты.
- **Кто может вызвать:** только владелец, участники и коллабораторы
  (`author_association`), комментарии ботов игнорируются — иначе задание пропускается
  без вызова модели. Action дополнительно требует у автора права `write` и по умолчанию
  не пускает ботов (`allowed_bots` не задан). Fork-PR секретов не получают:
  `pull_request_target` не используется.
- **Права:** `contents: read` и `id-token: write` (OIDC-токен меняется на токен
  GitHub App — им агент читает issues через `gh`, комментирует и пушит),
  `persist-credentials: false` у checkout. Остальное по умолчанию закрыто
  (`permissions: {}`).
- **Ограничения:** `timeout-minutes: 60`; `concurrency` — один прогон на номер issue/PR,
  следующий ждёт в очереди. Остановить текущий прогон — *Cancel workflow*, отключить
  будущие — *Disable workflow* в Actions; при необходимости токен отзывается
  в настройках аккаунта Claude.
- **Скиллы и настройки на раннере:** раннер стартует с чистого окружения, но скиллы
  [mattpocock/skills](https://github.com/mattpocock/skills) лежат в репозитории в
  `.claude/skills/` — родном каталоге проектных скиллов Claude Code. `CLAUDE.md`
  подключает `AGENTS.md`, вместе с кодом приходят настройки трекера `docs/agents/`.
  Глобальных скиллов воркфлоу не требует.

### Автотриаж

Воркфлоу [`claude-triage.yml`](.github/workflows/claude-triage.yml) делает предварительный
разбор нового обращения по скиллу `triage` — тот же разбор, что агент сделал вручную в #4.

- **Событие:** `issues` с `types: [opened]`.
- **Модель:** `claude-sonnet-5-5`, не больше 15 ходов (`--max-turns 15`),
  `timeout-minutes: 15`, `concurrency` по номеру issue. Авторизация — секрет
  `CLAUDE_CODE_OAUTH_TOKEN`, как в `claude.yml`.
- **Что делает:** читает `.claude/skills/triage/SKILL.md` и `docs/agents/`, сверяет обращение
  с тем, что уже умеет приложение (контракт, бэкенд, фронтенд, `GLOSSARY.md`, `docs/adr/`),
  ставит метку категории и состояния из `docs/agents/triage-labels.md` (`needs-info`, если
  данных не хватает, иначе `needs-triage`) и оставляет один комментарий с разбором и
  вопросами. Код не меняет, ветки и PR не создаёт, `ready-for-agent` не ставит — это решает
  человек.
- **Фильтры (задание не запускается):** автор — бот (в том числе `claude[bot]`); автор не
  OWNER/MEMBER/COLLABORATOR; у issue уже есть метка `ready-for-agent` или `ready-for-human`.
- **Почему тикеты скиллов пропускаются:** issue с метками `ready-for-agent`/`ready-for-human`
  — это спецификации и тикеты, подготовленные скиллами `to-spec`/`to-tickets`; они уже
  разобраны, повторный триаж только создал бы шум и расход лимитов.
- **Где смотреть результат:** комментарий `claude[bot]` и метки в самом issue; прогон —
  [Actions → claude-triage](https://github.com/alextechnohippie/ai-for-developers-project-387/actions/workflows/claude-triage.yml).
- **Кто добавляет воркфлоу:** файлы воркфлоу в этом репозитории добавляет человек, потому что
  у GitHub App Claude нет права `workflows` (разрешения приложения задаёт его владелец), и
  агент не может пушить изменения в `.github/workflows/`.

### Авторевью

[`claude-review.yml`](.github/workflows/claude-review.yml) — независимое ревью PR
по критериям из [`REVIEW.md`](REVIEW.md). Агент готовит воркфлоу черновиком, в `.github/workflows/`
его переносит человек после проверки (у GitHub App Claude нет права `workflows`).

- **Событие и модель:** `pull_request` (`opened`, `synchronize`, `reopened`, `ready_for_review`);
  `claude-sonnet-5-5`, `--max-turns 20`, `timeout-minutes: 15`.
- **Права:** `permissions: {}` на уровне воркфлоу; у задания `contents: read`, `issues: read`,
  `pull-requests: write`, `actions: read`, `checks: read`, `statuses: read`. OIDC не нужен.
- **Фильтры:** не draft; PR из этого же репозитория (fork-PR не запускаются и секретов не получают);
  автор OWNER/MEMBER/COLLABORATOR **или** `claude[bot]`.
- **Критерии из базовой ветки:** `REVIEW.md` берётся из `base.sha` (`git show`), поэтому PR не может
  подменить критерии, по которым его ревьюят. Код читается с `head.sha`.
- **Публикация отдельным шагом:** модель только пишет `review.md` (редактирование файлов запрещено,
  из `gh` разрешено чтение); комментарий «Авторевью для `<head SHA>`» со ссылкой на прогон
  публикует отдельный шаг без модели.
- **Отмена устаревших запусков:** `concurrency` по номеру PR с `cancel-in-progress: true` — новый
  push отменяет ревью предыдущего коммита.
- **Почему CLI, а не action:** `claude -p` с явным списком `--allowedTools` даёт полный контроль над
  правами и публикацией результата; action на PR-событиях пришлось бы наделять правом писать в репозиторий.
- **Почему PR `claude[bot]` тоже ревьюятся:** PR агента не менее рискованны, чем человеческие, а ревью
  должно быть независимым от автора; поэтому тип `Bot` целиком не отсекается: кроме доверенных людей допускается `claude[bot]`.

### Браузерная проверка PR

[`pr-e2e.yml`](.github/workflows/pr-e2e.yml) прогоняет `mise run e2e` на версии автора.

- **Head SHA вместо merge-коммита:** checkout `github.event.pull_request.head.sha`, а не
  `refs/pull/N/merge`; проверяется именно тот код, который видит ревьюер. Фактический
  `git rev-parse HEAD` и результат записываются в `e2e-meta/SHA.txt`, `e2e-meta/RESULT.txt` и в сводку прогона.
- **Trace:** `PW_TRACE=on` включает Playwright trace для каждого теста; html-отчёт `playwright-report/`.
- **Артефакт:** `e2e-<head SHA>` (`e2e/e2e-meta/`, `e2e/test-results/`, `e2e/playwright-report/`) загружается даже при провале.
- **Права:** `contents: read`, без секретов; только PR из этого репозитория; `timeout-minutes: 20`.
- **Сверка перед мержем:** убедиться, что SHA в имени артефакта равен текущему head PR и совпадает с
  SHA в комментарии авторевью; после нового push результат устарел.

### Предел запусков

[`claude.yml`](.github/workflows/claude.yml) ограничивает агента **тремя вызовами на PR**.

- **Когда проверяется:** задание `budget` (без модели) идёт до задания `claude`; при `used >= 3`
  модель не вызывается. Для комментариев в обычном issue предел не применяется.
- **Как считается:** прогоны `claude.yml` с именем `claude #<N>` (`run-name`), задания `claude` всех
  попыток (`filter=all`) с итогом не `skipped` и не пустым — успешные, упавшие, отменённые, по
  тайм-ауту и повторные (Re-run). Текущая попытка текущего прогона исключается.
- **Почему агент не может переписать счётчик:** счётчик — история прогонов Actions; у токена
  заданий `budget` только `actions: read`, а у GitHub App Claude нет права на `workflows`
  и записи в Actions. Изменить имя прогона или итоги заданий агент не может.
- **Причины остановки:** задание `report` (без модели) пишет комментарий «⛔ Агент остановлен — нужен человек»
  с причиной, `used/limit`, SHA и ссылкой на логи: `limit_exhausted` (предел исчерпан), `infra`
  (упал `Set up job`, `Checkout` или `Check token`), `agent_failed` (упал `Run Claude Code`),
  `timeout` (задание отменено по тайм-ауту), `cancelled` (отмена вручную — смотреть логи).
- **Шаг `Check token`:** падает, если секрет `CLAUDE_CODE_OAUTH_TOKEN` пуст.

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
