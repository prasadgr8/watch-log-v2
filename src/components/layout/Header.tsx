import { Search, Moon, Bell } from "lucide-react";

export default function Header() {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-6">
      <div>
        <h2 className="text-xl font-semibold text-white">
          Welcome Back 👋
        </h2>
        <p className="text-sm text-slate-400">
          Track your TV Shows & Movies
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Search className="cursor-pointer hover:text-blue-400" />
        <Bell className="cursor-pointer hover:text-blue-400" />
        <Moon className="cursor-pointer hover:text-blue-400" />
      </div>
    </header>
  );
}