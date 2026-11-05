import { Select } from "antd";
import { BulbOutlined, DesktopOutlined, MoonOutlined } from "@ant-design/icons";
import { useTheme } from "../theme/ThemeProvider";

export function ThemeSwitcher() {
  const theme = useTheme();
  if (!theme) return null;
  return <Select className="theme-switcher" aria-label="Giao diện"
    value={theme.preference} onChange={theme.setPreference} popupMatchSelectWidth={150}
    options={[
      { value: "light", label: <><BulbOutlined /> Sáng</> },
      { value: "dark", label: <><MoonOutlined /> Tối</> },
      { value: "system", label: <><DesktopOutlined /> Hệ thống</> },
    ]}
  />;
}
