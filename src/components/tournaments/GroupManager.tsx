import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  Users, 
  Trophy, 
  Play, 
  CheckCircle, 
  Clock, 
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { MatchCard } from '../matches/MatchCard';

interface GroupManagerProps {
  tournamentId: string;
  onRefresh?: () => void;
}

interface MatchData {
  _id: string;
  team1Id?: { name: string; _id: string };
  team2Id?: { name: string; _id: string };
  team1Score?: number;
  team2Score?: number;
  status: 'PENDING' | 'ONGOING' | 'COMPLETED' | 'TIMED_OUT';
  round: number;
  roundType: string;
}

interface GroupData {
  groupNumber: number;
  teams: Array<{
    _id: string;
    name: string;
    wins: number;
    losses: number;
    matchesPlayed: number;
    isQualified?: boolean;
    qualificationRank?: number;
    qualificationType?: 'winners_final' | 'losers_final';
  }>;
  matches: {
    round1: MatchData[];
    round2: MatchData[];
    qualification: MatchData[];
    winnersFinal: MatchData[];
    losersFinal: MatchData[];
  };
  status: string;
  round1Completed: boolean;
  round2Completed: boolean;
  qualificationCompleted: boolean;
  winnersFinalCompleted: boolean;
  losersFinalCompleted: boolean;
}

interface GroupStatusData {
  tournamentId: string;
  groupsCount: number;
  groups: GroupData[];
  canStartKnockout: boolean;
  overallStatus: string;
}

export const GroupManager: React.FC<GroupManagerProps> = ({
  tournamentId,
  onRefresh
}) => {
  const [groupsData, setGroupsData] = useState<GroupStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchGroupsStatus();
  }, [tournamentId]);

  const fetchGroupsStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tournament/${tournamentId}/group-management`);
      
      if (response.ok) {
        const data = await response.json();
        setGroupsData(data);
      } else {
        console.error('Erreur lors de la récupération des groupes');
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGroupAction = async (action: string, groupNumber?: number) => {
    try {
      setActionLoading(action + (groupNumber || ''));
      
      const response = await fetch(`/api/tournament/${tournamentId}/group-management`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          groupNumber
        }),
      });

      if (response.ok) {
        await fetchGroupsStatus();
        if (onRefresh) onRefresh();
      } else {
        const error = await response.json();
        console.error('Erreur action:', error.message);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleScoreUpdate = async (matchId: string, team1Score: number, team2Score: number) => {
    try {
      const response = await fetch('/api/matches', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_score',
          matchId,
          team1Score,
          team2Score,
          finishedBeforeTimeLimit: true
        }),
      });

      if (response.ok) {
        await fetchGroupsStatus();
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('Erreur mise à jour score:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'FINALS_IN_PROGRESS':
        return 'bg-purple-100 text-purple-800';
      case 'FINALS_READY':
        return 'bg-orange-100 text-orange-800';
      case 'QUALIFICATION_READY':
        return 'bg-blue-100 text-blue-800';
      case 'ROUND_2_READY':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Terminé';
      case 'FINALS_IN_PROGRESS':
        return 'Finales en cours';
      case 'FINALS_READY':
        return 'Prêt pour finales';
      case 'QUALIFICATION_READY':
        return 'Prêt pour qualification';
      case 'ROUND_2_READY':
        return 'Prêt pour round 2';
      case 'ROUND_1_IN_PROGRESS':
        return 'Round 1 en cours';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!groupsData) {
    return (
      <div className="text-center p-8 text-gray-500">
        Impossible de charger les données des groupes
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statut global */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestion des Groupes ({groupsData.groupsCount} groupes)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge className={getStatusColor(groupsData.overallStatus)}>
                {getStatusText(groupsData.overallStatus)}
              </Badge>
              
              <Button
                onClick={() => handleGroupAction('check_group_progression')}
                disabled={actionLoading === 'check_group_progression'}
                variant="outline"
                size="sm"
              >
                <Clock className="h-4 w-4 mr-2" />
                Vérifier progression
              </Button>
            </div>

            {groupsData.canStartKnockout && (
              <Button
                onClick={() => handleGroupAction('start_knockout_phase')}
                disabled={actionLoading === 'start_knockout_phase'}
                className="bg-green-600 hover:bg-green-700"
              >
                <Trophy className="h-4 w-4 mr-2" />
                Démarrer phases knockout
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Groupes */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {groupsData.groups.map((group) => (
          <Card key={group.groupNumber} className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Groupe {group.groupNumber}</span>
                <Badge className={getStatusColor(group.status)}>
                  {getStatusText(group.status)}
                </Badge>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Équipes */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Équipes
                </h4>
                <div className="space-y-1">
                  {group.teams.map((team, index) => (
                    <div
                      key={team._id}
                      className={`flex items-center justify-between p-2 rounded text-sm ${
                        index < 2 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                      }`}
                    >
                      <span className="font-medium">{team.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {team.wins}V - {team.losses}D
                        </span>
                        {index < 2 && (
                          <Badge variant="outline" className="text-xs bg-green-100">
                            Qualifié
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Matchs Round 1 */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Round 1
                  {group.round1Completed && <CheckCircle className="h-4 w-4 text-green-600" />}
                </h4>
                
                {group.matches.round1.length > 0 ? (
                  <div className="space-y-2">
                    {group.matches.round1.map((match) => (
                      <div key={match._id} className="text-sm">
                        <MatchCard
                          matchId={match._id}
                          team1Name={match.team1Id?.name || 'Équipe 1'}
                          team2Name={match.team2Id?.name || 'Équipe 2'}
                          team1Score={match.team1Score || 0}
                          team2Score={match.team2Score || 0}
                          tournamentType="GROUP"
                          status={match.status}
                          onScoreUpdate={handleScoreUpdate}
                          disabled={match.status === 'COMPLETED'}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Aucun match généré</p>
                )}
              </div>

              {/* Actions Round 2 */}
              {group.round1Completed && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <ChevronRight className="h-4 w-4" />
                      Round 2
                      {group.round2Completed && <CheckCircle className="h-4 w-4 text-green-600" />}
                    </h4>
                    
                    {group.matches.round2.length === 0 ? (
                      <Button
                        onClick={() => handleGroupAction('generate_second_round', group.groupNumber)}
                        disabled={actionLoading === `generate_second_round${group.groupNumber}`}
                        variant="outline"
                        size="sm"
                      >
                        Générer Round 2
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        {group.matches.round2.map((match) => (
                          <div key={match._id} className="text-sm">
                            <MatchCard
                              matchId={match._id}
                              team1Name={match.team1Id?.name || 'Équipe 1'}
                              team2Name={match.team2Id?.name || 'Équipe 2'}
                              team1Score={match.team1Score || 0}
                              team2Score={match.team2Score || 0}
                              tournamentType="GROUP"
                              status={match.status}
                              onScoreUpdate={handleScoreUpdate}
                              disabled={match.status === 'COMPLETED'}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Actions Qualification */}
              {group.round2Completed && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      Finales de groupe
                      {(group.winnersFinalCompleted && group.losersFinalCompleted) && <CheckCircle className="h-4 w-4 text-green-600" />}
                    </h4>
                    
                    {/* Finale des gagnants */}
                    {group.matches.winnersFinal.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-sm font-medium text-green-600 mb-2">🏆 Finale des Gagnants</h5>
                        <div className="space-y-2">
                          {group.matches.winnersFinal.map((match) => (
                            <div key={match._id} className="text-sm">
                              <MatchCard
                                matchId={match._id}
                                team1Name={match.team1Id?.name || 'Équipe 1'}
                                team2Name={match.team2Id?.name || 'Équipe 2'}
                                team1Score={match.team1Score || 0}
                                team2Score={match.team2Score || 0}
                                tournamentType="GROUP"
                                status={match.status}
                                onScoreUpdate={handleScoreUpdate}
                                disabled={match.status === 'COMPLETED'}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Finale des perdants */}
                    {group.matches.losersFinal.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-sm font-medium text-orange-600 mb-2">🥉 Finale des Perdants</h5>
                        <div className="space-y-2">
                          {group.matches.losersFinal.map((match) => (
                            <div key={match._id} className="text-sm">
                              <MatchCard
                                matchId={match._id}
                                team1Name={match.team1Id?.name || 'Équipe 1'}
                                team2Name={match.team2Id?.name || 'Équipe 2'}
                                team1Score={match.team1Score || 0}
                                team2Score={match.team2Score || 0}
                                tournamentType="GROUP"
                                status={match.status}
                                onScoreUpdate={handleScoreUpdate}
                                disabled={match.status === 'COMPLETED'}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Générer les finales si elles n'existent pas */}
                    {group.matches.winnersFinal.length === 0 && group.matches.losersFinal.length === 0 && (
                      <Button
                        onClick={() => handleGroupAction('generate_qualification_match', group.groupNumber)}
                        disabled={actionLoading === `generate_qualification_match${group.groupNumber}`}
                        variant="outline"
                        size="sm"
                      >
                        Générer finales de groupe
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}; 