'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Package,
  LayoutDashboard,
  ShoppingCart,
  Image,
  Bell,
  MessageSquare,
  LogOut,
  User,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminUser {
  id: string;
  email: string;
  name: string;
}

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/photos', label: 'Photos', icon: Image },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Skip auth check for login page
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    // Check auth status
    fetch('/api/admin/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAdmin(data.admin);
        } else {
          router.push('/admin/login');
        }
      })
      .catch(() => {
        router.push('/admin/login');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isLoginPage, router]);

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  // Show login page without layout
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md p-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Show layout with navigation
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            <Link href="/admin" className="flex items-center gap-2">
              <Package className="h-6 w-6" />
              <span className="font-bold text-lg hidden sm:inline">Order Tracker Admin</span>
              <span className="font-bold text-lg sm:hidden">Admin</span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={pathname === item.href ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2 py-1.5 text-sm">
                <p className="font-medium">{admin?.name}</p>
                <p className="text-muted-foreground text-xs">{admin?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t p-2 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button
                  variant={pathname === item.href ? 'secondary' : 'ghost'}
                  className={cn('w-full justify-start gap-2')}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
