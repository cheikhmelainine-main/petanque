import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Play, 
  ArrowLeft,
  Target,
  Medal,
  CheckCircle,
  Clock,
  Plus
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { SelectTeamsForm } from '../../components/teams/SelectTeamsForm';

import { 
  useTournament, 
  useTeams, 
  useMatches, 
  useStartTournament, 
  useNextRound, 
  useKnockoutPhase,
  useAddTeamsToTournament
} from '../../hooks/useApi';
import { TournamentStatus, MatchStatus } from '../../types/api';
import Link from 'next/link';

const TournamentDetail: React.FC = () => {
  const router = useRouter();
  const { id } = router.query as { id: string };
  
  const [activeTab, setActiveTab] = useState('overview');
  const [showSelectTeams, setShowSelectTeams] = useState(false);
  
  const { data: tournament, isLoading: tournamentLoading } = useTournament(id);
  const { data: teams = [] } = useTeams(id);
  const { data: matches = [] } = useMatches(id);
  
  const startTournament = useStartTournament();
  const nextRound = useNextRound();
  const knockoutPhase = useKnockoutPhase();
  const addTeamsToTournament = useAddTeamsToTournament();

  if (tournamentLoading) {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center py-12">
          <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Tournoi introuvable</h3>
          <p className="text-gray-500 mt-2">Ce tournoi n&apos;existe pas ou a été supprimé.</p>
          <Link href="/tournaments">
            <Button className="mt-4">Retour aux tournois</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleStartTournament = () => {
    if (teams.length < 2) {
      alert('Il faut au moins 2 équipes pour démarrer le tournoi');
      return;
    }
    startTournament.mutate(id);
  };

  const handleNextRound = () => {
    nextRound.mutate(id);
  };

  const handleKnockoutPhase = () => {
    knockoutPhase.mutate(id);
  };

  const handleTeamsSelected = (teamIds: string[]) => {
    addTeamsToTournament.mutate({ tournamentId: id, teamIds });
  };

  const completedMatches = matches.filter(m => m.status === MatchStatus.COMPLETED);
  const currentRound = Math.max(...matches.map(m => m.round), 0);
  const currentRoundMatches = matches.filter(m => m.round === currentRound);
  const allCurrentRoundCompleted = currentRoundMatches.length > 0 && 
    currentRoundMatches.every(m => m.status === MatchStatus.COMPLETED);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: TournamentStatus) => {
    const configs = {
      [TournamentStatus.UPCOMING]: { 
        label: 'À venir', 
        className: 'bg-blue-100 text-blue-800',
        icon: Calendar
      },
      [TournamentStatus.ONGOING]: { 
        label: 'En cours', 
        className: 'bg-green-100 text-green-800',
        icon: Play
      },
      [TournamentStatus.COMPLETED]: { 
        label: 'Terminé', 
        className: 'bg-gray-100 text-gray-800',
        icon: CheckCircle
      }
    };
    
    const config = configs[status];
    const Icon = config.icon;
    
    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const sortedTeams = [...teams].sort((a, b) => {
    if ((a.points || a.stats?.points || 0) !== (b.points || b.stats?.points || 0)) {
      return (b.points || b.stats?.points || 0) - (a.points || a.stats?.points || 0);
    }
    return (b.scoreDiff || b.stats?.scoreDifference || 0) - (a.scoreDiff || a.stats?.scoreDifference || 0);
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              {tournament.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2">
              {getStatusBadge(tournament.status)}
              <span className="text-gray-500 text-sm">
                {formatDate(tournament.startDate)}
              </span>
              <span className="text-gray-500 text-sm">
                {tournament.type} • {tournament.format}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {tournament.status === TournamentStatus.UPCOMING && (
            <Button 
              onClick={handleStartTournament}
              disabled={teams.length < 2 || startTournament.isPending}
              className="gap-2"
              size="sm"
            >
              <Play className="h-4 w-4" />
              {startTournament.isPending ? 'Démarrage...' : 'Démarrer'}
            </Button>
          )}
          
          {tournament.status === TournamentStatus.ONGOING && (
            <>
              {allCurrentRoundCompleted && tournament.type === 'SWISS' && (
                <Button 
                  onClick={handleNextRound}
                  disabled={nextRound.isPending}
                  variant="outline"
                  className="gap-2"
                  size="sm"
                >
                  <Target className="h-4 w-4" />
                  {nextRound.isPending ? 'Génération...' : 'Tour suivant'}
                </Button>
              )}
              
              {allCurrentRoundCompleted && currentRound >= 5 && tournament.type === 'SWISS' && (
                <Button 
                  onClick={handleKnockoutPhase}
                  disabled={knockoutPhase.isPending}
                  className="gap-2"
                  size="sm"
                >
                  <Medal className="h-4 w-4" />
                  {knockoutPhase.isPending ? 'Génération...' : 'Phase finale'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
              <div>
                <p className="text-xl md:text-2xl font-bold">{teams.length}</p>
                <p className="text-xs md:text-sm text-gray-500">Équipes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
              <div>
                <p className="text-xl md:text-2xl font-bold">{matches.length}</p>
                <p className="text-xs md:text-sm text-gray-500">Matchs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-purple-600" />
              <div>
                <p className="text-xl md:text-2xl font-bold">{completedMatches.length}</p>
                <p className="text-xs md:text-sm text-gray-500">Terminés</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 md:h-8 md:w-8 text-orange-600" />
              <div>
                <p className="text-xl md:text-2xl font-bold">{currentRound}</p>
                <p className="text-xs md:text-sm text-gray-500">Tour actuel</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="teams">Équipes ({teams.length})</TabsTrigger>
          <TabsTrigger value="matches">Matchs ({matches.length})</TabsTrigger>
          <TabsTrigger value="ranking">Classement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations du tournoi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Type :</span>
                    <p className="font-medium">{tournament.type}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Format :</span>
                    <p className="font-medium">{tournament.format}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Date de début :</span>
                    <p className="font-medium">{formatDate(tournament.startDate)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Statut :</span>
                    <div className="mt-1">{getStatusBadge(tournament.status)}</div>
                  </div>
                </div>
                {tournament.description && (
                  <div>
                    <span className="text-gray-500 text-sm">Description :</span>
                    <p className="text-sm mt-1">{tournament.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Progression</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Matchs terminés</span>
                    <span>{completedMatches.length}/{matches.length}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ 
                        width: matches.length > 0 ? `${(completedMatches.length / matches.length) * 100}%` : '0%' 
                      }}
                    ></div>
                  </div>
                  {tournament.status === TournamentStatus.ONGOING && (
                    <p className="text-xs text-gray-500">
                      Tour {currentRound} en cours
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Équipes inscrites</CardTitle>
                <CardDescription>
                  {teams.length} équipe{teams.length > 1 ? 's' : ''} inscrite{teams.length > 1 ? 's' : ''}
                </CardDescription>
              </div>
              {tournament?.status === TournamentStatus.UPCOMING && (
                <Button 
                  onClick={() => setShowSelectTeams(true)}
                  className="gap-2"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter équipes
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {teams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teams.map((team) => (
                    <motion.div
                      key={team._id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 border rounded-lg hover:shadow-md transition-all"
                    >
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {team.name}
                      </h4>
                      <div className="text-sm text-gray-500 mt-1">
                        {team.members && team.members.length > 0 ? (
                          <div className="space-y-1">
                            {team.members.map((member, index) => (
                              <div key={index} className="flex items-center">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                {member.name}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span>Aucun membre</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-3 text-xs">
                        <span className="text-gray-500">
                          {team.stats?.gamesPlayed || 0} matchs
                        </span>
                        <span className="font-medium">
                          {team.points || team.stats?.points || 0} pts
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">Aucune équipe inscrite</p>
                  {tournament?.status === TournamentStatus.UPCOMING && (
                    <Button 
                      onClick={() => setShowSelectTeams(true)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter la première équipe
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="matches" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Matchs du tournoi</CardTitle>
              <CardDescription>
                Tous les matchs programmés et terminés
              </CardDescription>
            </CardHeader>
            <CardContent>
              {matches.length > 0 ? (
                <div className="space-y-4">
                  {Array.from(new Set(matches.map(m => m.round))).sort().map(round => (
                    <div key={round} className="space-y-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Tour {round}
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        {matches.filter(m => m.round === round).map((match) => (
                          <div 
                            key={match._id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-medium">
                                {match.team1Id?.name || 'Équipe 1'}
                              </span>
                              <span className="text-gray-500">vs</span>
                              <span className="text-sm font-medium">
                                {match.team2Id?.name || 'Équipe 2'}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              {match.status === MatchStatus.COMPLETED ? (
                                <span className="text-sm font-mono">
                                  {match.team1Score} - {match.team2Score}
                                </span>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  En attente
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Aucun match programmé</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="ranking" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Classement</CardTitle>
              <CardDescription>
                Classement actuel des équipes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sortedTeams.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Équipe</TableHead>
                      <TableHead className="text-center">J</TableHead>
                      <TableHead className="text-center">V</TableHead>
                      <TableHead className="text-center">N</TableHead>
                      <TableHead className="text-center">D</TableHead>
                      <TableHead className="text-center">Pts</TableHead>
                      <TableHead className="text-center">Diff</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTeams.map((team, index) => (
                      <TableRow key={team._id}>
                        <TableCell className="font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {team.name}
                        </TableCell>
                        <TableCell className="text-center">
                          {team.stats?.gamesPlayed || 0}
                        </TableCell>
                        <TableCell className="text-center">
                          {team.stats?.wins || 0}
                        </TableCell>
                        <TableCell className="text-center">
                          {team.stats?.draws || 0}
                        </TableCell>
                        <TableCell className="text-center">
                          {team.stats?.losses || 0}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {team.points || team.stats?.points || 0}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={
                            (team.scoreDiff || team.stats?.scoreDifference || 0) > 0 
                              ? 'text-green-600' 
                              : (team.scoreDiff || team.stats?.scoreDifference || 0) < 0 
                              ? 'text-red-600' 
                              : 'text-gray-600'
                          }>
                            {(team.scoreDiff || team.stats?.scoreDifference || 0) > 0 ? '+' : ''}
                            {team.scoreDiff || team.stats?.scoreDifference || 0}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Aucun classement disponible</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de sélection d'équipes */}
      <SelectTeamsForm
        open={showSelectTeams}
        onOpenChange={setShowSelectTeams}
        tournamentId={id}
        onTeamsSelected={handleTeamsSelected}
      />
    </div>
  );
};

export default TournamentDetail; 