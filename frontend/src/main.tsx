import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { queryClient } from "@/lib/query-client";
import { ThemeProvider } from "@/app/providers/theme-provider";
import { AuthEvents } from "@/app/providers/auth-events";
import "./styles/globals.css";

const container = document.getElementById("root");
if (!container) throw new Error("缺少 #root 挂载节点");

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthEvents>
            <App />
          </AuthEvents>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
