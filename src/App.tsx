import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StoreProvider } from "@/contexts/StoreContext";
import { SlugGuard } from "@/components/SlugGuard";
import { SkipLink } from "@/components/SkipLink";
import LandingPage from "./pages/LandingPage";
import LandingPageStitch from "./pages/LandingPageStitch";
import BookingPage from "./pages/BookingPage";
import MyBookingsPage from "./pages/MyBookingsPage";
import AdminPage from "./pages/AdminPage";
import SuperAdminPage from "./pages/SuperAdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <StoreProvider>
          <Toaster />
          <Sonner />
          <SkipLink />
          <div id="main-content" tabIndex={-1} className="outline-none">
            <Routes>
              {/* C1：依店家 slug 的網址（與下方舊路徑並存） */}
              <Route
                path="/s/:slug/my-bookings"
                element={
                  <SlugGuard>
                    <MyBookingsPage />
                  </SlugGuard>
                }
              />
              <Route
                path="/s/:slug/admin"
                element={
                  <SlugGuard>
                    <AdminPage />
                  </SlugGuard>
                }
              />
              <Route
                path="/s/:slug/booking"
                element={
                  <SlugGuard>
                    <BookingPage />
                  </SlugGuard>
                }
              />
              <Route
                path="/s/:slug"
                element={
                  <SlugGuard>
                    <LandingPageStitch />
                  </SlugGuard>
                }
              />
              <Route path="/" element={<LandingPageStitch />} />
              {/* 舊版首頁保留供參考 */}
              <Route path="/landing-legacy" element={<LandingPage />} />
              <Route path="/booking" element={<BookingPage />} />
              {/* LINE 圖文選單 / 訊息連結常用短網址（與 /booking 相同） */}
              <Route path="/mylinecalendar" element={<BookingPage />} />
              <Route path="/my-line-calendar" element={<Navigate to="/mylinecalendar" replace />} />
              <Route path="/my-bookings" element={<MyBookingsPage />} />
              <Route path="/mylinebookings" element={<MyBookingsPage />} />
              <Route path="/my-line-bookings" element={<Navigate to="/mylinebookings" replace />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/super-admin" element={<SuperAdminPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </StoreProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
