import { expect, test } from "@playwright/test";

// Сквозной happy-path против живого стека (без подмены ответов API):
// гость выбирает тип → видит слоты → бронирует → видит подтверждение;
// затем бронь появляется в списке владельца.
test("гость бронирует слот, владелец видит встречу", async ({ page }) => {
  const guestName = `Гость ${Date.now()}`;

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Календарь звонков", level: 1 })).toBeVisible();

  // Выбираем тип «Консультация».
  const consultation = page.getByRole("article", { name: "Консультация" });
  await consultation.getByRole("link", { name: "Выбрать время" }).click();

  // Видим свободные слоты, берём первый.
  const firstSlot = page.locator("button.slot").first();
  await expect(firstSlot).toBeVisible();
  await firstSlot.click();

  // Заполняем имя и бронируем.
  await page.getByLabel("Ваше имя").fill(guestName);
  await page.getByRole("button", { name: "Записаться" }).click();

  // Подтверждение.
  await expect(page.getByText("Готово! Вы записаны.")).toBeVisible();
  await expect(page.getByText(guestName)).toBeVisible();

  // Бронь видна в списке владельца.
  await page.goto("/#/owner");
  await expect(page.getByRole("heading", { name: "Предстоящие встречи", level: 1 })).toBeVisible();
  const item = page.locator(".owner-item").filter({ hasText: guestName });
  await expect(item).toBeVisible();
  await expect(item.getByText("Консультация")).toBeVisible();
  // Соседний сценарий: запись без темы — без блока темы.
  await expect(item.locator(".owner-topic")).toHaveCount(0);
});

// Основной сценарий темы разговора: запись с темой видна владельцу в списке.
test("гость указывает тему разговора, владелец видит её в списке", async ({ page }) => {
  const guestName = `Гость с темой ${Date.now()}`;

  await page.goto("/#/book/consultation");
  await page.locator("button.slot").first().click();
  await page.getByLabel("Ваше имя").fill(guestName);
  await page.getByLabel("Тема разговора").fill("Первый вопрос\nВторой вопрос");
  await page.getByRole("button", { name: "Записаться" }).click();
  await expect(page.getByText("Готово! Вы записаны.")).toBeVisible();

  await page.goto("/#/owner");
  const item = page.locator(".owner-item").filter({ hasText: guestName });
  await expect(item).toBeVisible();
  await expect(item.locator(".owner-topic")).toHaveText("Первый вопрос\nВторой вопрос");
});

// Негативный сценарий: конфликт времени — запись с темой не создаётся, тема не появляется у владельца.
test("при конфликте времени запись и её тема не создаются", async ({ page, context }) => {
  const stamp = Date.now();
  const firstGuest = `Первый ${stamp}`;
  const secondGuest = `Второй ${stamp}`;
  const secondTopic = `Тема второго ${stamp}`;

  // Второй гость открывает форму и выбирает слот, но не отправляет её.
  await page.goto("/#/book/consultation");
  const firstSlot = page.locator("button.slot").first();
  await expect(firstSlot).toBeVisible();
  const slotLabel = (await firstSlot.textContent()) ?? "";
  await firstSlot.click();
  await page.getByLabel("Ваше имя").fill(secondGuest);
  await page.getByLabel("Тема разговора").fill(secondTopic);

  // Первый гость тем временем занимает тот же слот.
  const other = await context.newPage();
  await other.goto("/#/book/consultation");
  await other.locator("button.slot").filter({ hasText: slotLabel }).first().click();
  await other.getByLabel("Ваше имя").fill(firstGuest);
  await other.getByRole("button", { name: "Записаться" }).click();
  await expect(other.getByText("Готово! Вы записаны.")).toBeVisible();

  // Отправка второго гостя отклоняется конфликтом.
  await page.getByRole("button", { name: "Записаться" }).click();
  await expect(page.getByRole("alert")).toContainText("уже занято");

  await page.goto("/#/owner");
  await expect(page.locator(".owner-item").filter({ hasText: firstGuest })).toBeVisible();
  await expect(page.getByText(secondGuest)).toHaveCount(0);
  await expect(page.getByText(secondTopic)).toHaveCount(0);
});
