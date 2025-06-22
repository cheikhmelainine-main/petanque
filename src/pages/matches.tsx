import React, { useState } from 'react';
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Trophy, 
  Users, 
  Clock,
  CheckCircle,
  Edit,
  Search,
  Filter,
  Target,
  ArrowRight,
  Package
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { GroupMatchesList } from '../components/matches/GroupMatchesList';

import { useMatches, useTournaments, useUpdateMatch, useUpdateMatchScore } from '../hooks/useApi';
import { Match, MatchStatus, TournamentStatus, Tournament, TournamentType } from '../types/api';

interface ScoreUpdateFormProps {
  match: Match | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ScoreUpdateForm: React.FC<ScoreUpdateFormProps> = ({ match, open, onOpenChange }) => {
  const [team1Score, setTeam1Score] = useState<number>(match?.team1Score || 0);
  const [team2Score, setTeam2Score] = useState<number>(match?.team2Score || 0);
  const [finishedBeforeTimeLimit, setFinishedBeforeTimeLimit] = useState(true);

  const updateMatch = useUpdateMatch();
  const updateScore = useUpdateMatchScore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!match) return;

    updateMatch.mutate({
      action: 'update_score',
      matchId: match._id,
      team1Score,
      team2Score,
      finishedBeforeTimeLimit
    }, {
      onSuccess: () => {
        onOpenChange(false);
      }
    });
  };

  React.useEffect(() => {
    if (match) {
      setTeam1Score(match.team1Score || 0);
      setTeam2Score(match.team2Score || 0);
    }
  }, [match]);

  if (!match) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-blue-600" />
            Saisir le score
          </DialogTitle>
          <DialogDescription>
            Match : {match.team1Id?.name} vs {match.team2Id?.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="team1Score">{match.team1Id?.name}</Label>
              <Input
                id="team1Score"
                type="number"
                min="0"
                max="13"
                value={team1Score}
                onChange={(e) => setTeam1Score(parseInt(e.target.value) || 0)}
                required
              />
            </div>
            <div>
              <Label htmlFor="team2Score">{match.team2Id?.name}</Label>
              <Input
                id="team2Score"
                type="number"
                min="0"
                max="13"
                value={team2Score}
                onChange={(e) => setTeam2Score(parseInt(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="finishedBeforeTimeLimit"
              checked={finishedBeforeTimeLimit}
              onChange={(e) => setFinishedBeforeTimeLimit(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="finishedBeforeTimeLimit">
              Match terminé avant la limite de temps
            </Label>
          </div>

          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold">
              {team1Score} - {team2Score}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Vainqueur : {team1Score > team2Score 
                ? match.team1Id?.name 
                : team2Score > team1Score 
                ? match.team2Id?.name 
                : 'Match nul'}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMatch.isLoading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={updateMatch.isLoading}
            >
              {updateMatch.isLoading ? 'Mise à jour...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const MatchesPage: React.FC = () => {
  const [selectedTournament, setSelectedTournament] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedGroupPoule, setSelectedGroupPoule] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: tournaments = [], isLoading } = useTournaments();
  const { data: allMatches = [], isLoading: matchesLoading } = useMatches();
  const { data: tournamentMatches = [], isLoading: tournamentMatchesLoading } = useMatches(selectedTournament === 'all' ? undefined : selectedTournament);
  const updateScore = useUpdateMatchScore();

  // Fonction pour obtenir le libellé du round/poule selon le type de tournoi
  const getRoundLabel = (match: Match, tournament?: Tournament) => {
    if (tournament?.type === TournamentType.GROUP) {
      const groupLetter = match.groupNumber ? String.fromCharCode(64 + match.groupNumber) : 'A';
      return `Poule ${groupLetter}`;
    }
    return `Tour ${match.round}`;
  };

  // Fonction pour convertir un numéro de groupe en lettre
  const getGroupLetter = (groupNumber: number) => {
    return String.fromCharCode(64 + groupNumber); // 1 -> A, 2 -> B, etc.
  };

  const matches = selectedTournament === 'all' ? allMatches : tournamentMatches;
  const activeTournament = tournaments.find(t => t._id === selectedTournament);

  // Obtenir les groupes/poules disponibles pour le tournoi sélectionné
  const getAvailableGroupsPoules = () => {
    if (selectedTournament === 'all') return [];
    
    const tournament = tournaments.find(t => t._id === selectedTournament);
    if (!tournament) return [];
    
    if (tournament.type === TournamentType.GROUP) {
      // Pour les tournois en groupe, récupérer les numéros de groupes des matchs
      const groupNumbers = [...new Set(matches
        .filter(m => m.groupNumber)
        .map(m => m.groupNumber!)
      )].sort((a, b) => a - b);
      
      return groupNumbers.map(num => ({
        value: num.toString(),
        label: `Poule ${getGroupLetter(num)}`
      }));
    } else {
      // Pour les autres types de tournois, récupérer les numéros de tours
      const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);
      
      return rounds.map(round => ({
        value: round.toString(),
        label: `Tour ${round}`
      }));
    }
  };

  // Reset pagination quand les filtres changent
  React.useEffect(() => {
    setCurrentPage(1);
    // Reset le filtre groupe/poule quand on change de tournoi
    setSelectedGroupPoule('all');
  }, [selectedTournament, selectedStatus, searchQuery]);

  const filteredMatches = matches.filter(match => {
    const matchesSearch = !searchQuery || 
      match.team1Id?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.team2Id?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTournament = selectedTournament === 'all' || match.tournamentId === selectedTournament;
    
    const matchesStatus = selectedStatus === 'all' || match.status === selectedStatus;
    
    const matchesGroupPoule = selectedGroupPoule === 'all' || 
      (activeTournament?.type === TournamentType.GROUP ? 
        match.groupNumber?.toString() === selectedGroupPoule :
        match.round.toString() === selectedGroupPoule);
    
    return matchesSearch && matchesTournament && matchesStatus && matchesGroupPoule;
  });

  // Calculer les statistiques par poule pour les tournois GROUP
  const getGroupStats = () => {
    if (!activeTournament || activeTournament.type !== TournamentType.GROUP) {
      return null;
    }

    const groupStats = new Map();
    
    filteredMatches.forEach(match => {
      const groupNumber = match.groupNumber || 1;
      const groupLetter = getGroupLetter(groupNumber);
      
      if (!groupStats.has(groupNumber)) {
        groupStats.set(groupNumber, {
          letter: groupLetter,
          pending: 0,
          ongoing: 0,
          completed: 0,
          total: 0
        });
      }
      
      const stats = groupStats.get(groupNumber);
      stats.total++;
      
      switch (match.status) {
        case MatchStatus.PENDING:
          stats.pending++;
          break;
        case MatchStatus.ONGOING:
          stats.ongoing++;
          break;
        case MatchStatus.COMPLETED:
          stats.completed++;
          break;
      }
    });

    return Array.from(groupStats.values()).sort((a, b) => a.letter.localeCompare(b.letter));
  };

  // Trier les matchs : En attente en premier, puis par date (plus récent en premier)
  const sortedMatches = [...filteredMatches].sort((a, b) => {
    // Priorité 1: Statut (PENDING en premier)
    if (a.status === MatchStatus.PENDING && b.status !== MatchStatus.PENDING) return -1;
    if (b.status === MatchStatus.PENDING && a.status !== MatchStatus.PENDING) return 1;
    
    // Priorité 2: Date de création (plus récent en premier)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Pagination pour les tournois non-GROUP
  const totalPages = Math.ceil(sortedMatches.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMatches = sortedMatches.slice(startIndex, startIndex + itemsPerPage);

  const pendingMatches = matches.filter(m => m.status === MatchStatus.PENDING);
  const ongoingMatches = matches.filter(m => m.status === MatchStatus.ONGOING);
  const completedMatches = matches.filter(m => m.status === MatchStatus.COMPLETED);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="text-orange-600 border-orange-600">En attente</Badge>;
      case 'ONGOING':
        return <Badge className="bg-green-600">En cours</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="text-gray-600">Terminé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleScoreUpdate = (matchId: string, team1Score: number, team2Score: number) => {
    updateScore.mutate({
      matchId,
      team1Score,
      team2Score,
      finishedBeforeTimeLimit: true
    });
  };

  const availableGroupsPoules = getAvailableGroupsPoules();
  const groupStats = getGroupStats();

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* En-tête compact */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">
            Matchs
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Suivez et gérez les rencontres
          </p>
        </div>
        
        {/* Info pour les tournois en groupe */}
        {selectedTournament !== 'all' && activeTournament?.type === TournamentType.GROUP && (
          <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Tournoi en mode groupes</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-blue-600 hover:text-blue-700 p-1"
              onClick={() => window.location.href = `/tournaments/${activeTournament._id}`}
            >
              <ArrowRight className="h-4 w-4" />
              Gérer les poules
            </Button>
          </div>
        )}
      </div>

      {/* Statistiques - Conditionnelles selon le type de tournoi */}
      {selectedTournament !== 'all' && activeTournament?.type === TournamentType.GROUP && groupStats ? (
        // Affichage par poule pour les tournois GROUP
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="h-5 w-5" />
            Statistiques par poule
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupStats.map((stats) => (
              <Card key={stats.letter} className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">📦 Poule {stats.letter}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-orange-600">En attente</span>
                      <span className="font-semibold">{stats.pending}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">En cours</span>
                      <span className="font-semibold">{stats.ongoing}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Terminés</span>
                      <span className="font-semibold">{stats.completed}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1 mt-2">
                      <span className="font-medium">Total</span>
                      <span className="font-bold">{stats.total}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        // Statistiques globales pour les autres types de tournois
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-6 w-6 text-orange-600" />
                <div>
                  <p className="text-lg font-semibold">{pendingMatches.length}</p>
                  <p className="text-xs text-gray-500">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                </div>
                <div>
                  <p className="text-lg font-semibold">{ongoingMatches.length}</p>
                  <p className="text-xs text-gray-500">En cours</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-green-600" />
                <div>
                  <p className="text-lg font-semibold">{completedMatches.length}</p>
                  <p className="text-xs text-gray-500">Terminés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Target className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="text-lg font-semibold">{matches.length}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtres compacts */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher par équipe..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-0 bg-gray-50 dark:bg-gray-800 h-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
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
              
              {/* Filtre pour les groupes/poules */}
              {selectedTournament !== 'all' && availableGroupsPoules.length > 0 && (
                <select
                  value={selectedGroupPoule}
                  onChange={(e) => setSelectedGroupPoule(e.target.value)}
                  className="h-9 px-3 text-sm border border-gray-200 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="all">
                    {activeTournament?.type === TournamentType.GROUP ? 'Toutes les poules' : 'Tous les tours'}
                  </option>
                  {availableGroupsPoules.map(item => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              )}
              
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-9 px-3 text-sm border border-gray-200 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="all">Tous les statuts</option>
                <option value="PENDING">En attente</option>
                <option value="ONGOING">En cours</option>
                <option value="COMPLETED">Terminés</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Affichage des matchs - Conditionnel selon le type de tournoi */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      ) : filteredMatches.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-base font-medium mb-2">
              {searchQuery ? 'Aucun match trouvé' : 'Aucun match'}
            </h3>
            <p className="text-sm text-gray-500 text-center">
              {searchQuery 
                ? 'Essayez de modifier votre recherche'
                : 'Les matchs apparaîtront ici une fois les tournois démarrés'
              }
            </p>
          </CardContent>
        </Card>
      ) : selectedTournament !== 'all' && activeTournament?.type === TournamentType.GROUP ? (
        // Affichage par poules pour les tournois GROUP
        <GroupMatchesList matches={filteredMatches} />
      ) : (
        // Affichage classique pour les autres types de tournois
        <div className="space-y-3">
          {/* Indicateur de tri */}
          <div className="text-sm text-gray-500 mb-3">
            <span className="font-medium">Tri :</span> Matchs en attente en premier, puis par date (plus récents d'abord)
          </div>

          {paginatedMatches.map((match, index) => (
            <motion.div
              key={match._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
            >
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Équipes et score */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {getRoundLabel(match, activeTournament)}
                          </span>
                          {getStatusBadge(match.status)}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(match.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-center gap-4">
                        {/* Équipe 1 */}
                        <div className="flex-1 text-center">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-sm text-gray-900 dark:text-white">
                              {match.team1Id?.name || 'Équipe 1'}
                            </span>
                          </div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {match.team1Score ?? '-'}
                          </div>
                        </div>

                        {/* VS */}
                        <div className="text-gray-400 font-medium text-sm">
                          VS
                        </div>

                        {/* Équipe 2 */}
                        <div className="flex-1 text-center">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-sm text-gray-900 dark:text-white">
                              {match.team2Id?.name || 'Équipe 2'}
                            </span>
                          </div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {match.team2Score ?? '-'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {match.status === MatchStatus.PENDING && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <ScoreInput
                          matchId={match._id}
                          onSubmit={handleScoreUpdate}
                          disabled={updateScore.isPending}
                        />
                      </div>
                    )}

                    {match.status === MatchStatus.COMPLETED && (
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">Vainqueur</div>
                        <div className="font-medium text-sm text-green-600">
                          {(match.team1Score ?? 0) > (match.team2Score ?? 0) 
                            ? match.team1Id?.name 
                            : match.team2Id?.name
                          }
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="space-y-3">
              {/* Compteur de résultats */}
              <div className="text-sm text-gray-500 text-center">
                Affichage de {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedMatches.length)} sur {sortedMatches.length} matchs
              </div>
              
              {/* Contrôles de pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {/* Bouton Précédent */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="w-24 flex-shrink-0"
                >
                  Précédent
                </Button>
                
                {/* Numéros de pages - responsive avec flex-wrap */}
                <div className="flex items-center justify-center flex-wrap gap-1 max-w-xs sm:max-w-none">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0 flex-shrink-0"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                
                {/* Bouton Suivant */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="w-24 flex-shrink-0"
                >
                  Suivant
                </Button>
              </div>
              
              {/* Navigation rapide pour mobile */}
              <div className="sm:hidden flex items-center justify-center gap-2">
                <span className="text-sm text-gray-500">Page</span>
                <select
                  value={currentPage}
                  onChange={(e) => setCurrentPage(Number(e.target.value))}
                  className="text-sm border border-gray-200 rounded px-2 py-1"
                >
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <option key={page} value={page}>
                      {page}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-gray-500">sur {totalPages}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Formulaire de saisie des scores */}
      <ScoreUpdateForm
        match={editingMatch}
        open={!!editingMatch}
        onOpenChange={(open) => !open && setEditingMatch(null)}
      />
    </div>
  );
};

// Composant pour saisir les scores
const ScoreInput: React.FC<{
  matchId: string
  onSubmit: (matchId: string, team1Score: number, team2Score: number) => void
  disabled: boolean
}> = ({ matchId, onSubmit, disabled }) => {
  const [team1Score, setTeam1Score] = useState('')
  const [team2Score, setTeam2Score] = useState('')

  const handleSubmit = () => {
    const score1 = parseInt(team1Score)
    const score2 = parseInt(team2Score)
    
    if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) {
      alert('Veuillez saisir des scores valides')
      return
    }
    
    onSubmit(matchId, score1, score2)
    setTeam1Score('')
    setTeam2Score('')
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        placeholder="0"
        value={team1Score}
        onChange={(e) => setTeam1Score(e.target.value)}
        className="w-16 h-8 text-center text-sm"
        min="0"
        max="13"
      />
      <span className="text-gray-400 text-sm">-</span>
      <Input
        type="number"
        placeholder="0"
        value={team2Score}
        onChange={(e) => setTeam2Score(e.target.value)}
        className="w-16 h-8 text-center text-sm"
        min="0"
        max="13"
      />
      <Button
        onClick={handleSubmit}
        disabled={disabled || !team1Score || !team2Score}
        size="sm"
        className="h-8 px-3"
      >
        OK
      </Button>
    </div>
  )
}

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

export default MatchesPage; 