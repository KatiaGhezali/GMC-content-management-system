import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import DashboardLayout from "./layouts/DashboardLayout";

import Overview from "./pages/dashboard/Overview";
import Posts from "./pages/dashboard/Posts";
import Categories from "./pages/dashboard/Categories";
import Tags from "./pages/dashboard/Tags";
import Comments from "./pages/dashboard/Comments";
import Media from "./pages/dashboard/Media";
import Analytics from "./pages/dashboard/Analytics";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Overview />} />
              <Route path="posts" element={<Posts />} />
              <Route
                element={<ProtectedRoute allowedRoles={["admin", "editor"]} />}
              >
                <Route path="categories" element={<Categories />} />
                <Route path="tags" element={<Tags />} />
                <Route path="comments" element={<Comments />} />
              </Route>
              <Route path="media" element={<Media />} />
              <Route
                element={<ProtectedRoute allowedRoles={["admin", "editor"]} />}
              >
                <Route path="analytics" element={<Analytics />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
