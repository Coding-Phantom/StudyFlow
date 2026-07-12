import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

export default function Layout() {
  return (
    <div className="min-h-screen bg-page app-shell">
      <Navbar />
      <main className="app-main max-w-6xl px-4 sm:px-8 py-8 lg:py-12">
        <div className="signal-line" aria-hidden="true"><span>LIVE LEARNING LOOP</span></div>
        <Outlet />
      </main>
    </div>
  );
}
