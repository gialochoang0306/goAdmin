import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, ScrollRestoration } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "antd";
import { ThemeProvider } from "./theme/ThemeProvider";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import { AuthProvider } from "./auth";
import { AdminApp } from "./App";
import "./styles.css";

dayjs.locale("vi");
const router = createBrowserRouter([{ path: "*", element: <><AdminApp /><ScrollRestoration getKey={location => location.pathname + location.search} /></> }]);
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
    <ThemeProvider>
      <App>
        <QueryClientProvider client={client}>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </QueryClientProvider>
      </App>
    </ThemeProvider>
  </React.StrictMode>,
);
