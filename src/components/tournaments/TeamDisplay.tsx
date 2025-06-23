import React from 'react';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Users, Target } from 'lucide-react';

interface Team {
  _id: string;
  name: string;
  originalGroup?: number;
  qualificationRank?: number;
  isQualified?: boolean;
  qualificationType?: string;
  wins?: number;
  losses?: number;
}

interface TeamDisplayProps {
  teams: Team[];
  title?: string;
  showQualificationStatus?: boolean;
}

export default function TeamDisplay({ teams, title = "Équipes", showQualificationStatus = true }: TeamDisplayProps) {
  // Fonction pour déterminer la bordure d'une équipe selon son statut
  const getTeamBorder = (team: Team) => {
    if (!showQualificationStatus) return 'border-l-4 border-gray-500';
    
    if (team.isQualified) {
      return 'border-l-4 border-green-500'; // Équipe qualifiée
    } else {
      return 'border-l-4 border-red-500'; // Équipe éliminée
    }
  };

  // Fonction pour déterminer la couleur du badge selon le statut
  const getBadgeColor = (team: Team) => {
    if (!showQualificationStatus) return 'bg-gray-100 text-gray-800';
    
    if (team.isQualified) {
      return 'bg-green-100 text-green-800'; // Équipe qualifiée
    } else {
      return 'bg-red-100 text-red-800'; // Équipe éliminée
    }
  };

  // Fonction pour obtenir le texte du badge
  const getBadgeText = (team: Team) => {
    if (!showQualificationStatus) return '';
    
    if (team.qualificationRank) {
      return team.qualificationRank === 1 ? '1er' : '2e';
    }
    
    if (team.isQualified) {
      return 'Qualifiée';
    } else {
      return 'Éliminée';
    }
  };

  // Grouper les équipes par groupe si elles ont un originalGroup
  const teamsByGroup = teams.reduce((acc, team) => {
    const group = team.originalGroup || 0;
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(team);
    return acc;
  }, {} as Record<number, Team[]>);

  const hasGroups = Object.keys(teamsByGroup).length > 1 || (Object.keys(teamsByGroup).length === 1 && Object.keys(teamsByGroup)[0] !== '0');

  if (teams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">
            Aucune équipe à afficher
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" />
          {title} ({teams.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasGroups ? (
          // Afficher par groupes
          <div className="space-y-4">
            {Object.entries(teamsByGroup).map(([groupNumber, groupTeams]) => (
              <div key={groupNumber} className="space-y-2">
                {groupNumber !== '0' && (
                  <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Groupe {groupNumber}
                  </h4>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {groupTeams.map((team) => (
                    <div
                      key={team._id}
                      className={`p-3 bg-white border rounded-lg ${getTeamBorder(team)}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {team.name}
                          </span>
                          {showQualificationStatus && team.originalGroup && (
                            <Badge variant="outline" className="text-xs">
                              G{team.originalGroup}
                            </Badge>
                          )}
                          {showQualificationStatus && (
                            <Badge className={`text-xs ${getBadgeColor(team)}`}>
                              {getBadgeText(team)}
                            </Badge>
                          )}
                        </div>
                        {(team.wins !== undefined || team.losses !== undefined) && (
                          <div className="text-xs text-gray-500">
                            {team.wins || 0}V - {team.losses || 0}D
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Afficher en liste simple
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {teams.map((team) => (
              <div
                key={team._id}
                className={`p-3 bg-white border rounded-lg ${getTeamBorder(team)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {team.name}
                    </span>
                    {showQualificationStatus && team.originalGroup && (
                      <Badge variant="outline" className="text-xs">
                        G{team.originalGroup}
                      </Badge>
                    )}
                    {showQualificationStatus && (
                      <Badge className={`text-xs ${getBadgeColor(team)}`}>
                        {getBadgeText(team)}
                      </Badge>
                    )}
                  </div>
                  {(team.wins !== undefined || team.losses !== undefined) && (
                    <div className="text-xs text-gray-500">
                      {team.wins || 0}V - {team.losses || 0}D
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 