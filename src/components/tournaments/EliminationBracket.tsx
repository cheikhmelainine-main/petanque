import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Trophy, Users, Target } from 'lucide-react';

interface EliminationMatch {
  _id: string;
  round: number;
  team1Id: string;
  team2Id: string;
  team1Score?: number;
  team2Score?: number;
  status: string;
  winnerTeamId?: string;
  eliminationRound?: string;
  metadata?: {
    eliminationRound?: string;
    team1OriginalGroup?: number;
    team2OriginalGroup?: number;
  };
}

interface Team {
  _id: string;
  name: string;
  originalGroup?: number;
  qualificationRank?: number;
}

interface EliminationBracketProps {
  matches: EliminationMatch[];
  teams: Team[];
  tournamentId: string;
}

export default function EliminationBracket({ matches, teams, tournamentId }: EliminationBracketProps) {
  // Grouper les matchs par round
  const matchesByRound = matches.reduce((acc, match) => {
    const round = match.round;
    if (!acc[round]) {
      acc[round] = [];
    }
    acc[round].push(match);
    return acc;
  }, {} as Record<number, EliminationMatch[]>);

  // Trier les rounds
  const sortedRounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => a - b);

  // Fonction pour obtenir le nom d'une équipe
  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t._id === teamId);
    return team?.name || 'Équipe inconnue';
  };

  // Fonction pour obtenir les informations d'une équipe
  const getTeamInfo = (teamId: string) => {
    const team = teams.find(t => t._id === teamId);
    return team;
  };

  // Fonction pour obtenir le nom du round
  const getRoundName = (round: number, match: EliminationMatch) => {
    if (match.metadata?.eliminationRound) {
      return match.metadata.eliminationRound;
    }
    
    const totalTeams = teams.length;
    const roundNames: Record<number, string> = {
      1: totalTeams >= 64 ? '64ème de finale' : 
         totalTeams >= 32 ? '32ème de finale' :
         totalTeams >= 16 ? '16ème de finale' :
         totalTeams >= 8 ? '8ème de finale' : 'Quart de finale',
      2: totalTeams >= 32 ? '32ème de finale' :
         totalTeams >= 16 ? '16ème de finale' :
         totalTeams >= 8 ? '8ème de finale' : 'Demi-finale',
      3: totalTeams >= 16 ? '16ème de finale' :
         totalTeams >= 8 ? '8ème de finale' : 'Finale',
      4: totalTeams >= 8 ? '8ème de finale' : 'Finale',
      5: 'Quart de finale',
      6: 'Demi-finale',
      7: 'Finale'
    };
    
    return roundNames[round] || `Round ${round}`;
  };

  if (matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Phase d'Élimination
          </CardTitle>
          <CardDescription>
            Aucun match d'élimination n'a encore été généré
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Phase d'Élimination Directe
        </CardTitle>
        <CardDescription>
          Bracket d'élimination avec {teams.length} équipes qualifiées
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {sortedRounds.map((round) => (
            <div key={round} className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                <h3 className="font-semibold text-lg">
                  {getRoundName(round, matchesByRound[round][0])}
                </h3>
                <Badge variant="outline">
                  {matchesByRound[round].length} match{matchesByRound[round].length > 1 ? 's' : ''}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {matchesByRound[round].map((match) => {
                  const team1 = getTeamInfo(match.team1Id);
                  const team2 = getTeamInfo(match.team2Id);
                  const isCompleted = match.status === 'COMPLETED';
                  const winner = match.winnerTeamId;
                  
                  return (
                    <div 
                      key={match._id}
                      className={`p-4 border rounded-lg transition-all ${
                        isCompleted 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="space-y-2">
                        {/* Équipe 1 */}
                        <div className={`flex items-center justify-between p-2 rounded ${
                          isCompleted && winner === match.team1Id 
                            ? 'bg-green-100 border border-green-300' 
                            : 'bg-white border'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {getTeamName(match.team1Id)}
                            </span>
                            {team1 && (
                              <div className="flex gap-1">
                                <Badge variant="outline" className="text-xs">
                                  G{team1.originalGroup}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {team1.qualificationRank === 1 ? '1er' : '2e'}
                                </Badge>
                              </div>
                            )}
                          </div>
                          {isCompleted && (
                            <span className="font-bold text-lg">
                              {match.team1Score}
                            </span>
                          )}
                        </div>

                        {/* VS */}
                        <div className="text-center text-gray-500 text-sm font-medium">
                          VS
                        </div>

                        {/* Équipe 2 */}
                        <div className={`flex items-center justify-between p-2 rounded ${
                          isCompleted && winner === match.team2Id 
                            ? 'bg-green-100 border border-green-300' 
                            : 'bg-white border'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {getTeamName(match.team2Id)}
                            </span>
                            {team2 && (
                              <div className="flex gap-1">
                                <Badge variant="outline" className="text-xs">
                                  G{team2.originalGroup}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {team2.qualificationRank === 1 ? '1er' : '2e'}
                                </Badge>
                              </div>
                            )}
                          </div>
                          {isCompleted && (
                            <span className="font-bold text-lg">
                              {match.team2Score}
                            </span>
                          )}
                        </div>

                        {/* Statut du match */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Badge 
                            variant={isCompleted ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {isCompleted ? 'Terminé' : 'En attente'}
                          </Badge>
                          
                          {isCompleted && winner && (
                            <div className="flex items-center gap-1">
                              <Trophy className="h-3 w-3 text-yellow-500" />
                              <span className="text-xs font-medium text-green-700">
                                {getTeamName(winner)} gagne
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 