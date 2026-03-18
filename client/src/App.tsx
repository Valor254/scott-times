import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { RouteGuard } from "@/components/layout/RouteGuard";
import Index from "./pages/Index";
import Feed from "./pages/Feed";
import ParentsHub from "./pages/ParentsHub";
import Clubs from "./pages/Clubs";
import Confessions from "./pages/Confessions";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/feed" element={<Feed />} />
              <Route
                path="/parents"
                element={
                  <RouteGuard allowed={["PARENT", "ADMIN"]}>
                    <ParentsHub />
                  </RouteGuard>
                }
              />
              <Route
                path="/clubs"
                element={
                  <RouteGuard allowed={["STUDENT", "ADMIN"]}>
                    <Clubs />
                  </RouteGuard>
                }
              />
              <Route
                path="/confessions"
                element={
                  <RouteGuard allowed={["STUDENT", "ADMIN"]}>
                    <Confessions />
                  </RouteGuard>
                }
              />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/admin"
                element={
                  <RouteGuard allowed={["ADMIN"]}>
                    <AdminDashboard />
                  </RouteGuard>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
