import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App, ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import { AuthProvider } from "./auth";
import { AdminApp } from "./App";
import "./styles.css";

dayjs.locale("vi");
const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 15_000,
      refetchIntervalInBackground: false,
    },
    mutations: { retry: false },
  },
});
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: "#800000",
          borderRadius: 6,
          fontSize: 14,
          colorBgLayout: "#f7f7f8",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
      }}
    >
      <App>
        <QueryClientProvider client={client}>
          <AuthProvider>
            <BrowserRouter>
              <AdminApp />
            </BrowserRouter>
          </AuthProvider>
        </QueryClientProvider>
      </App>
    </ConfigProvider>
  </React.StrictMode>,
);
