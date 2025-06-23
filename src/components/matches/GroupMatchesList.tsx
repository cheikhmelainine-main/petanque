import React, { useState } from 'react';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Calendar } from 'lucide-react';
import { useUpdateMatchScore } from '../../hooks/useApi';

interface Match {
  _id: string;
  groupNumber?: number;
  team1Id?: { 
    name: string;
    isQualified?: boolean;
    qualificationType?: string;
  };
  team2Id?: { 
    name: string;
    isQualified?: boolean;
    qualificationType?: string;
  };
  team1Score?: number;
  team2Score?: number;
  status: 'PENDING' | 'ONGOING' | 'COMPLETED' | 'TIMED_OUT';
  updatedAt?: string;
  createdAt: string;
}

interface GroupMatchesListProps {
  matches: Match[];
}

// Composant pour afficher une équipe avec bordure colorée
const TeamDisplay: React.FC<{
  team: { name: string; isQualified?: boolean; qualificationType?: string };
  isWinner?: boolean;
}> = ({ team, isWinner }) => {
  const getBorderClass = () => {
    if (isWinner) {
      return 'border-green-500 bg-green-50';
    }
    if (team.isQualified) {
      if (team.qualificationType === 'winners_final') {
        return 'border-green-500 bg-green-50';
      } else if (team.qualificationType === 'losers_final') {
        return 'border-orange-500 bg-orange-50';
      }
      return 'border-green-500 bg-green-50';
    }
    return 'border-red-500 bg-red-50';
  };

  const getBadge = () => {
    if (isWinner) {
      return <Badge className="ml-2 bg-green-100 text-green-800 text-xs">Gagnant</Badge>;
    }
    if (team.isQualified) {
      if (team.qualificationType === 'winners_final') {
        return <Badge className="ml-2 bg-green-100 text-green-800 text-xs">Qualifié</Badge>;
      } else if (team.qualificationType === 'losers_final') {
        return <Badge className="ml-2 bg-orange-100 text-orange-800 text-xs">Éliminé</Badge>;
      }
      return <Badge className="ml-2 bg-green-100 text-green-800 text-xs">Qualifié</Badge>;
    }
    return <Badge className="ml-2 bg-red-100 text-red-800 text-xs">Éliminé</Badge>;
  };

  return (
    <div className={`px-3 py-2 rounded-lg border-2 ${getBorderClass()} flex items-center justify-between`}>
      <span className="font-medium text-gray-900">{team.name}</span>
      {getBadge()}
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
    <div className="flex items-center gap-2 mt-2">
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

export const GroupMatchesList: React.FC<GroupMatchesListProps> = ({ matches }) => {
  const updateScore = useUpdateMatchScore();

  // Fonction pour convertir un numéro de groupe en lettre
  const getGroupLetter = (groupNumber: number) => {
    return String.fromCharCode(64 + groupNumber); // 1 -> A, 2 -> B, etc.
  };

  const handleScoreUpdate = (matchId: string, team1Score: number, team2Score: number) => {
    updateScore.mutate({
      matchId,
      team1Score,
      team2Score,
      finishedBeforeTimeLimit: true
    });
  };

  // Organiser les matchs par groupe
  const groupedMatches = matches.reduce((acc, match) => {
    const groupNumber = match.groupNumber || 1;
    if (!acc[groupNumber]) {
      acc[groupNumber] = [];
    }
    acc[groupNumber].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (matches.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">Aucun match programmé</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedMatches)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([groupNumber, groupMatches]) => {
          const groupLetter = getGroupLetter(Number(groupNumber));
          
          // Récupérer les équipes du groupe
          const groupTeams = [...new Set([
            ...groupMatches.map(m => m.team1Id?.name),
            ...groupMatches.map(m => m.team2Id?.name)
          ].filter(Boolean))];

          // Calculer les statistiques de ce groupe
          const groupStats = {
            pending: groupMatches.filter(m => m.status === 'PENDING').length,
            ongoing: groupMatches.filter(m => m.status === 'ONGOING').length,
            completed: groupMatches.filter(m => m.status === 'COMPLETED').length,
            total: groupMatches.length
          };

          // Trier : En attente d'abord, puis par date (plus récents d'abord)
          const sortedMatches = groupMatches.sort((a, b) => {
            if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
            if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
            return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
          });

          return (
            <Card key={groupNumber}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">
                      📦 Poule {groupLetter}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-orange-600">{groupStats.pending} en attente</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-green-600">{groupStats.ongoing} en cours</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-gray-600">{groupStats.completed} terminés</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {groupTeams.map(teamName => {
                      // Trouver l'équipe correspondante pour obtenir son statut
                      const team = groupMatches.find(m => 
                        m.team1Id?.name === teamName || m.team2Id?.name === teamName
                      )?.team1Id?.name === teamName 
                        ? groupMatches.find(m => m.team1Id?.name === teamName)?.team1Id
                        : groupMatches.find(m => m.team2Id?.name === teamName)?.team2Id;
                      
                      const status = team?.isQualified 
                        ? (team.qualificationType === 'winners_final' ? '✅' : '🥉')
                        : '❌';
                      
                      return `${status} ${teamName}`;
                    }).join(' • ')}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {sortedMatches.map((match) => (
                    <div 
                      key={match._id}
                      className={`p-4 border rounded-lg transition-all ${
                        match.status === 'PENDING' 
                          ? 'border-blue-200 bg-blue-50' 
                          : 'border-gray-200 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-4">
                          <TeamDisplay 
                            team={match.team1Id!} 
                            isWinner={match.status === 'COMPLETED' && match.team1Score! > match.team2Score!}
                          />
                          <span className="text-2xl font-bold text-gray-400">VS</span>
                          <TeamDisplay 
                            team={match.team2Id!} 
                            isWinner={match.status === 'COMPLETED' && match.team2Score! > match.team1Score!}
                          />
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {match.status === 'COMPLETED' ? (
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-2xl font-bold font-mono">
                                  <span className={match.team1Score! > match.team2Score! ? 'text-green-600' : 'text-gray-600'}>
                                    {match.team1Score}
                                  </span>
                                  <span className="text-gray-400 mx-2">-</span>
                                  <span className={match.team2Score! > match.team1Score! ? 'text-green-600' : 'text-gray-600'}>
                                    {match.team2Score}
                                  </span>
                                </div>
                              </div>
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                Terminé
                              </Badge>
                            </div>
                          ) : (
                            <Badge 
                              variant={match.status === 'PENDING' ? 'secondary' : 'outline'}
                              className={match.status === 'PENDING' ? 'bg-blue-100 text-blue-800' : ''}
                            >
                              {match.status === 'PENDING' ? 'En attente' : 'En cours'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Saisie de score pour les matchs en attente */}
                      {match.status === 'PENDING' && (
                        <div className="border-t pt-3 mt-3">
                          <div className="text-sm text-gray-600 mb-2">Saisir le résultat :</div>
                          <ScoreInput
                            matchId={match._id}
                            onSubmit={handleScoreUpdate}
                            disabled={updateScore.isPending}
                          />
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                        <span>
                          {formatDate(match.updatedAt || match.createdAt)}
                        </span>
                        {match.status === 'COMPLETED' && (
                          <span className="font-medium">
                            Vainqueur: {
                              match.team1Score! > match.team2Score! 
                                ? match.team1Id?.name 
                                : match.team2Id?.name
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
}; 