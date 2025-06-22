import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Trophy, Play, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { MatchCard } from '../matches/MatchCard';

interface WinnersFinalManagerProps {
  tournamentId: string;
  groupNumber: number;
  onRefresh?: () => void;
}

interface WinnersFinalData {
  groupNumber: number;
  finals: Array<{
    _id: string;
    team1Id?: { name: string; _id: string };
    team2Id?: { name: string; _id: string };
    team1Score?: number;
    team2Score?: number;
    status: 'PENDING' | 'ONGOING' | 'COMPLETED' | 'TIMED_OUT';
    winnerTeamId?: { name: string; _id: string };
  }>;
  canGenerate: boolean;
  isCompleted: boolean;
  qualifiedTeams?: Array<{ name: string; _id: string }>;
  canGenerateQualification?: boolean;
}

export const WinnersFinalManager: React.FC<WinnersFinalManagerProps> = ({
  tournamentId,
  groupNumber,
  onRefresh
}) => {
  const [finalData, setFinalData] = useState<WinnersFinalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [qualificationLoading, setQualificationLoading] = useState(false);

  useEffect(() => {
    fetchWinnersFinalStatus();
  }, [tournamentId, groupNumber]);

  const fetchWinnersFinalStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tournament/${tournamentId}/group-winners-final`);
      
      if (response.ok) {
        const data = await response.json();
        const groupFinals = data.winnersFinals.find((g: any) => g.groupNumber === groupNumber);
        
        if (groupFinals) {
          setFinalData({
            groupNumber,
            finals: groupFinals.finals,
            canGenerate: false,
            isCompleted: groupFinals.finals.every((f: any) => f.status === 'COMPLETED'),
            qualifiedTeams: data.qualifiedTeams,
            canGenerateQualification: data.canGenerateQualification
          });
        } else {
          const canGenerate = await checkCanGenerateFinal();
          setFinalData({
            groupNumber,
            finals: [],
            canGenerate,
            isCompleted: false,
            qualifiedTeams: data.qualifiedTeams,
            canGenerateQualification: data.canGenerateQualification
          });
        }
      } else {
        console.error('Erreur lors de la récupération des finales gagnants');
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkCanGenerateFinal = async (): Promise<boolean> => {
    try {
      const response = await fetch(`/api/tournament/${tournamentId}/group-management`);
      if (response.ok) {
        const data = await response.json();
        const group = data.groups.find((g: any) => g.groupNumber === groupNumber);
        return group && group.round2Completed && group.matches.winnersFinal.length === 0;
      }
    } catch (error) {
      console.error('Erreur vérification génération:', error);
    }
    return false;
  };

  const handleGenerateFinal = async () => {
    try {
      setActionLoading(true);
      
      const response = await fetch(`/api/tournament/${tournamentId}/group-winners-final`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate_winners_final',
          groupNumber
        }),
      });

      if (response.ok) {
        await fetchWinnersFinalStatus();
        if (onRefresh) onRefresh();
      } else {
        const error = await response.json();
        console.error('Erreur génération finale:', error.message);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateQualification = async () => {
    try {
      setQualificationLoading(true);
      
      const response = await fetch(`/api/tournament/${tournamentId}/group-winners-final`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate_winners_qualification'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Qualification des gagnants générée:', result.result.message);
        if (onRefresh) onRefresh();
      } else {
        const error = await response.json();
        console.error('Erreur génération qualification:', error.message);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setQualificationLoading(false);
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
        await fetchWinnersFinalStatus();
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('Erreur mise à jour score:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!finalData) {
    return (
      <div className="text-center p-4 text-gray-500">
        Impossible de charger les données de la finale des gagnants
      </div>
    );
  }

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-700">
          <Trophy className="h-5 w-5" />
          Finale des Gagnants - Groupe {groupNumber}
          {finalData.isCompleted && <CheckCircle className="h-5 w-5 text-green-600" />}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {finalData.finals.length === 0 ? (
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-600">
              Aucune finale des gagnants générée pour ce groupe
            </p>
            
            {finalData.canGenerate ? (
              <Button
                onClick={handleGenerateFinal}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {actionLoading ? 'Génération...' : 'Générer Finale des Gagnants'}
              </Button>
            ) : (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                <AlertCircle className="h-4 w-4 inline mr-2 text-yellow-600" />
                Les matchs de groupe doivent être terminés pour générer la finale
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="bg-green-100 text-green-800">
                🏆 Finale des Gagnants
              </Badge>
              {finalData.isCompleted && (
                <Badge className="bg-green-600">Terminé</Badge>
              )}
            </div>
            
            {finalData.finals.map((final) => (
              <div key={final._id} className="text-sm">
                <MatchCard
                  matchId={final._id}
                  team1Name={final.team1Id?.name || 'Équipe 1'}
                  team2Name={final.team2Id?.name || 'Équipe 2'}
                  team1Score={final.team1Score || 0}
                  team2Score={final.team2Score || 0}
                  tournamentType="GROUP"
                  status={final.status}
                  onScoreUpdate={handleScoreUpdate}
                  disabled={final.status === 'COMPLETED'}
                />
              </div>
            ))}
            
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs">
              <Trophy className="h-3 w-3 inline mr-1 text-green-600" />
              Les gagnants de cette finale sont qualifiés pour le bracket des gagnants
            </div>
          </div>
        )}

        {/* Section Qualification */}
        {finalData.qualifiedTeams && finalData.qualifiedTeams.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-600" />
              <h4 className="font-medium text-blue-800">Équipes Qualifiées</h4>
            </div>
            <p className="text-sm text-blue-700 mb-2">
              {finalData.qualifiedTeams.length} équipes qualifiées pour le bracket des gagnants
            </p>
            
            {finalData.canGenerateQualification && (
              <Button
                onClick={handleGenerateQualification}
                disabled={qualificationLoading}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {qualificationLoading ? 'Génération...' : 'Générer Bracket des Gagnants'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 