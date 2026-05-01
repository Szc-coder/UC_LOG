import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Stethoscope,
  UtensilsCrossed,
  Activity,
  Pill,
  Brain,
  FlaskConical,
  FileText,
  User,
  Settings,
} from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/stool', label: '排便记录', icon: Stethoscope },
  { path: '/diet', label: '饮食记录', icon: UtensilsCrossed },
  { path: '/symptom', label: '症状记录', icon: Activity },
  { path: '/medication', label: '用药记录', icon: Pill },
  { path: '/analysis', label: 'AI分析', icon: Brain },
  { path: '/fc', label: 'FC追踪', icon: FlaskConical },
  { path: '/report', label: '复诊报告', icon: FileText },
  { path: '/profile', label: '个人资料', icon: User },
  { path: '/settings', label: '设置', icon: Settings },
];

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();

  return (
    <div className="flex h-screen p-3 gap-3">
      {/* 侧边栏 */}
      <aside className="w-60 flex-shrink-0">
        <div className="h-full bg-white/40 backdrop-blur-2xl border border-white/60 rounded-2xl shadow-xl shadow-black/5 flex flex-col overflow-hidden">
          {/* Logo */}
          <div className="px-5 py-4 border-b border-white/40">
            <h1 className="text-lg font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              UC Log
            </h1>
            <p className="text-[11px] text-gray-400 mt-0.5">溃疡性结肠炎AI管理</p>
          </div>

          {/* 导航菜单 */}
          <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center gap-2.5 px-3 py-2 rounded-lg
                    transition-all duration-150 outline-none
                    ${isActive
                      ? 'bg-white/60 text-teal-700 shadow-sm'
                      : 'text-gray-500 hover:bg-white/30 hover:text-gray-700'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600' : 'text-gray-400'}`} />
                  <span className="text-[13px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* 底部信息 */}
          <div className="px-5 py-3 border-t border-white/40">
            <p className="text-[10px] text-gray-400 text-center">
              v0.1.0 · 数据本地存储
            </p>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto bg-white/30 backdrop-blur-xl border border-white/50 rounded-2xl shadow-xl shadow-black/5">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
