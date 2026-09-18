import { NavLink } from "react-router-dom";

import { useAuth } from "../context/useAuth";

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">🌳</span> Darukaa.Earth
      </div>
      <nav className="navbar-links">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
          Dashboard
        </NavLink>
        <NavLink to="/map" className={({ isActive }) => (isActive ? "active" : "")}>
          Map
        </NavLink>
      </nav>
      <div className="navbar-user">
        <span>{user?.full_name}</span>
        <button type="button" onClick={logout} className="btn btn-ghost">
          Sign out
        </button>
      </div>
    </header>
  );
}
