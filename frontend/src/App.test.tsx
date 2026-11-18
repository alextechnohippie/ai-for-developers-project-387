import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

// Юнит-тест изолирован от бэкенда: сгенерированный SDK замокан. Реальную
// связь фронт→бэк через контракт проверяет браузерный e2e (тикет ai-for-developers-project-386#12).
const { listSlotsMock, createBookingMock, listBookingsMock } = vi.hoisted(() => ({
  listSlotsMock: vi.fn(),
  createBookingMock: vi.fn(),
  listBookingsMock: vi.fn(),
}));

vi.mock("./api/generated", () => ({
  listMeetingTypes: vi.fn(() =>
    Promise.resolve({
      data: [
        {
          id: "introduction",
          title: "Знакомство",
          description: "Короткий звонок, чтобы обсудить ваш вопрос.",
          durationMinutes: 15,
        },
        {
          id: "consultation",
          title: "Консультация",
          description: "Подробный разговор по вашей задаче.",
          durationMinutes: 30,
        },
      ],
    }),
  ),
  listSlots: listSlotsMock,
  createBooking: createBookingMock,
  listBookings: listBookingsMock,
}));

// 06:00Z / 06:30Z = 09:00 / 09:30 по Москве.
const SLOTS = [
  { start: "2026-11-05T06:00:00Z", end: "2026-11-05T06:30:00Z" },
  { start: "2026-11-05T06:30:00Z", end: "2026-11-05T07:00:00Z" },
];

const BOOKING = {
  id: "b-1",
  meetingTypeId: "consultation",
  start: "2026-11-05T06:00:00Z",
  end: "2026-11-05T06:30:00Z",
  guestName: "Аня",
};

beforeEach(() => {
  listSlotsMock.mockResolvedValue({ data: SLOTS });
  createBookingMock.mockResolvedValue({ data: BOOKING });
  listBookingsMock.mockResolvedValue({ data: [] });
});

afterEach(() => {
  cleanup();
  listSlotsMock.mockReset();
  createBookingMock.mockReset();
  listBookingsMock.mockReset();
  window.history.replaceState(null, "", "/");
});

describe("Путь гостя", () => {
  it.each([
    ["introduction", "Знакомство", "15 минут"],
    ["consultation", "Консультация", "30 минут"],
  ])("открывает прямую ссылку на %s", async (id, name, duration) => {
    window.history.replaceState(null, "", `/#/book/${id}`);
    render(<App />);
    expect(await screen.findByRole("heading", { name, level: 1 })).toBeDefined();
    expect(screen.getByText(duration)).toBeDefined();
    // document.title выставляется эффектом после загрузки типов — ждём обновления.
    await waitFor(() => expect(document.title).toContain(name));
  });

  it("позволяет вернуться с неизвестной ссылки", async () => {
    window.history.replaceState(null, "", "/#/book/unknown");
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Страница не найдена" })).toBeDefined();
    fireEvent.click(screen.getByRole("link", { name: "Вернуться на главную" }));
    expect(
      await screen.findByRole("heading", { name: "Календарь звонков", level: 1 }),
    ).toBeDefined();
  });

  it.each([
    ["Знакомство", "15 минут"],
    ["Консультация", "30 минут"],
  ])("переходит к записи на %s и видит свободное время", async (name, duration) => {
    render(<App />);
    fireEvent.click(
      within(await screen.findByRole("article", { name })).getByRole("link", {
        name: "Выбрать время",
      }),
    );
    expect(await screen.findByRole("heading", { name, level: 1 })).toBeDefined();
    expect(screen.getByText(duration)).toBeDefined();
    expect(await screen.findByRole("button", { name: "09:00" })).toBeDefined();
    fireEvent.click(screen.getByRole("link", { name: "Вернуться на главную" }));
    expect(
      await screen.findByRole("heading", { name: "Календарь звонков", level: 1 }),
    ).toBeDefined();
  });

  it("показывает описание сервиса и два типа встречи с бэкенда", async () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Календарь звонков", level: 1 })).toBeDefined();
    expect(
      screen.getByText("Выберите формат встречи и удобное время. Регистрация не нужна."),
    ).toBeDefined();
    const introduction = await screen.findByRole("article", { name: "Знакомство" });
    expect(within(introduction).getByText("15 минут")).toBeDefined();
    expect(within(introduction).getByRole("link", { name: "Выбрать время" })).toBeDefined();
    const consultation = screen.getByRole("article", { name: "Консультация" });
    expect(within(consultation).getByText("30 минут")).toBeDefined();
    expect(within(consultation).getByRole("link", { name: "Выбрать время" })).toBeDefined();
  });

  it("показывает свободные слоты выбранного типа, сгруппированные по дню", async () => {
    window.history.replaceState(null, "", "/#/book/consultation");
    render(<App />);
    expect(await screen.findByRole("button", { name: "09:00" })).toBeDefined();
    expect(screen.getByRole("button", { name: "09:30" })).toBeDefined();
    expect(screen.getByText("5 ноября")).toBeDefined();
  });

  it("сообщает, когда свободных слотов нет", async () => {
    listSlotsMock.mockResolvedValueOnce({ data: [] });
    window.history.replaceState(null, "", "/#/book/consultation");
    render(<App />);
    expect(await screen.findByText("Свободных слотов пока нет.")).toBeDefined();
  });

  it("создаёт запись и показывает подтверждение", async () => {
    window.history.replaceState(null, "", "/#/book/consultation");
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "09:00" }));
    fireEvent.change(screen.getByLabelText("Ваше имя"), { target: { value: "Аня" } });
    fireEvent.click(screen.getByRole("button", { name: "Записаться" }));
    expect(await screen.findByText("Готово! Вы записаны.")).toBeDefined();
    expect(screen.getByText(/Аня/)).toBeDefined();
  });

  it("показывает понятное сообщение при конфликте слота", async () => {
    createBookingMock.mockResolvedValueOnce({
      error: {
        code: "SLOT_TAKEN",
        message: "Это время уже занято. Выберите другой свободный слот.",
      },
    });
    window.history.replaceState(null, "", "/#/book/consultation");
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "09:00" }));
    fireEvent.change(screen.getByLabelText("Ваше имя"), { target: { value: "Аня" } });
    fireEvent.click(screen.getByRole("button", { name: "Записаться" }));
    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByText(/уже занято/)).toBeDefined();
  });

  it("показывает владельцу список предстоящих встреч с типом, временем и именем", async () => {
    listBookingsMock.mockResolvedValue({
      data: [
        {
          id: "b1",
          meetingTypeId: "consultation",
          start: "2026-11-05T06:00:00Z",
          end: "2026-11-05T06:30:00Z",
          guestName: "Анна",
        },
        {
          id: "b2",
          meetingTypeId: "introduction",
          start: "2026-11-05T07:00:00Z",
          end: "2026-11-05T07:15:00Z",
          guestName: "Борис",
        },
      ],
    });
    window.history.replaceState(null, "", "/#/owner");
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "Предстоящие встречи", level: 1 }),
    ).toBeDefined();
    // Список приходит из listBookings асинхронно — ждём появления содержимого.
    expect(await screen.findByText("Консультация")).toBeDefined();
    expect(screen.getByText("Анна")).toBeDefined();
    expect(screen.getByText("Знакомство")).toBeDefined();
    expect(screen.getByText("Борис")).toBeDefined();
  });

  it("показывает необязательное поле темы и не отправляет пустую тему", async () => {
    window.history.replaceState(null, "", "/#/book/consultation");
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "09:00" }));
    fireEvent.change(screen.getByLabelText("Ваше имя"), { target: { value: "Аня" } });
    const topic = screen.getByLabelText("Тема разговора") as HTMLTextAreaElement;
    expect(topic.tagName).toBe("TEXTAREA");
    expect(topic.required).toBe(false);
    fireEvent.change(topic, { target: { value: "   \n  " } });
    fireEvent.click(screen.getByRole("button", { name: "Записаться" }));
    await screen.findByText("Готово! Вы записаны.");
    expect(createBookingMock).toHaveBeenCalledWith({
      body: { meetingTypeId: "consultation", start: "2026-11-05T06:00:00Z", guestName: "Аня" },
    });
  });

  it("отправляет непустую тему в запросе", async () => {
    window.history.replaceState(null, "", "/#/book/consultation");
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "09:00" }));
    fireEvent.change(screen.getByLabelText("Ваше имя"), { target: { value: "Аня" } });
    fireEvent.change(screen.getByLabelText("Тема разговора"), {
      target: { value: "  Договор\nСроки  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Записаться" }));
    await screen.findByText("Готово! Вы записаны.");
    expect(createBookingMock).toHaveBeenCalledWith({
      body: {
        meetingTypeId: "consultation",
        start: "2026-11-05T06:00:00Z",
        guestName: "Аня",
        topic: "Договор\nСроки",
      },
    });
  });

  it("показывает владельцу тему полностью, с переносами строк", async () => {
    listBookingsMock.mockResolvedValue({
      data: [{ ...BOOKING, topic: "Первый вопрос\nВторой вопрос" }],
    });
    window.history.replaceState(null, "", "/#/owner");
    render(<App />);
    const topic = await screen.findByText(
      (_, element) =>
        element?.classList.contains("owner-topic") === true &&
        element.textContent === "Первый вопрос\nВторой вопрос",
    );
    expect(topic).toBeDefined();
  });

  it("не рисует блок темы у записей без темы", async () => {
    listBookingsMock.mockResolvedValue({ data: [BOOKING, { ...BOOKING, id: "b-2", topic: null }] });
    window.history.replaceState(null, "", "/#/owner");
    const { container } = render(<App />);
    expect(await screen.findAllByText("Аня")).toHaveLength(2);
    expect(container.querySelector(".owner-topic")).toBeNull();
  });

  it("выводит HTML-подобную тему как обычный текст", async () => {
    const html = '<img src=x onerror="alert(1)"> <a href="https://example.com">ссылка</a>';
    listBookingsMock.mockResolvedValue({ data: [{ ...BOOKING, topic: html }] });
    window.history.replaceState(null, "", "/#/owner");
    const { container } = render(<App />);
    expect(await screen.findByText(html)).toBeDefined();
    expect(container.querySelector(".owner-topic img")).toBeNull();
    expect(container.querySelector(".owner-topic a")).toBeNull();
  });

  it("показывает гостю тему на экране подтверждения, с переносами строк", async () => {
    createBookingMock.mockResolvedValueOnce({ data: { ...BOOKING, topic: "Договор\nСроки" } });
    window.history.replaceState(null, "", "/#/book/consultation");
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "09:00" }));
    fireEvent.change(screen.getByLabelText("Ваше имя"), { target: { value: "Аня" } });
    fireEvent.change(screen.getByLabelText("Тема разговора"), {
      target: { value: "Договор\nСроки" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Записаться" }));
    await screen.findByText("Готово! Вы записаны.");
    expect(
      screen.getByText(
        (_, element) =>
          element?.classList.contains("confirmation-topic") === true &&
          element.textContent === "Договор\nСроки",
      ),
    ).toBeDefined();
  });

  it("не рисует блок темы на подтверждении, если темы нет", async () => {
    window.history.replaceState(null, "", "/#/book/consultation");
    const { container } = render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "09:00" }));
    fireEvent.change(screen.getByLabelText("Ваше имя"), { target: { value: "Аня" } });
    fireEvent.click(screen.getByRole("button", { name: "Записаться" }));
    await screen.findByText("Готово! Вы записаны.");
    expect(container.querySelector(".confirmation-topic")).toBeNull();
    expect(screen.queryByText("Тема разговора:")).toBeNull();
  });

  it("показывает подсказку про лимит темы", async () => {
    window.history.replaceState(null, "", "/#/book/consultation");
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "09:00" }));
    expect(screen.getByText("до 500 символов")).toBeDefined();
    const topic = screen.getByLabelText("Тема разговора");
    expect(topic.getAttribute("aria-describedby")).toBe(screen.getByText("до 500 символов").id);
  });

  it("показывает сообщение при 400 и позволяет исправить тему и повторить", async () => {
    const message = "Тема разговора не должна быть длиннее 500 символов.";
    createBookingMock.mockResolvedValueOnce({ error: { code: "VALIDATION_ERROR", message } });
    window.history.replaceState(null, "", "/#/book/consultation");
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "09:00" }));
    fireEvent.change(screen.getByLabelText("Ваше имя"), { target: { value: "Аня" } });
    fireEvent.change(screen.getByLabelText("Тема разговора"), { target: { value: "длинная" } });
    fireEvent.click(screen.getByRole("button", { name: "Записаться" }));
    expect((await screen.findByRole("alert")).textContent).toBe(message);
    // Форма и введённый текст сохранены — гость сокращает тему и отправляет снова.
    expect((screen.getByLabelText("Тема разговора") as HTMLTextAreaElement).value).toBe("длинная");
    fireEvent.change(screen.getByLabelText("Тема разговора"), { target: { value: "коротко" } });
    fireEvent.click(screen.getByRole("button", { name: "Записаться" }));
    expect(await screen.findByText("Готово! Вы записаны.")).toBeDefined();
    expect(createBookingMock).toHaveBeenCalledTimes(2);
    expect(createBookingMock).toHaveBeenLastCalledWith({
      body: {
        meetingTypeId: "consultation",
        start: "2026-11-05T06:00:00Z",
        guestName: "Аня",
        topic: "коротко",
      },
    });
  });
});
