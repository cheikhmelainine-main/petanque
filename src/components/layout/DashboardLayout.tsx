import { signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Home, Users, Settings, Trophy, Calendar, BarChart3, LogOut } from 'lucide-react'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session } = useSession()
  const router = useRouter()

  const menuItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard' },
    { icon: Trophy, label: 'Tournois', href: '/tournaments' },
    { icon: Calendar, label: 'Calendrier', href: '/calendar' },
    { icon: BarChart3, label: 'Statistiques', href: '/stats' },
    { icon: Users, label: 'Joueurs', href: '/players' },
    { icon: Settings, label: 'Paramètres', href: '/settings' },
  ]

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth' })
  }

  const isActive = (href: string) => router.pathname === href

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <div className="flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-blue-600" />
                  <span className="font-bold text-lg">Club Pétanque</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive(item.href)}
                      tooltip={item.label}
                    >
                      <a href={item.href} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={handleSignOut}
                tooltip="Se déconnecter"
              >
                <LogOut className="h-4 w-4" />
                <span>Déconnexion</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Bonjour, {session?.user?.name || session?.user?.email}
            </span>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="mx-auto w-full max-w-6xl">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
