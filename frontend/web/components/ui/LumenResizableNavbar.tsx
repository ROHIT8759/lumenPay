'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface NavItem {
  name: string;
  link: string;
}

interface LumenResizableNavbarProps {
  onLogin?: () => void;
}

export function LumenResizableNavbar({ onLogin }: LumenResizableNavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    { name: 'Home', link: '/' },
    { name: 'About', link: '/about' },
    { name: 'EXPO', link: '/expo' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-xs">LP</span>
            </div>
            <span className="font-bold text-xl tracking-wider text-white">LumenPay</span>
          </div>

          {/* Desktop Nav Items */}
          <div className="flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.link}
                href={item.link}
                className="text-sm font-medium text-gray-400 hover:text-white transition"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Desktop Button */}
          <button
            onClick={onLogin}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium text-white transition border border-white/20"
          >
            Connect Wallet
          </button>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-xs">LP</span>
            </div>
            <span className="font-bold text-lg tracking-wider text-white">LumenPay</span>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-white"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-3 bg-black/30 border-t border-white/5">
            {navItems.map((item) => (
              <Link
                key={item.link}
                href={item.link}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition"
              >
                {item.name}
              </Link>
            ))}
            <div className="px-4 pt-2">
              <button
                onClick={() => {
                  onLogin?.();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium text-white transition border border-white/20"
              >
                Connect Wallet
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
