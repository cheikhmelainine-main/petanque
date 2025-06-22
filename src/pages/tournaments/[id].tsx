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

import { SelectTeamsForm } from '../../components/teams/SelectTeamsForm';
import { TournamentRanking } from '../../components/tournaments/TournamentRanking';
import { GroupMatchesList } from '../../components/matches/GroupMatchesList';
import QualificationButton from '../../components/tournaments/QualificationButton';
import EliminationBracket from '../../components/tournaments/EliminationBracket';

import { 
  useTournament, 
  useTeams, 
  useMatches, 
  useStartTournament, 
  useNextRound, 
  useKnockoutPhase,
  useAddTeamsToTournament,
  useNextGroupRound,
  useNextPoule,
  useQualificationPhase
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
  const nextGroupRound = useNextGroupRound();
  const nextPoule = useNextPoule();
  const qualificationPhase = useQualificationPhase();

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

  const handleNextGroupRound = () => {
    nextGroupRound.mutate(id);
  };

  const handleNextPoule = () => {
    nextPoule.mutate(id);
  };

  const handleQualification = () => {
    qualificationPhase.mutate(id);
  };

  const handleTeamsSelected = (teamIds: string[]) => {
    addTeamsToTournament.mutate({ tournamentId: id, teamIds });
  };

  const completedMatches = matches.filter(m => m.status === MatchStatus.COMPLETED);
  const currentRound = Math.max(...matches.map(m => m.round), 0);
  const currentRoundMatches = matches.filter(m => m.round === currentRound);
  const allCurrentRoundCompleted = currentRoundMatches.length > 0 && 
    currentRoundMatches.every(m => m.status === MatchStatus.COMPLETED);

  // Nouvelle logique pour les tournois GROUP
  const checkAllGroupsCompleted = () => {
    if (tournament?.type !== 'GROUP') return false;
    
    // Vérifier si toutes les poules ont terminé leurs matchs de qualification
    const groupMatches = matches.filter(m => m.roundType === 'GROUP' || m.roundType === 'GROUP_QUALIFICATION');
    const groupNumbers = [...new Set(groupMatches.map(m => m.groupNumber))];
    
    if (groupNumbers.length === 0) return false;
    
    // Pour chaque groupe, vérifier si tous les matchs sont terminés
    return groupNumbers.every(groupNumber => {
      const groupMatchesForGroup = groupMatches.filter(m => m.groupNumber === groupNumber);
      return groupMatchesForGroup.length > 0 && groupMatchesForGroup.every(m => m.status === MatchStatus.COMPLETED);
    });
  };

  const allGroupsCompleted = checkAllGroupsCompleted();
  const hasEliminationMatches = matches.some(m => m.roundType === 'KNOCKOUT' || m.roundType === 'WINNERS' || m.roundType === 'LOSERS');

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
                  className="gap-2"
                  size="sm"
                >
                  <Target className="h-4 w-4" />
                  {nextRound.isPending ? 'Génération...' : 'Prochain tour'}
                </Button>
              )}
              
              {tournament.type === 'GROUP' && !hasEliminationMatches && (
                <>
                  {!allGroupsCompleted && allCurrentRoundCompleted && (
                    <Button 
                      onClick={handleNextPoule}
                      disabled={nextPoule.isPending}
                      className="gap-2"
                      size="sm"
                    >
                      <Target className="h-4 w-4" />
                      {nextPoule.isPending ? 'Génération...' : 'Lancer la poule suivante'}
                    </Button>
                  )}
                  
                  {allGroupsCompleted && (
                    <Button 
                      onClick={handleQualification}
                      disabled={qualificationPhase.isPending}
                      className="gap-2 bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <Medal className="h-4 w-4" />
                      {qualificationPhase.isPending ? 'Qualification...' : 'Qualification'}
                    </Button>
                  )}
                </>
              )}
              
              {allCurrentRoundCompleted && tournament.type === 'MARATHON' && (
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
          
          {tournament.status === TournamentStatus.UPCOMING && (
            <Button 
              onClick={() => setShowSelectTeams(true)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Ajouter équipes
            </Button>
          )}
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Équipes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {teams.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Matchs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {matches.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Terminés</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {completedMatches.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tour actuel</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {currentRound || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="teams">Équipes</TabsTrigger>
          <TabsTrigger value="matches">Matchs</TabsTrigger>
          <TabsTrigger value="ranking">Classement</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Détails du tournoi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Type</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {tournament.type}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600">Format</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {tournament.format}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600">Date de début</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatDate(tournament.startDate)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600">Statut</p>
                  <div className="mt-1">
                    {getStatusBadge(tournament.status)}
                  </div>
                </div>
              </div>
              
              {tournament.description && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Description</p>
                  <p className="text-gray-900 dark:text-white">
                    {tournament.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bouton de qualification pour les tournois de type GROUP */}
          {tournament.type === 'GROUP' && 
           tournament.status === TournamentStatus.ONGOING && 
           allGroupsCompleted && 
           !hasEliminationMatches && (
            <QualificationButton 
              tournamentId={id}
              onQualificationComplete={() => {
                // Recharger les données après qualification
                window.location.reload();
              }}
            />
          )}
        </TabsContent>
        
        <TabsContent value="teams" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Équipes inscrites</CardTitle>
              <CardDescription>
                Liste des équipes participant au tournoi
              </CardDescription>
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
          {tournament.type === 'GROUP' ? (
            <GroupMatchesList matches={matches} />
          ) : (
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
          )}
        </TabsContent>
        
        <TabsContent value="ranking" className="space-y-6">
          <TournamentRanking 
            tournamentId={id} 
            tournamentType={tournament.type as 'GROUP' | 'SWISS' | 'MARATHON'} 
          />
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