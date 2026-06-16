import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Landing from "@/pages/Landing";
import Planning from "@/pages/Planning";
import TripResult from "@/pages/TripResult";
import SavedTrips from "@/pages/SavedTrips";
import AuthPage from "@/pages/AuthPage";
import Navbar from "@/components/Navbar";
import Chatbot from "@/components/Chatbot";
import { AuthProvider } from "@/context/AuthContext";

function App() {
  useEffect(() => {
    document.title = "TripGenie — AI Trip Planner";
  }, []);

  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/planning/:id" element={<Planning />} />
            <Route path="/trip/:id" element={<TripResult />} />
            <Route path="/trips" element={<SavedTrips />} />
          </Routes>
          <Chatbot />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
