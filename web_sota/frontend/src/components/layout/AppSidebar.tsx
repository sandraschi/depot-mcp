import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FolderOpen,
  Search,
  Upload,
  BarChart3,
  MessageSquare,
  HelpCircle,
  PackageOpen,
  Settings,
  HardDrive,
  PanelRightClose,
  PanelRightOpen,
  Wrench,
} from "lucide-react";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/browse", icon: FolderOpen, label: "Browse" },
  { to: "/search", icon: Search, label: "Search" },
  { to: "/upload", icon: Upload, label: "Upload" },
  { to: "/stats", icon: BarChart3, label: "Stats" },
  { to: "/chat", icon: MessageSquare, label: "Chat" },
  { to: "/tools", icon: Wrench, label: "Tools" },
  { to: "/help", icon: HelpCircle, label: "Help" },
  { to: "/import", icon: PackageOpen, label: "Import" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function AppSidebar({ collapsed, onToggle }: Props) {
  return (
    <aside
      className={`glass border-r flex flex-col py-3 gap-1 z-40 transition-all duration-200 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      <div className={`flex items-center mb-4 px-3 ${collapsed ? "justify-center" : "gap-2"}`}>
        <HardDrive size={22} className="text-depot-400 shrink-0" />
        {!collapsed && <span className="text-sm font-semibold text-gray-200 truncate">depot-mcp</span>}
      </div>

      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            `flex items-center gap-3 mx-2 px-3 py-2 rounded-lg transition-all duration-200 ${
              isActive
                ? "bg-depot-600/20 text-depot-400"
                : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/60"
            } ${collapsed ? "justify-center mx-1" : ""}`
          }
          title={label}
        >
          <Icon size={18} className="shrink-0" />
          {!collapsed && <span className="text-xs font-medium truncate">{label}</span>}
        </NavLink>
      ))}

      <div className="mt-auto flex justify-center pt-2 border-t border-gray-800/50 mx-3">
        <button
          type="button"
          onClick={onToggle}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800/60 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
        </button>
      </div>
    </aside>
  );
}
