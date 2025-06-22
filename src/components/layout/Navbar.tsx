import React, { useState } from 'react';
import { Bell, User, Search, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export const Navbar: React.FC = () => {
  const [searchValue, setSearchValue] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut({ 
        callbackUrl: '/auth',
        redirect: true 
      });
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      router.push('/auth');
    }
    setShowUserMenu(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Espace vide à gauche */}
        <div className="flex-1"></div>

        {/* Actions à droite */}
        <div className="flex items-center gap-3">
          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="h-9 w-64 rounded-md border border-input bg-background pl-10 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          {/* Icône de notification */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              3
            </Badge>
          </Button>

          {/* Menu utilisateur */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-2"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <User className="h-4 w-4" />
              </div>
              {session?.user && (
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium">
                    {session.user.name || 'Utilisateur'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {session.user.email}
                  </span>
                </div>
              )}
              <ChevronDown className="h-4 w-4" />
            </Button>

            {/* Menu déroulant */}
            {showUserMenu && (
              <>
                {/* Overlay pour fermer le menu */}
                <div 
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                
                {/* Menu */}
                <div className="absolute right-0 top-full mt-2 w-64 rounded-md border bg-popover p-1 shadow-md z-20">
                  {session?.user && (
                    <>
                      {/* Informations utilisateur */}
                      <div className="px-3 py-2 border-b">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <User className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {session.user.name || 'Utilisateur'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {session.user.email}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="py-1">
                        <button
                          className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm"
                          onClick={() => {
                            router.push('/settings');
                            setShowUserMenu(false);
                          }}
                        >
                          <Settings className="h-4 w-4" />
                          Paramètres
                        </button>
                        
                        <button
                          className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-destructive/10 hover:text-destructive rounded-sm"
                          onClick={handleSignOut}
                        >
                          <LogOut className="h-4 w-4" />
                          Déconnexion
                        </button>
                      </div>
                    </>
                  )}
                  
                  {!session && (
                    <div className="px-3 py-2">
                      <button
                        className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm"
                        onClick={() => {
                          router.push('/auth');
                          setShowUserMenu(false);
                        }}
                      >
                        <User className="h-4 w-4" />
                        Se connecter
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}; 