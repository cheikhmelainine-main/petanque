import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Table } from '../ui/table';
import { Trophy, Medal, Crown, Users, Target } from 'lucide-react';

interface TournamentRankingProps {
  tournamentId: string;
  tournamentType?: 'GROUP' | 'SWISS' | 'MARATHON';
}

interface GroupRanking {
  groupNumber: number;
  teams: Array<{
    _id: string;
    name: string;
    wins: number;
    losses: number;
    matchesPlayed: number;
    pointsFor: number;
    pointsAgainst: number;
    pointsDifference: number;
    qualificationStatus: 'qualified' | 'should_qualify' | 'eliminated';
    qualificationRank?: number;
    groupRank: number;
  }>;
  status: string;
}

interface SwissRanking {
  _id: string;
  name: string;
  tournamentPoints: number;
  wins: number;
  losses: number;
  draws: number;
}

export const TournamentRanking: React.FC<TournamentRankingProps> = ({
  tournamentId,
  tournamentType = 'SWISS'
}) => {
  const [ranking, setRanking] = useState<GroupRanking[] | SwissRanking[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRanking();
  }, [tournamentId]);

  const fetchRanking = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tournament/${tournamentId}/ranking`);
      
      if (response.ok) {
        const data = await response.json();
        setRanking(data.ranking);
      } else {
        console.error('Erreur lors de la récupération du classement');
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQualificationBadge = (status: string, rank?: number) => {
    switch (status) {
      case 'qualified':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <Crown className="h-3 w-3 mr-1" />
            Qualifié {rank && `(${rank}er)`}
          </Badge>
        );
      case 'should_qualify':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <Trophy className="h-3 w-3 mr-1" />
            À qualifier
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-gray-600">
            Éliminé
          </Badge>
        );
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 2:
        return <Medal className="h-4 w-4 text-gray-400" />;
      case 3:
        return <Medal className="h-4 w-4 text-amber-600" />;
      default:
        return <span className="h-4 w-4 text-center text-sm font-bold">{rank}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!ranking) {
    return (
      <div className="text-center p-8 text-gray-500">
        Impossible de charger le classement
      </div>
    );
  }

  // Affichage pour les tournois par groupes
  if (tournamentType === 'GROUP') {
    const groupRanking = ranking as GroupRanking[];
    
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5" />
          <h2 className="text-xl font-bold">Classement par Groupes</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groupRanking.map((group) => (
            <Card key={group.groupNumber}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span>Groupe {group.groupNumber}</span>
                  <Badge variant="outline">
                    {group.teams.length} équipes
                  </Badge>
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {group.teams.map((team) => (
                    <div
                      key={team._id}
                      className={`p-3 rounded-lg border ${
                        team.qualificationStatus === 'qualified'
                          ? 'bg-green-50 border-green-200'
                          : team.qualificationStatus === 'should_qualify'
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getRankIcon(team.groupRank)}
                          <span className="font-medium">{team.name}</span>
                        </div>
                        {getQualificationBadge(team.qualificationStatus, team.qualificationRank)}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>Victoires: {team.wins}</div>
                        <div>Défaites: {team.losses}</div>
                        <div>Points pour: {team.pointsFor}</div>
                        <div>Points contre: {team.pointsAgainst}</div>
                      </div>
                      
                      <div className="mt-2 text-xs">
                        <span className={`font-medium ${
                          team.pointsDifference > 0 ? 'text-green-600' : 
                          team.pointsDifference < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          Différentiel: {team.pointsDifference > 0 ? '+' : ''}{team.pointsDifference}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Résumé des qualifiés */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Équipes Qualifiées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {groupRanking.map((group) => {
                const qualifiedTeams = group.teams.filter(t => t.qualificationStatus === 'qualified');
                return (
                  <div key={group.groupNumber} className="space-y-2">
                    <h4 className="font-medium">Groupe {group.groupNumber}</h4>
                    {qualifiedTeams.length > 0 ? (
                      qualifiedTeams.map((team) => (
                        <div key={team._id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                          <span>{team.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {team.qualificationRank === 1 ? '1er qualifié' : '2ème qualifié'}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">Aucune équipe qualifiée</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Affichage pour Swiss et Marathon
  const swissRanking = ranking as SwissRanking[];
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-5 w-5" />
        <h2 className="text-xl font-bold">
          Classement {tournamentType === 'SWISS' ? 'Suisse' : 'Marathon'}
        </h2>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="p-4 text-left font-medium">Rang</th>
                  <th className="p-4 text-left font-medium">Équipe</th>
                  <th className="p-4 text-center font-medium">Points</th>
                  <th className="p-4 text-center font-medium">V</th>
                  <th className="p-4 text-center font-medium">D</th>
                  <th className="p-4 text-center font-medium">N</th>
                  <th className="p-4 text-center font-medium">Ratio</th>
                </tr>
              </thead>
              <tbody>
                {swissRanking.map((team, index) => (
                  <tr key={team._id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getRankIcon(index + 1)}
                      </div>
                    </td>
                    <td className="p-4 font-medium">{team.name}</td>
                    <td className="p-4 text-center">
                      <Badge variant="default" className="bg-blue-100 text-blue-800">
                        {team.tournamentPoints}
                      </Badge>
                    </td>
                    <td className="p-4 text-center text-green-600 font-medium">{team.wins}</td>
                    <td className="p-4 text-center text-red-600 font-medium">{team.losses}</td>
                    <td className="p-4 text-center text-gray-600 font-medium">{team.draws}</td>
                    <td className="p-4 text-center text-sm text-gray-600">
                      {team.wins + team.losses + team.draws > 0 
                        ? `${Math.round((team.wins / (team.wins + team.losses + team.draws)) * 100)}%`
                        : '0%'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Légende pour Swiss/Marathon */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Système de Points</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-green-100 text-green-800">3 points</Badge>
            <span>Victoire à 13 points</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-100 text-blue-800">2 points</Badge>
            <span>Victoire dans le temps (sans atteindre 13)</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-yellow-100 text-yellow-800">1 point</Badge>
            <span>Match nul dans le temps</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 