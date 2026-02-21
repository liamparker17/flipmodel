"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { theme } from "./theme";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "D" },
  { href: "/pipeline", label: "Pipeline", icon: "P" },
  { href: "/projects", label: "Projects", icon: "W" },
  { href: "/finance", label: "Finance", icon: "F" },
  { href: "/settings", label: "Settings", icon: "S" },
];

export default function Sidebar({ onNewDeal }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 640);
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const collapsed = isTablet;
  const sidebarWidth = collapsed ? 56 : 240;

  const isActive = (href) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const handleNav = (href) => {
    router.push(href);
    setMobileOpen(false);
  };

  const handleNewDeal = () => {
    if (onNewDeal) onNewDeal();
    setMobileOpen(false);
  };

  // Mobile: hamburger button (rendered by layout) + slide-out overlay
  if (isMobile) {
    return (
      <>
        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          style={{
            position: "fixed", top: 12, left: 12, zIndex: 200,
            width: 44, height: 44, borderRadius: 10,
            background: theme.card, border: `1px solid ${theme.cardBorder}`,
            color: theme.text, fontSize: 18, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          =
        </button>

        {/* Overlay */}
        {mobileOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 300 }}>
            <div onClick={() => setMobileOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
            <div style={{
              position: "relative", width: 260, height: "100%",
              background: theme.card, borderRight: `1px solid ${theme.cardBorder}`,
              display: "flex", flexDirection: "column", overflow: "auto",
            }}>
              <SidebarContent
                collapsed={false} isActive={isActive} onNav={handleNav}
                onNewDeal={handleNewDeal} onClose={() => setMobileOpen(false)}
              />
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop / Tablet: fixed sidebar
  return (
    <div style={{
      width: sidebarWidth, minHeight: "100vh", flexShrink: 0,
      background: theme.card, borderRight: `1px solid ${theme.cardBorder}`,
      display: "flex", flexDirection: "column", transition: "width 0.2s",
      position: "sticky", top: 0, height: "100vh", overflow: "auto",
    }}>
      <SidebarContent collapsed={collapsed} isActive={isActive} onNav={handleNav} onNewDeal={handleNewDeal} />
    </div>
  );
}

function SidebarContent({ collapsed, isActive, onNav, onNewDeal, onClose }) {
  return (
    <>
      {/* Logo */}
      <div style={{
        padding: collapsed ? "16px 10px" : "16px 20px",
        borderBottom: `1px solid ${theme.cardBorder}`,
        display: "flex", alignItems: "center", gap: 10,
        justifyContent: collapsed ? "center" : "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => onNav("/dashboard")}>
          <div style={{
            width: 32, height: 32, background: theme.accent, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: "#000", flexShrink: 0,
          }}>JH</div>
          {!collapsed && <span style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>JustHouses</span>}
        </div>
        {onClose && (
          <button onClick={onClose} style={{
            background: theme.input, border: "none", borderRadius: 6,
            width: 32, height: 32, color: theme.textDim, fontSize: 14, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>X</button>
        )}
      </div>

      {/* New Deal CTA */}
      <div style={{ padding: collapsed ? "12px 8px" : "12px 16px" }}>
        <button
          onClick={onNewDeal}
          style={{
            width: "100%", padding: collapsed ? "10px 0" : "10px 16px",
            background: theme.accent, color: "#000", border: "none",
            borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
            minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <span style={{ fontSize: 16 }}>+</span>
          {!collapsed && "New Deal"}
        </button>
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: collapsed ? "4px 8px" : "4px 12px" }}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <button
              key={item.href}
              onClick={() => onNav(item.href)}
              style={{
                width: "100%", display: "flex", alignItems: "center",
                gap: 10, padding: collapsed ? "10px 0" : "10px 12px",
                background: active ? theme.accentDim : "transparent",
                border: "none", borderRadius: 8, cursor: "pointer",
                color: active ? theme.accent : theme.textDim,
                fontSize: 13, fontWeight: active ? 600 : 400,
                marginBottom: 2, minHeight: 40,
                justifyContent: collapsed ? "center" : "flex-start",
                transition: "all 0.15s",
              }}
            >
              <span style={{
                width: 28, height: 28, borderRadius: 6,
                background: active ? `${theme.accent}20` : theme.input,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>
                {item.icon}
              </span>
              {!collapsed && item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div style={{
          padding: "12px 16px", borderTop: `1px solid ${theme.cardBorder}`,
          fontSize: 11, color: theme.textDim,
        }}>
          JustHouses ERP
        </div>
      )}
    </>
  );
}
