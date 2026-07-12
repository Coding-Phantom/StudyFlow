import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Overview", code: "01" },
  { to: "/plans", label: "Plans", code: "02" },
  { to: "/learn", label: "Study", code: "03" },
  { to: "/quiz", label: "Evaluate", code: "04" },
  { to: "/calendar", label: "Timeline", code: "05" },
];

export default function Navbar() {
  return (
    <nav className="app-nav">
      <div className="nav-inner">
        <NavLink
          to="/"
          className="brand"
        >
          <span className="brand-mark"><i /><i /><i /></span>
          <span>STUDY<br/><b>FLOW</b></span>
        </NavLink>
        <div className="nav-links">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <small>{link.code}</small><span>{link.label}</span>
            </NavLink>
          ))}
        </div>
        <div className="nav-status"><span />SYSTEM<br/>ADAPTIVE</div>
      </div>
    </nav>
  );
}
