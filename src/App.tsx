import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StoreProvider } from "@/contexts/StoreContext";
import Index from "./pages/Index";
import BookingPage from "./pages/BookingPage";
import MyBookingsPage from "./pages/MyBookingsPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <StoreProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/booking" element={<BookingPage />} />
            {/* LINE 圖文選單 / 訊息連結常用短網址（與 /booking 相同） */}
            <Route path="/mylinecalendar" element={<BookingPage />} />
            <Route path="/my-line-calendar" element={<Navigate to="/mylinecalendar" replace />} />
            <Route path="/my-bookings" element={<MyBookingsPage />} />
            <Route path="/mylinebookings" element={<MyBookingsPage />} />
            <Route path="/my-line-bookings" element={<Navigate to="/mylinebookings" replace />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </StoreProvider>
);

export default App;
