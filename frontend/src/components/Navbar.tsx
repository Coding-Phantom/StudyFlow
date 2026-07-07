import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Home" },
  { to: "/plans", label: "Study Plans" },
  { to: "/learn", label: "Learn" },
  { to: "/quiz", label: "Quiz" },
  { to: "/calendar", label: "Calendar" },
];

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <NavLink
          to="/"
          className="text-lg font-extrabold tracking-tight text-gradient"
        >
          StudyFlow
        </NavLink>
        <div className="flex gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-indigo-50/80 text-indigo-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/60"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
