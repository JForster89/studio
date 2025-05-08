import Link from 'next/link';
import { ShieldAlert, UserCircle } from 'lucide-react';

export function Navbar() {
  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-semibold hover:opacity-90 transition-opacity">
          <ShieldAlert size={28} />
          <span>Allergen Alert</span>
        </Link>
        <Link href="/profile" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-primary/80 transition-colors">
          <UserCircle size={20} />
          <span>Profile</span>
        </Link>
      </nav>
    </header>
  );
}
