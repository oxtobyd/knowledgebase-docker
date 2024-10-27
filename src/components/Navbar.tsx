import React from 'react';
import { Button } from "@/components/ui/button";
import { Home, LogOut, LogIn} from 'lucide-react';
import Link from 'next/link';
import { Badge } from "@/components/ui/Badge"; // Import the Badge component
import { User } from 'firebase/auth';
import { CustomBookIcon } from './CustomBookIcon';

interface NavbarProps {
  user: User | null;
  onSignOut: () => void;
  onSignIn: () => void;
  articleCount: number;
}

export function Navbar({ user, onSignOut, onSignIn, articleCount }: NavbarProps) {
  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <span className="text-xl font-semibold text-black flex items-center">
              <CustomBookIcon />
              <span className="text-[#0D7A5F]">Knowledge Base</span>
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/" passHref>
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900 relative">
                <Home className="w-5 h-5 mr-2" />
                Dashboard
                <Badge count={articleCount} /> {/* Add the Badge component here */}
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
