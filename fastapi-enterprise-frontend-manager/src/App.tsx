import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/ReactToastify.css";

// Import Layout & Pages
import DashboardLayout from "./layouts/DashboardLayout";
import Login from "./pages/Login";
import Home from "./pages/Home";
import UserList from "./pages/UserList";
import Register from "./pages/Register";
import EditUser from "./pages/EditUser";
import NotFound from "./NotFound";
import Profile from "./pages/Profile";
import Logs from "./pages/Logs";
import LogAnalysis from "./pages/LogAnalysis";

// Import the Modal
import ChangePasswordModal from "./components/ChangePasswordModel";

export default function App() {
  const [showModal, setShowModal] = useState(false);

  // State to hold the current logged-in user
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    }
    return null;
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark";
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }

    // Listener for the global "Password Change" event
    const handleEvent = () => setShowModal(true);
    window.addEventListener("REQUIRE_PASSWORD_CHANGE", handleEvent);

    return () =>
      window.removeEventListener("REQUIRE_PASSWORD_CHANGE", handleEvent);
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <>
      {showModal && <ChangePasswordModal onClose={() => setShowModal(false)} />}

      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route
            path="/login"
            element={
              <div className="min-h-screen flex flex-col p-4 md:p-8 relative bg-slate-100 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 transition-colors duration-300">
                <div className="absolute top-4 right-4">
                  <button
                    onClick={toggleTheme}
                    className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:scale-105 transition-all shadow-lg"
                  >
                    {isDarkMode ? (
                      <span className="text-sm font-bold">Light Mode</span>
                    ) : (
                      <span className="text-sm font-bold">Dark Mode</span>
                    )}
                  </button>
                </div>
                <Login onLoginSuccess={(userData: any) => setCurrentUser(userData)} />
              </div>
            }
          />

          {/* Protected Routes */}
          <Route
            element={
              <DashboardLayout
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
                currentUser={currentUser}
              />
            }
          >
            <Route path="/home" element={<Home />} />
            <Route path="/users" element={<UserList />} />
            <Route path="/users/register" element={<Register />} />
            <Route path="/users/edit/:id" element={<EditUser />} />
            <Route path="/me" element={<Profile />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/logs/system" element={<LogAnalysis />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
          draggable
          theme="colored"
        />
      </BrowserRouter>
    </>
  );
}