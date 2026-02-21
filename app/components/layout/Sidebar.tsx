"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { theme } from "../theme";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "\u25A6" },
  { href: "/pipeline", label: "Pipeline", icon: "\u25B6" },
  { href: "/projects", label: "Projects", icon: "\u2692" },
  { href: "/finance", label: "Finance", icon: "\u2234" },
  { href: "/reports", label: "Reports", icon: "\u2261" },
  { href: "/settings", label: "Settings", icon: "\u2699" },
];

interface SidebarProps {
  onNewDeal: () => void;
}

export default function Sidebar({ onNewDeal }: SidebarProps) {
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
  const sidebarWidth = collapsed ? 56 : 220;

  const isActive = (href: string): boolean => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const handleNav = (href: string) => {
    router.push(href);
    setMobileOpen(false);
  };

  const handleNewDeal = () => {
    onNewDeal();
    setMobileOpen(false);
  };

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setMobileOpen(true)}
          style={{
            position: "fixed", top: 12, left: 12, zIndex: 200,
            width: 40, height: 40, borderRadius: 6,
            background: theme.card, border: `1px solid ${theme.cardBorder}`,
            color: theme.textDim, fontSize: 16, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          &#9776;
        </button>
        {mobileOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 300 }}>
            <div onClick={() => setMobileOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
            <div style={{
              position: "relative", width: 240, height: "100%",
              background: theme.bg, borderRight: `1px solid ${theme.cardBorder}`,
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

  return (
    <div style={{
      width: sidebarWidth, minHeight: "100vh", flexShrink: 0,
      background: theme.bg, borderRight: `1px solid ${theme.cardBorder}`,
      display: "flex", flexDirection: "column", transition: "width 0.2s",
      position: "sticky", top: 0, height: "100vh", overflow: "auto",
    }}>
      <SidebarContent collapsed={collapsed} isActive={isActive} onNav={handleNav} onNewDeal={handleNewDeal} />
    </div>
  );
}

interface SidebarContentProps {
  collapsed: boolean;
  isActive: (href: string) => boolean;
  onNav: (href: string) => void;
  onNewDeal: () => void;
  onClose?: () => void;
}

function SidebarContent({ collapsed, isActive, onNav, onNewDeal, onClose }: SidebarContentProps) {
  return (
    <>
      <div style={{
        padding: collapsed ? "14px 8px" : "14px 16px",
        borderBottom: `1px solid ${theme.cardBorder}`,
        display: "flex", alignItems: "center", gap: 10,
        justifyContent: collapsed ? "center" : "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => onNav("/dashboard")}>
          <div style={{
            width: 28, height: 28, background: theme.accent, borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0,
          }}>JH</div>
          {!collapsed && <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>JustHouses</span>}
        </div>
        {onClose && (
          <button onClick={onClose} style={{
            background: "transparent", border: "none", borderRadius: 4,
            width: 28, height: 28, color: theme.textDim, fontSize: 16, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>&times;</button>
        )}
      </div>

      <div style={{ padding: collapsed ? "10px 8px" : "10px 12px" }}>
        <button
          onClick={onNewDeal}
          style={{
            width: "100%", padding: collapsed ? "8px 0" : "8px 14px",
            background: theme.accent, color: "#fff", border: "none",
            borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
            minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
          {!collapsed && "New Deal"}
        </button>
      </div>

      <nav style={{ flex: 1, padding: collapsed ? "2px 8px" : "2px 8px" }}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <button
              key={item.href}
              onClick={() => onNav(item.href)}
              style={{
                width: "100%", display: "flex", alignItems: "center",
                gap: 8, padding: collapsed ? "8px 0" : "8px 10px",
                background: active ? `${theme.accent}12` : "transparent",
                border: active ? `1px solid ${theme.accent}20` : "1px solid transparent",
                borderRadius: 6, cursor: "pointer",
                color: active ? theme.accent : theme.textDim,
                fontSize: 13, fontWeight: active ? 600 : 400,
                marginBottom: 1, minHeight: 36,
                justifyContent: collapsed ? "center" : "flex-start",
                transition: "all 0.1s",
              }}
            >
              <span style={{
                width: 24, height: 24, borderRadius: 4,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, flexShrink: 0,
              }}>
                {item.icon}
              </span>
              {!collapsed && item.label}
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div style={{
          padding: "10px 16px", borderTop: `1px solid ${theme.cardBorder}`,
          fontSize: 10, color: theme.textDim, letterSpacing: 0.5,
        }}>
          JustHouses ERP v1.0
        </div>
      )}
    </>
  );
}
