import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import { expect, it } from "vitest";
import { ImageViewer } from "../components/ImageViewer";

const source = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect width='800' height='600'/></svg>";

it("zooms, rotates, resets and reopens an image using labeled controls", async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  render(<ConfigProvider theme={{ token: { motion: false } }}>
    <ImageViewer src={source} alt="Ảnh xe thử nghiệm" width={188} />
  </ConfigProvider>);
  const trigger = screen.getByRole("button", { name: "Xem ảnh: Ảnh xe thử nghiệm" });
  trigger.focus();
  await user.keyboard("{Enter}");
  const zoom = await screen.findByRole("button", { name: "Phóng to ảnh" });
  const preview = () => document.querySelector<HTMLImageElement>(".ant-image-preview-img")!;
  fireEvent.load(preview());
  expect(screen.getByLabelText("Mức phóng ảnh")).toHaveTextContent("100%");
  await user.click(zoom);
  await waitFor(() => expect(screen.getByLabelText("Mức phóng ảnh")).toHaveTextContent("150%"));
  await user.click(screen.getByRole("button", { name: "Xoay phải 90 độ" }));
  await waitFor(() => expect(preview().style.transform).toContain("rotate(90deg)"));
  await user.click(screen.getByRole("button", { name: "Xoay trái 90 độ" }));
  await waitFor(() => expect(preview().style.transform).toContain("rotate(0deg)"));
  await user.click(screen.getByRole("button", { name: "Đặt lại ảnh" }));
  await waitFor(() => expect(screen.getByLabelText("Mức phóng ảnh")).toHaveTextContent("100%"));
  await user.click(screen.getByRole("button", { name: "Đóng ảnh" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Phóng to ảnh" })).not.toBeInTheDocument());
  await user.click(trigger);
  expect(await screen.findByLabelText("Mức phóng ảnh")).toHaveTextContent("100%");
  await user.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("button", { name: "Phóng to ảnh" })).not.toBeInTheDocument());
});

it("supports authenticated blob sources and enforces zoom boundaries", async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  render(<ConfigProvider componentDisabled theme={{ token: { motion: false } }}>
    <ImageViewer src="blob:synthetic-private-image" alt="Ảnh giấy tờ thử nghiệm" width={200} />
  </ConfigProvider>);
  await user.click(screen.getByRole("button", { name: "Xem ảnh: Ảnh giấy tờ thử nghiệm" }));
  expect(await screen.findByLabelText("Mức phóng ảnh")).toHaveTextContent("100%");
  expect(document.querySelector(".ant-image-preview-img")).toHaveAttribute("src", "blob:synthetic-private-image");
  fireEvent.load(document.querySelector(".ant-image-preview-img")!);
  for (let i = 0; i < 6; i++) await user.click(screen.getByRole("button", { name: "Thu nhỏ ảnh" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Thu nhỏ ảnh" })).toBeDisabled());
  for (let i = 0; i < 12; i++) await user.click(screen.getByRole("button", { name: "Phóng to ảnh" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Phóng to ảnh" })).toBeDisabled());
});
