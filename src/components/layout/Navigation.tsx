'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'
import {
  Home,
  Trophy,
  Users,
  Calendar,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut
} from 'lucide-react'

import { Button } from '../ui/button'
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet'
import { Navbar } from './Navbar'

const menuItems = [
  {
    title: 'Tableau de bord',
    url: '/dashboard',
    icon: Home,
  },
  {
    title: 'Tournois',
    url: '/tournaments',
    icon: Trophy,
  },
  {
    title: 'Équipes',
    url: '/teams',
    icon: Users,
  },
  {
    title: 'Matchs',
    url: '/matches',
    icon: Calendar,
  },
  {
    title: 'Statistiques',
    url: '/stats',
    icon: BarChart3,
  },
  {
    title: 'Paramètres',
    url: '/settings',
    icon: Settings,
  }
]

interface SidebarContentProps {
  onItemClick?: () => void
}

const SidebarContent = ({ onItemClick }: SidebarContentProps) => {
  const router = useRouter()

  return (
    <div className="flex flex-col h-full bg-background border-r">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Trophy className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Pétanque Pro</span>
            <span className="text-xs text-muted-foreground">Gestion de tournois</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = router.pathname === item.url
          const Icon = item.icon

          return (
            <Link
              key={item.title}
              href={item.url}
              onClick={onItemClick}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={() => {
            router.push('/auth')
            onItemClick?.()
          }}
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm">Déconnexion</span>
        </Button>
      </div>
    </div>
  )
}

interface AppSidebarProps {
  children: React.ReactNode
}

export function AppSidebar({ children }: AppSidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar Desktop - Largeur fixe 256px */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64">
        <SidebarContent />
      </div>

      {/* Sidebar Mobile */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="fixed top-4 left-4 z-40 lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent onItemClick={() => setIsMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Contenu principal avec padding gauche sur desktop */}
      <div className="lg:pl-64">
        {/* Navbar fixe en haut */}
        <Navbar />
        
        {/* Contenu principal avec padding top pour éviter la navbar */}
        <main className="min-h-screen pt-0">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
} 