import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { FilterMultiSelect, FilterSelect } from "../components/FilterSelect";

it("offers an explicit all option that clears the single filter", async () => {
  const changes: (string | undefined)[] = [];
  render(
    <FilterSelect
      aria-label="Trạng thái khách hàng"
      allLabel="Tất cả trạng thái"
      options={[{ value: "ACTIVE", label: "Hoạt động" }, { value: "BANNED", label: "Bị khóa" }]}
      value="ACTIVE"
      onChange={(value) => changes.push(value)}
    />,
  );
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  await user.click(screen.getByRole("combobox", { name: "Trạng thái khách hàng" }));
  await user.click(await screen.findByText("Tất cả trạng thái", { selector: ".ant-select-item-option-content" }));
  expect(changes).toEqual([undefined]);
});

it("clears every selected value when the all option is chosen in a multi filter", async () => {
  const changes: (string[] | undefined)[] = [];
  render(
    <FilterMultiSelect
      aria-label="Trạng thái chuyến"
      allLabel="Tất cả trạng thái"
      options={[{ value: "PENDING", label: "Chờ xử lý" }, { value: "COMPLETED", label: "Hoàn thành" }]}
      value={["PENDING"]}
      onChange={(value) => changes.push(value)}
    />,
  );
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  await user.click(screen.getByRole("combobox", { name: "Trạng thái chuyến" }));
  await user.click(await screen.findByText("Tất cả trạng thái", { selector: ".ant-select-item-option-content" }));
  expect(changes).toEqual([undefined]);
});

it("keeps the all option first so it is reachable without scrolling", async () => {
  const options = Array.from({ length: 30 }, (_, index) => ({ value: `V${index}`, label: `Trạng thái ${index}` }));
  render(
    <FilterSelect aria-label="Trạng thái dài" allLabel="Tất cả trạng thái" options={options} value="" onChange={vi.fn()} />,
  );
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  await user.click(screen.getByRole("combobox", { name: "Trạng thái dài" }));
  const allOption = await screen.findByText("Tất cả trạng thái", { selector: ".ant-select-item-option-content" });
  expect(allOption.closest(".ant-select-item-option")).not.toBeNull();
  expect(allOption.closest(".ant-select-item-option")).toHaveClass("ant-select-item-option-active");
});
