import { LayoutDashboard, LogOut, Map, Menu, TreePine, X } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";

import { useAuth } from "../context/useAuth";

export function Navbar() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="navbar">
      <div className="navbar-row">
        <div className="navbar-brand">
          <span className="navbar-logo">
            <TreePine size={20} />
          </span>
          Darukaa.Earth
        </div>
        <button
          type="button"
          className="navbar-toggle"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      <div className={`navbar-collapsible ${isMenuOpen ? "open" : ""}`}>
        <nav className="navbar-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? "active" : "")}
            onClick={() => setIsMenuOpen(false)}
          >
            <LayoutDashboard size={16} /> Dashboard
          </NavLink>
          <NavLink
            to="/map"
            className={({ isActive }) => (isActive ? "active" : "")}
            onClick={() => setIsMenuOpen(false)}
          >
            <Map size={16} /> Map
          </NavLink>
        </nav>
        <div className="navbar-user">
          <span>{user?.full_name}</span>
          <button type="button" onClick={logout} className="btn btn-ghost">
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
