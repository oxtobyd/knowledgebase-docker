import React from 'react';
import { Button } from "@/components/ui/button";
import { Book, Home, Users, Calendar, FileText, LogOut, LogIn } from 'lucide-react';
import Link from 'next/link';

interface NavbarProps {
  user: any | null;
  onSignOut: () => void;
  onSignIn: () => void;
}

export function Navbar({ user, onSignOut, onSignIn }: NavbarProps) {
  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <span className="text-xl font-semibold text-black flex items-center">
              <Book className="w-6 h-6 mr-2 text-blue-600" />
              Knowledge Base
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" passHref>
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                <Home className="w-5 h-5 mr-2" />
                Dashboard
              </Button>
            </Link>
            {user ? (
              <Button onClick={onSignOut} variant="ghost" className="text-gray-600 hover:text-gray-900">
                <LogOut className="w-5 h-5 mr-2" /> Logout
              </Button>
            ) : (
              <Button onClick={onSignIn} variant="ghost" className="text-gray-600 hover:text-gray-900">
                <LogIn className="w-5 h-5 mr-2" /> Login
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
