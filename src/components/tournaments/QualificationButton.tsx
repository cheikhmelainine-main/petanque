import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Trophy, Users, Zap } from 'lucide-react';

interface QualificationButtonProps {
  tournamentId: string;
  onQualificationComplete?: () => void;
  disabled?: boolean;
}

interface QualificationResult {
  qualifiedTeamsCount: number;
  eliminationMatchesCount: number;
  qualifiedTeams: Array<{
    id: string;
    name: string;
    originalGroup: number;
    qualificationRank: number;
  }>;
  eliminationMatches: Array<{
    id: string;
    round: number;
    team1Id: string;
    team2Id: string;
    eliminationRound?: string;
  }>;
}

export default function QualificationButton({ 
  tournamentId, 
  onQualificationComplete,
  disabled = false 
}: QualificationButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<QualificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleQualification = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/tournament/${tournamentId}/qualification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la qualification');
      }

      setResult(data.data);
      
      // Appeler le callback si fourni
      if (onQualificationComplete) {
        onQualificationComplete();
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Phase de Qualification
          </CardTitle>
          <CardDescription>
            Lancez la phase d'élimination directe avec tirage au sort des équipes qualifiées
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleQualification}
            disabled={disabled || isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Zap className="h-4 w-4 mr-2 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Trophy className="h-4 w-4 mr-2" />
                Lancer les Qualifications
              </>
            )}
          </Button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <Trophy className="h-4 w-4" />
                <span className="font-semibold">Qualifications générées avec succès !</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">
                    <strong>{result.qualifiedTeamsCount}</strong> équipes qualifiées
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">
                    <strong>{result.eliminationMatchesCount}</strong> matchs d'élimination
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Équipes qualifiées par groupe :</h4>
                <div className="grid grid-cols-2 gap-2">
                  {result.qualifiedTeams.map((team) => (
                    <div key={team.id} className="flex items-center justify-between p-2 bg-white rounded border">
                      <span className="text-sm font-medium">{team.name}</span>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs">
                          G{team.originalGroup}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {team.qualificationRank === 1 ? '1er' : '2e'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Structure de l'élimination :</h4>
                <div className="flex flex-wrap gap-2">
                  {result.eliminationMatches.slice(0, 5).map((match) => (
                    <Badge key={match.id} variant="outline" className="text-xs">
                      {match.eliminationRound || `Round ${match.round}`}
                    </Badge>
                  ))}
                  {result.eliminationMatches.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{result.eliminationMatches.length - 5} autres
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 