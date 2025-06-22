import React, { useState, useMemo } from 'react';
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import { 
  BarChart3, 
  TrendingUp, 
  Trophy, 
  Users, 
  Target, 
  Medal,
  Calendar,
  Clock,
  Percent,
  Award,
  Filter,
  Download,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useTournaments, useTeams, useMatches } from '../hooks/useApi';
import { TournamentType, MatchStatus } from '../types/api';

const StatsPage: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  
  const { data: tournaments = [], isLoading: tournamentsLoading } = useTournaments();
  const { data: teams = [], isLoading: teamsLoading } = useTeams();
  const { data: matches = [], isLoading: matchesLoading } = useMatches();

  const isLoading = tournamentsLoading || teamsLoading || matchesLoading;

  // Calculs des statistiques générales
  const stats = useMemo(() => {
    if (isLoading) return null;

    const totalTournaments = tournaments.length;
    const activeTournaments = tournaments.filter(t => t.status === 'ONGOING').length;
    const completedTournaments = tournaments.filter(t => t.status === 'COMPLETED').length;
    const totalMatches = matches.length;
    const completedMatches = matches.filter(m => m.status === MatchStatus.COMPLETED).length;
    const pendingMatches = matches.filter(m => m.status === MatchStatus.PENDING).length;
    const ongoingMatches = matches.filter(m => m.status === MatchStatus.ONGOING).length;

    // Statistiques par type de tournoi
    const tournamentsByType = tournaments.reduce((acc, tournament) => {
      const type = tournament.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calcul du taux de complétion des matchs
    const completionRate = totalMatches > 0 ? (completedMatches / totalMatches * 100).toFixed(1) : '0';

    // Top équipes par victoires
    const teamStats = teams.map(team => {
      const teamMatches = matches.filter(match => 
        (match.team1Id?._id === team._id || match.team2Id?._id === team._id) && 
        match.status === MatchStatus.COMPLETED
      );

      let wins = 0;
      let totalPoints = 0;
      let totalOpponentPoints = 0;

      teamMatches.forEach(match => {
        const isTeam1 = match.team1Id?._id === team._id;
        const teamScore = isTeam1 ? (match.team1Score || 0) : (match.team2Score || 0);
        const opponentScore = isTeam1 ? (match.team2Score || 0) : (match.team1Score || 0);

        if (teamScore > opponentScore) wins++;
        totalPoints += teamScore;
        totalOpponentPoints += opponentScore;
      });

      return {
        ...team,
        wins,
        losses: teamMatches.length - wins,
        totalMatches: teamMatches.length,
        winRate: teamMatches.length > 0 ? (wins / teamMatches.length * 100).toFixed(1) : '0',
        averageScore: teamMatches.length > 0 ? (totalPoints / teamMatches.length).toFixed(1) : '0',
        scoreDifference: totalPoints - totalOpponentPoints
      };
    }).sort((a, b) => b.wins - a.wins);

    // Statistiques par mois (derniers 6 mois)
    const monthlyStats = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleDateString('fr-FR', { month: 'long' });
      
      const monthTournaments = tournaments.filter(t => {
        const tournamentDate = new Date(t.startDate);
        return tournamentDate.getMonth() === date.getMonth() && 
               tournamentDate.getFullYear() === date.getFullYear();
      });
      
      return {
        month: monthName,
        tournaments: monthTournaments.length,
        matches: monthTournaments.reduce((acc, t) => 
          acc + matches.filter(m => m.tournamentId === t._id).length, 0
        )
      };
    }).reverse();

    return {
      totalTournaments,
      activeTournaments,
      completedTournaments,
      totalMatches,
      completedMatches,
      pendingMatches,
      ongoingMatches,
      completionRate,
      tournamentsByType,
      teamStats,
      monthlyStats
    };
  }, [tournaments, teams, matches, isLoading]);

  const exportStats = () => {
    if (!stats) return;

    const statsData = {
      summary: {
        totalTournaments: stats.totalTournaments,
        activeTournaments: stats.activeTournaments,
        completedTournaments: stats.completedTournaments,
        totalMatches: stats.totalMatches,
        completedMatches: stats.completedMatches,
        completionRate: stats.completionRate
      },
      tournamentsByType: stats.tournamentsByType,
      topTeams: stats.teamStats.slice(0, 10),
      monthlyStats: stats.monthlyStats,
      exportDate: new Date().toISOString()
    };

    const dataStr = JSON.stringify(statsData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `petanque-stats-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Chargement des statistiques...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="text-center py-8">
          <p>Erreur lors du chargement des statistiques</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">
            Statistiques
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Analysez les performances du club
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="h-9 px-3 text-sm border border-gray-200 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="all">Toute la période</option>
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </select>
          
          <Button 
            onClick={exportStats}
            variant="outline" 
            size="sm" 
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Trophy className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tournois</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalTournaments}
                </p>
                <p className="text-xs text-green-600">
                  {stats.activeTournaments} en cours
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Matchs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalMatches}
                </p>
                <p className="text-xs text-blue-600">
                  {stats.completedMatches} terminés
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Équipes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {teams.length}
                </p>
                <p className="text-xs text-gray-500">
                  Inscrites
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Percent className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Taux complétion</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.completionRate}%
                </p>
                <p className="text-xs text-gray-500">
                  Matchs terminés
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets détaillés */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="tournaments">Tournois</TabsTrigger>
          <TabsTrigger value="teams">Équipes</TabsTrigger>
          <TabsTrigger value="trends">Tendances</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Répartition par type de tournoi */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Répartition par type
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(stats.tournamentsByType).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(stats.tournamentsByType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{type}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${(count / stats.totalTournaments) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">Aucun tournoi créé</p>
                )}
              </CardContent>
            </Card>

            {/* Statut des matchs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  État des matchs
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.totalMatches > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Terminés</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${(stats.completedMatches / stats.totalMatches) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{stats.completedMatches}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">En cours</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${(stats.ongoingMatches / stats.totalMatches) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{stats.ongoingMatches}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">En attente</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-orange-500 h-2 rounded-full"
                            style={{ width: `${(stats.pendingMatches / stats.totalMatches) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{stats.pendingMatches}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">Aucun match programmé</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tournaments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tournois récents</CardTitle>
            </CardHeader>
            <CardContent>
              {tournaments.length > 0 ? (
                <div className="space-y-3">
                  {tournaments.slice(0, 10).map((tournament) => (
                    <div key={tournament._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{tournament.name}</h4>
                        <p className="text-sm text-gray-500">
                          {tournament.type} • {new Date(tournament.startDate).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <Badge 
                        variant={tournament.status === 'COMPLETED' ? 'default' : 
                                 tournament.status === 'ONGOING' ? 'secondary' : 'outline'}
                      >
                        {tournament.status === 'COMPLETED' ? 'Terminé' :
                         tournament.status === 'ONGOING' ? 'En cours' : 'À venir'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">Aucun tournoi créé</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Classement des équipes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.teamStats.length > 0 ? (
                <div className="space-y-3">
                  {stats.teamStats.slice(0, 10).map((team, index) => (
                    <div key={team._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-yellow-500' :
                          index === 1 ? 'bg-gray-400' :
                          index === 2 ? 'bg-amber-600' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium">{team.name}</h4>
                          <p className="text-sm text-gray-500">
                            {team.wins} victoires / {team.totalMatches} matchs
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">{team.winRate}%</p>
                        <p className="text-sm text-gray-500">Taux de victoire</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">Aucune équipe inscrite</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Évolution mensuelle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.monthlyStats.map((stat, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{stat.month}</span>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-lg font-bold">{stat.tournaments}</p>
                        <p className="text-xs text-gray-500">Tournois</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold">{stat.matches}</p>
                        <p className="text-xs text-gray-500">Matchs</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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

  return {
    props: {},
  };
};

export default StatsPage; 