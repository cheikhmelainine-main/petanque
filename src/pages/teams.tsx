import React, { useState } from 'react';
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Plus, 
  Search, 
  Filter,
  Trophy,
  Target,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';

import CreateTeamForm from '../components/teams/CreateTeamForm';
import ImportTeamsForm from '../components/teams/ImportTeamsForm';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { useTeams, useTournaments } from '../hooks/useApi';

const TeamsPage: React.FC = () => {
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isImportFormOpen, setIsImportFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTournament, setSelectedTournament] = useState<string>('all');
  
  const { data: teams = [], isLoading: teamsLoading } = useTeams();
  const { data: tournaments = [] } = useTournaments();

  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTournament = selectedTournament === 'all' || team.tournament === selectedTournament;
    return matchesSearch && matchesTournament;
  });

  const getTournamentName = (tournamentId: string) => {
    const tournament = tournaments.find(t => t._id === tournamentId);
    return tournament?.name || 'Tournoi inconnu';
  };

  const getTeamStats = (team: any) => {
    return {
      points: team.points || 0,
      played: team.matchesPlayed || 0,
      won: team.matchesWon || 0,
      scoreDiff: team.scoreDiff || 0
    };
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* En-tête compact */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">
            Équipes
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Gérez les équipes participantes
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button 
            onClick={() => setIsImportFormOpen(true)} 
            size="sm"
            variant="outline"
            className="gap-2 w-full sm:w-auto"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Importer Excel
          </Button>
          <Button 
            onClick={() => setIsCreateFormOpen(true)} 
            size="sm"
            className="gap-2 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Nouvelle équipe
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" />
              <div>
                <p className="text-lg font-semibold">{teams.length}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-600" />
              <div>
                <p className="text-lg font-semibold">{tournaments.length}</p>
                <p className="text-xs text-gray-500">Tournois</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Target className="h-6 w-6 text-green-600" />
              <div>
                <p className="text-lg font-semibold">{teams.length * 2}</p>
                <p className="text-xs text-gray-500">Joueurs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-purple-600" />
              <div>
                <p className="text-lg font-semibold">
                  {teams.filter(t => (t.points || 0) > 0).length}
                </p>
                <p className="text-xs text-gray-500">Actives</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres compacts */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher une équipe..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-0 bg-gray-50 dark:bg-gray-800 h-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={selectedTournament}
                onChange={(e) => setSelectedTournament(e.target.value)}
                className="h-9 px-3 text-sm border border-gray-200 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="all">Tous les tournois</option>
                {tournaments.map(tournament => (
                  <option key={tournament._id} value={tournament._id}>
                    {tournament.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des équipes */}
      {teamsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      ) : filteredTeams.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-base font-medium mb-2">
              {searchQuery ? 'Aucune équipe trouvée' : 'Aucune équipe'}
            </h3>
            <p className="text-sm text-gray-500 text-center mb-4">
              {searchQuery 
                ? 'Essayez de modifier votre recherche'
                : 'Commencez par créer votre première équipe'
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsCreateFormOpen(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Créer une équipe
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.map((team, index) => {
            const stats = getTeamStats(team);
            
            return (
              <motion.div
                key={team._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -2 }}
              >
                <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                          {team.name}
                        </CardTitle>
                        <p className="text-xs text-gray-500 mt-1">
                          {getTournamentName(team.tournament)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {stats.points} pts
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0 space-y-3">
                    {/* Joueurs */}
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Joueurs
                      </p>
                      <div className="space-y-1">
                        {team.members?.map((member: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {member.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Statistiques */}
                    <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <div className="text-center">
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {stats.played}
                        </p>
                        <p className="text-xs text-gray-500">Joués</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-green-600">
                          {stats.won}
                        </p>
                        <p className="text-xs text-gray-500">Gagnés</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-lg font-semibold ${
                          stats.scoreDiff >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stats.scoreDiff >= 0 ? '+' : ''}{stats.scoreDiff}
                        </p>
                        <p className="text-xs text-gray-500">Diff</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Formulaire de création */}
      <CreateTeamForm
        open={isCreateFormOpen}
        onOpenChange={setIsCreateFormOpen}
      />

      {/* Formulaire d'import Excel */}
      <ImportTeamsForm
        open={isImportFormOpen}
        onOpenChange={setIsImportFormOpen}
      />
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

export default TeamsPage; 