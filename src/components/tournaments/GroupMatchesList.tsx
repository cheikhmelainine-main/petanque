import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Users, Trophy, Target } from 'lucide-react';

interface Match {
  _id: string;
  round: number;
  roundType: string;
  groupNumber?: number;
  team1Id: { _id: string; name: string };
  team2Id: { _id: string; name: string };
  team1Score?: number;
  team2Score?: number;
  status: string;
  winnerTeamId?: { _id: string; name: string };
  metadata?: {
    finalType?: 'winners' | 'losers';
    description?: string;
  };
}

interface Team {
  _id: string;
  name: string;
  originalGroup?: number;
  qualificationRank?: number;
  isQualified?: boolean;
  qualificationType?: string;
}

interface GroupMatchesListProps {
  matches: Match[];
  teams?: Team[];
}

export default function GroupMatchesList({ matches, teams = [] }: GroupMatchesListProps) {
  // Grouper les matchs par groupe
  const groupMatches = matches.reduce((acc, match) => {
    const groupNumber = match.groupNumber || 1;
    if (!acc[groupNumber]) {
      acc[groupNumber] = [];
    }
    acc[groupNumber].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  // Fonction pour obtenir les informations d'une équipe
  const getTeamInfo = (teamId: string) => {
    return teams.find(t => t._id === teamId);
  };

  // Fonction pour déterminer la bordure d'une équipe selon son statut
  const getTeamBorder = (teamId: string, match: Match) => {
    const team = getTeamInfo(teamId);
    if (!team) return '';

    // Si c'est une finale de groupe
    if (match.metadata?.finalType) {
      if (match.metadata.finalType === 'winners') {
        return 'border-l-4 border-green-500'; // Équipes qualifiées
      } else {
        return 'border-l-4 border-red-500'; // Équipes perdantes
      }
    }

    // Pour les matchs de groupe normaux, utiliser le statut de qualification
    if (team.isQualified) {
      return 'border-l-4 border-green-500'; // Équipe qualifiée
    } else {
      return 'border-l-4 border-red-500'; // Équipe éliminée
    }
  };

  // Composant pour afficher un match avec bordures colorées
  const MatchCard = ({ match }: { match: Match }) => {
    const isCompleted = match.status === 'COMPLETED';
    const winner = match.winnerTeamId;
    const team1 = getTeamInfo(match.team1Id._id);
    const team2 = getTeamInfo(match.team2Id._id);

    // Déterminer les couleurs selon le type de match
    const getMatchColors = () => {
      if (match.metadata?.finalType === 'winners') {
        return {
          background: 'bg-green-50 border-green-200',
          winnerBackground: 'bg-green-100 border-green-300',
          iconColor: 'text-green-500',
          textColor: 'text-green-700'
        };
      } else if (match.metadata?.finalType === 'losers') {
        return {
          background: 'bg-red-50 border-red-200',
          winnerBackground: 'bg-red-100 border-red-300',
          iconColor: 'text-red-500',
          textColor: 'text-red-700'
        };
      } else {
        return {
          background: 'bg-blue-50 border-blue-200',
          winnerBackground: 'bg-blue-100 border-blue-300',
          iconColor: 'text-blue-500',
          textColor: 'text-blue-700'
        };
      }
    };

    const colors = getMatchColors();

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
            isCompleted && winner?._id === match.team1Id._id 
              ? colors.winnerBackground
              : 'bg-white border'
          } ${getTeamBorder(match.team1Id._id, match)}`}>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {match.team1Id.name}
              </span>
              {team1 && (
                <div className="flex gap-1">
                  <Badge variant="outline" className="text-xs">
                    G{match.groupNumber}
                  </Badge>
                  {team1.qualificationRank && (
                    <Badge className={`text-xs ${
                      team1.isQualified 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {team1.qualificationRank === 1 ? '1er' : '2e'}
                    </Badge>
                  )}
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
            isCompleted && winner?._id === match.team2Id._id 
              ? colors.winnerBackground
              : 'bg-white border'
          } ${getTeamBorder(match.team2Id._id, match)}`}>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {match.team2Id.name}
              </span>
              {team2 && (
                <div className="flex gap-1">
                  <Badge variant="outline" className="text-xs">
                    G{match.groupNumber}
                  </Badge>
                  {team2.qualificationRank && (
                    <Badge className={`text-xs ${
                      team2.isQualified 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {team2.qualificationRank === 1 ? '1er' : '2e'}
                    </Badge>
                  )}
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
                  {winner.name} gagne
                </span>
              </div>
            )}
          </div>

          {/* Type de match */}
          {match.metadata?.description && (
            <div className="text-xs text-gray-500 text-center">
              {match.metadata.description}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Phase de Groupes
          </CardTitle>
          <CardDescription>
            Aucun match de groupe n&apos;a encore été généré
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {Object.keys(groupMatches).map((groupNumber) => (
        <Card key={groupNumber}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Groupe {groupNumber}
            </CardTitle>
            <CardDescription>
              {groupMatches[Number(groupNumber)].length} match{groupMatches[Number(groupNumber)].length > 1 ? 's' : ''} dans ce groupe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupMatches[Number(groupNumber)].map((match) => (
                <MatchCard key={match._id} match={match} />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 