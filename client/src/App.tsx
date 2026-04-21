import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ContactsListPage } from "@/pages/contacts/ContactsListPage";
import { ContactDetailPage } from "@/pages/contacts/ContactDetailPage";
import { WorkshopsListPage } from "@/pages/workshops/WorkshopsListPage";
import { WorkshopDetailPage } from "@/pages/workshops/WorkshopDetailPage";
import { AppLayout } from "@/components/layout/AppLayout";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { email, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        Loading...
      </div>
    );
  if (!email) return <Navigate to="/login" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/contacts" element={<ContactsListPage />} />
              <Route path="/contacts/:id" element={<ContactDetailPage />} />
              <Route path="/workshops" element={<WorkshopsListPage />} />
              <Route path="/workshops/:id" element={<WorkshopDetailPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
