import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Trophy, Crown, Medal, Target } from 'lucide-react';

interface EliminationMatch {
  _id: string;
  round: number;
  team1Id: string | { _id: string; name: string };
  team2Id: string | { _id: string; name: string };
  team1Score?: number;
  team2Score?: number;
  status: string;
  winnerTeamId?: string | { _id: string; name: string };
  eliminationRound?: string;
  metadata?: {
    eliminationRound?: string;
    team1OriginalGroup?: number;
    team2OriginalGroup?: number;
    bracketType?: 'winners' | 'losers' | 'semi_finals' | 'winners_final' | 'losers_final';
    bracketName?: string;
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

export default function EliminationBracket({ matches, teams = [] }: EliminationBracketProps) {
  // Séparer les matchs par type de bracket avec couleurs distinctes
  const winnersByRound: Record<number, EliminationMatch[]> = {};
  const losersByRound: Record<number, EliminationMatch[]> = {};
  const generalByRound: Record<number, EliminationMatch[]> = {};
  const semiFinalsByRound: Record<number, EliminationMatch[]> = {};
  const finalsByRound: Record<number, EliminationMatch[]> = {};

  matches.forEach(match => {
    const round = match.round;
    const bracketType = match.metadata?.bracketType;
    const bracketName = match.metadata?.bracketName;

    if (bracketType === 'semi_finals') {
      if (!semiFinalsByRound[round]) semiFinalsByRound[round] = [];
      semiFinalsByRound[round].push(match);
    } else if (bracketType === 'winners_final' || bracketType === 'losers_final') {
      if (!finalsByRound[round]) finalsByRound[round] = [];
      finalsByRound[round].push(match);
    } else if (bracketType === 'winners' || bracketName === 'Qualifiés') {
      if (!winnersByRound[round]) winnersByRound[round] = [];
      winnersByRound[round].push(match);
    } else if (bracketType === 'losers' || bracketName === 'Éliminés') {
      if (!losersByRound[round]) losersByRound[round] = [];
      losersByRound[round].push(match);
    } else {
      if (!generalByRound[round]) generalByRound[round] = [];
      generalByRound[round].push(match);
    }
  });

  // Trier les rounds
  const sortRounds = (rounds: Record<number, EliminationMatch[]>) => {
    return Object.keys(rounds)
      .map(Number)
      .sort((a, b) => a - b);
  };

  // Fonction pour obtenir l'ID d'une équipe (gère les deux formats)
  const getTeamId = (teamId: string | { _id: string; name: string }): string => {
    return typeof teamId === 'string' ? teamId : teamId._id;
  };

  // Fonction pour obtenir le nom d'une équipe
  const getTeamName = (teamId: string | { _id: string; name: string }) => {
    const id = getTeamId(teamId);
    if (!teams) return 'Équipe inconnue';
    const team = teams.find(t => t._id === id);
    return team?.name || 'Équipe inconnue';
  };

  // Fonction pour obtenir les informations d'une équipe
  const getTeamInfo = (teamId: string | { _id: string; name: string }) => {
    const id = getTeamId(teamId);
    if (!teams) return undefined;
    return teams.find(t => t._id === id);
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

  // Composant pour afficher un match avec couleurs distinctes selon le type
  const MatchCard = ({ match, bracketType }: { match: EliminationMatch; bracketType: string }) => {
    const team1 = getTeamInfo(match.team1Id);
    const team2 = getTeamInfo(match.team2Id);
    const isCompleted = match.status === 'COMPLETED';
    const winner = match.winnerTeamId;
    
    // Définir les couleurs selon le type de bracket
    const getBracketColors = () => {
      switch (bracketType) {
        case 'winners':
        case 'Qualifiés':
          return {
            background: 'bg-green-50 border-green-200',
            winnerBackground: 'bg-green-100 border-green-300',
            iconColor: 'text-green-500',
            textColor: 'text-green-700',
            badgeColor: 'bg-green-100 text-green-800',
            team1Border: 'border-l-4 border-green-500',
            team2Border: 'border-l-4 border-green-500'
          };
        case 'losers':
        case 'Éliminés':
          return {
            background: 'bg-red-50 border-red-200',
            winnerBackground: 'bg-red-100 border-red-300',
            iconColor: 'text-red-500',
            textColor: 'text-red-700',
            badgeColor: 'bg-red-100 text-red-800',
            team1Border: 'border-l-4 border-red-500',
            team2Border: 'border-l-4 border-red-500'
          };
        case 'semi_finals':
          return {
            background: 'bg-purple-50 border-purple-200',
            winnerBackground: 'bg-purple-100 border-purple-300',
            iconColor: 'text-purple-500',
            textColor: 'text-purple-700',
            badgeColor: 'bg-purple-100 text-purple-800',
            team1Border: 'border-l-4 border-purple-500',
            team2Border: 'border-l-4 border-purple-500'
          };
        case 'winners_final':
        case 'losers_final':
          return {
            background: 'bg-yellow-50 border-yellow-200',
            winnerBackground: 'bg-yellow-100 border-yellow-300',
            iconColor: 'text-yellow-500',
            textColor: 'text-yellow-700',
            badgeColor: 'bg-yellow-100 text-yellow-800',
            team1Border: 'border-l-4 border-yellow-500',
            team2Border: 'border-l-4 border-yellow-500'
          };
        default:
          return {
            background: 'bg-gray-50 border-gray-200',
            winnerBackground: 'bg-gray-100 border-gray-300',
            iconColor: 'text-gray-500',
            textColor: 'text-gray-700',
            badgeColor: 'bg-gray-100 text-gray-800',
            team1Border: 'border-l-4 border-gray-500',
            team2Border: 'border-l-4 border-gray-500'
          };
      }
    };

    const colors = getBracketColors();
    
    // Déterminer les bordures des équipes selon leur statut
    const getTeamBorder = (team: Team | undefined, isWinner: boolean) => {
      if (!team) return '';
      
      // Si c'est un match de demi-finale, utiliser les couleurs du bracket
      if (bracketType === 'semi_finals') {
        return isWinner ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500';
      }
      
      // Si c'est un match de finale, utiliser les couleurs du bracket
      if (bracketType === 'winners_final' || bracketType === 'losers_final') {
        return isWinner ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500';
      }
      
      // Pour les autres matchs, utiliser les couleurs du bracket
      return colors.team1Border;
    };
    
    return (
      <div 
        className={`p-4 border rounded-lg transition-all ${
          isCompleted 
            ? colors.background
            : 'bg-gray-50 border-gray-200'
        }`}
      >
        <div className="space-y-2">
          {/* Équipe 1 */}
          <div className={`flex items-center justify-between p-2 rounded ${
            isCompleted && winner === match.team1Id 
              ? colors.winnerBackground
              : 'bg-white border'
          } ${getTeamBorder(team1, isCompleted && winner === match.team1Id)}`}>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {getTeamName(match.team1Id)}
              </span>
              {team1 && (
                <div className="flex gap-1">
                  <Badge variant="outline" className="text-xs">
                    G{team1.originalGroup}
                  </Badge>
                  <Badge className={`text-xs ${colors.badgeColor}`}>
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
              ? colors.winnerBackground
              : 'bg-white border'
          } ${getTeamBorder(team2, isCompleted && winner === match.team2Id)}`}>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {getTeamName(match.team2Id)}
              </span>
              {team2 && (
                <div className="flex gap-1">
                  <Badge variant="outline" className="text-xs">
                    G{team2.originalGroup}
                  </Badge>
                  <Badge className={`text-xs ${colors.badgeColor}`}>
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
                <Trophy className={`h-3 w-3 ${colors.iconColor}`} />
                <span className={`text-xs font-medium ${colors.textColor}`}>
                  {getTeamName(winner)} gagne
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Composant pour afficher un bracket avec couleurs distinctes
  const BracketSection = ({ 
    title, 
    icon, 
    matchesByRound, 
    sortedRounds, 
    color,
    bracketType
  }: { 
    title: string; 
    icon: React.ReactNode; 
    matchesByRound: Record<number, EliminationMatch[]>; 
    sortedRounds: number[];
    color: string;
    bracketType: string;
  }) => (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-lg">{title}</h3>
        <Badge variant="outline" className={color}>
          {Object.values(matchesByRound).flat().length} match{Object.values(matchesByRound).flat().length > 1 ? 's' : ''}
        </Badge>
      </div>
      
      {sortedRounds.map((round) => (
        <div key={round} className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-500" />
            <h4 className="font-medium">
              {getRoundName(round, matchesByRound[round][0])}
            </h4>
            <Badge variant="outline">
              {matchesByRound[round].length} match{matchesByRound[round].length > 1 ? 's' : ''}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matchesByRound[round].map((match) => (
              <MatchCard key={match._id} match={match} bracketType={bracketType} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  if (matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Phase d&apos;Élimination
          </CardTitle>
          <CardDescription>
            Aucun match d&apos;élimination n&apos;a encore été généré
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
          Phase d&apos;Élimination Directe
        </CardTitle>
        <CardDescription>
          Bracket d&apos;élimination avec {(teams?.length ?? 0)} équipes qualifiées - Double Finale
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Bracket des demi-finales */}
          {Object.keys(semiFinalsByRound).length > 0 && (
            <BracketSection
              title="Demi-finales des Qualifiés"
              icon={<Trophy className="h-5 w-5 text-purple-500" />}
              matchesByRound={semiFinalsByRound}
              sortedRounds={sortRounds(semiFinalsByRound)}
              color="text-purple-600"
              bracketType="semi_finals"
            />
          )}

          {/* Bracket des finales */}
          {Object.keys(finalsByRound).length > 0 && (
            <BracketSection
              title="Finales"
              icon={<Crown className="h-5 w-5 text-yellow-500" />}
              matchesByRound={finalsByRound}
              sortedRounds={sortRounds(finalsByRound)}
              color="text-yellow-600"
              bracketType="finals"
            />
          )}

          {/* Bracket des gagnants (Groupes Qualifiés) - VERT */}
          {Object.keys(winnersByRound).length > 0 && (
            <BracketSection
              title="Groupes Qualifiés 🏆"
              icon={<Crown className="h-5 w-5 text-green-500" />}
              matchesByRound={winnersByRound}
              sortedRounds={sortRounds(winnersByRound)}
              color="text-green-600"
              bracketType="winners"
            />
          )}

          {/* Bracket des perdants (Groupes Perdus) - ROUGE */}
          {Object.keys(losersByRound).length > 0 && (
            <BracketSection
              title="Groupes Perdus 🥉"
              icon={<Medal className="h-5 w-5 text-red-500" />}
              matchesByRound={losersByRound}
              sortedRounds={sortRounds(losersByRound)}
              color="text-red-600"
              bracketType="losers"
            />
          )}

          {/* Matchs généraux (ancien système) */}
          {Object.keys(generalByRound).length > 0 && (
            <BracketSection
              title="Phase d&apos;Élimination"
              icon={<Trophy className="h-5 w-5 text-blue-500" />}
              matchesByRound={generalByRound}
              sortedRounds={sortRounds(generalByRound)}
              color="text-blue-600"
              bracketType="general"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}