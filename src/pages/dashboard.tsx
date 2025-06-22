import React from 'react';
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import { QueryClient, dehydrate } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Users, 
  Calendar, 
  TrendingUp,
  Plus,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useTournaments, useTeams } from '../hooks/useApi';
import Link from 'next/link';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  trend?: number;
  color?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend,
  color = 'blue'
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon className={`h-6 w-6 text-${color}-600`} />
              <div>
                <div className="text-xl font-semibold">
                  {value}
                </div>
                <div className="text-xs text-muted-foreground">
                  {title}
                </div>
              </div>
            </div>
            {trend && (
              <div className={`flex items-center text-xs ${
                trend > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                <TrendingUp className="h-3 w-3 mr-1" />
                {Math.abs(trend)}%
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const Dashboard: React.FC = () => {
  const { data: tournaments = [], isLoading: tournamentsLoading } = useTournaments();
  const { data: teams = [], isLoading: teamsLoading } = useTeams();

  const activeTournaments = tournaments.filter(t => t.status === 'ONGOING');
  const upcomingTournaments = tournaments.filter(t => t.status === 'UPCOMING');

  const stats = [
    {
      title: 'Actifs',
      value: activeTournaments.length,
      icon: Activity,
      description: 'Tournois en cours',
      color: 'green'
    },
    {
      title: 'Total',
      value: tournaments.length,
      icon: Trophy,
      description: 'Tous les tournois',
      color: 'blue'
    },
    {
      title: 'Équipes',
      value: teams.length,
      icon: Users,
      description: 'Inscrites',
      color: 'purple'
    },
    {
      title: 'À venir',
      value: upcomingTournaments.length,
      icon: Calendar,
      description: 'Programmés',
      color: 'orange'
    }
  ];

  const isLoading = tournamentsLoading || teamsLoading;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          <p className="text-muted-foreground">Gérez vos tournois de pétanque</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link href="/teams">
            <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
              <Users className="h-4 w-4" />
              Équipes
            </Button>
          </Link>
          <Link href="/tournaments">
            <Button size="sm" className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Nouveau tournoi
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <StatsCard {...stat} />
          </motion.div>
        ))}
      </div>

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>
            Accédez rapidement aux fonctionnalités principales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/tournaments">
              <Button variant="outline" className="w-full gap-2">
                <Trophy className="h-4 w-4" />
                Créer un tournoi
              </Button>
            </Link>
            <Link href="/teams">
              <Button variant="outline" className="w-full gap-2">
                <Users className="h-4 w-4" />
                Gérer les équipes
              </Button>
            </Link>
            <Link href="/matches">
              <Button variant="outline" className="w-full gap-2">
                <Calendar className="h-4 w-4" />
                Voir les matchs
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);
  
  if (!session) {
    return {
      redirect: {
        destination: '/auth',
        permanent: false,
      },
    };
  }

  const queryClient = new QueryClient();

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  };
};

export default Dashboard;