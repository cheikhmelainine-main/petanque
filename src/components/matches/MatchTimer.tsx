import React, { useState, useEffect } from 'react';
import { Clock, Play, Pause, StopCircle, Trophy, Timer } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

interface MatchTimerProps {
  matchId: string;
  timeLimit?: number; // en minutes
  timerStartedAt?: string;
  isTimedMatch?: boolean;
  onTimerStart: (matchId: string) => void;
  onTimerEnd: (matchId: string) => void;
  disabled?: boolean;
  team1Name?: string;
  team2Name?: string;
  team1Score?: number;
  team2Score?: number;
  onScoreUpdate?: (matchId: string, team1Score: number, team2Score: number) => void;
  tournamentType?: 'GROUP' | 'SWISS' | 'MARATHON';
  status?: 'PENDING' | 'ONGOING' | 'COMPLETED' | 'TIMED_OUT';
}

export const MatchTimer: React.FC<MatchTimerProps> = ({
  matchId,
  timeLimit = 45,
  timerStartedAt,
  isTimedMatch = true,
  onTimerStart,
  onTimerEnd,
  disabled = false,
  team1Name = 'Équipe 1',
  team2Name = 'Équipe 2',
  team1Score = 0,
  team2Score = 0,
  onScoreUpdate,
  tournamentType = 'SWISS',
  status = 'PENDING'
}) => {
  const [remainingTime, setRemainingTime] = useState<number>(timeLimit * 60); // en secondes
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [localTeam1Score, setLocalTeam1Score] = useState<number>(team1Score);
  const [localTeam2Score, setLocalTeam2Score] = useState<number>(team2Score);

  useEffect(() => {
    setLocalTeam1Score(team1Score);
    setLocalTeam2Score(team2Score);
  }, [team1Score, team2Score]);

  useEffect(() => {
    if (timerStartedAt) {
      const startTime = new Date(timerStartedAt).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, timeLimit * 60 - elapsed);
      
      setRemainingTime(remaining);
      setIsActive(remaining > 0 && status === 'ONGOING');
      setIsExpired(remaining <= 0);
    }
  }, [timerStartedAt, timeLimit, status]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive && remainingTime > 0) {
      interval = setInterval(() => {
        setRemainingTime(prevTime => {
          const newTime = prevTime - 1;
          if (newTime <= 0) {
            setIsActive(false);
            setIsExpired(true);
            onTimerEnd(matchId);
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, remainingTime, matchId, onTimerEnd]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setIsActive(true);
    onTimerStart(matchId);
  };

  const handlePause = () => {
    setIsActive(false);
  };

  const handleStop = () => {
    setIsActive(false);
    setRemainingTime(timeLimit * 60);
    onTimerEnd(matchId);
  };

  const handleScoreChange = (team: 'team1' | 'team2', increment: number) => {
    if (status === 'COMPLETED') return;

    const newTeam1Score = team === 'team1' ? Math.max(0, localTeam1Score + increment) : localTeam1Score;
    const newTeam2Score = team === 'team2' ? Math.max(0, localTeam2Score + increment) : localTeam2Score;

    setLocalTeam1Score(newTeam1Score);
    setLocalTeam2Score(newTeam2Score);

    if (onScoreUpdate) {
      onScoreUpdate(matchId, newTeam1Score, newTeam2Score);
    }
  };

  const getScoreColor = (score: number, opponentScore: number) => {
    if (score > opponentScore) return 'text-green-600 font-bold';
    if (score < opponentScore) return 'text-red-600';
    return 'text-gray-600';
  };

  const getPointsInfo = () => {
    if (tournamentType === 'GROUP') {
      return null; // Pas de système de points pour les groupes
    }

    if (localTeam1Score === 13 || localTeam2Score === 13) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <Trophy className="h-3 w-3 mr-1" />
          Victoire à 13 = 3 points
        </Badge>
      );
    } else if (isExpired || status === 'TIMED_OUT') {
      if (localTeam1Score === localTeam2Score) {
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Timer className="h-3 w-3 mr-1" />
            Match nul = 1 point chacun
          </Badge>
        );
      } else {
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800">
            <Timer className="h-3 w-3 mr-1" />
            Victoire temps = 2 points
          </Badge>
        );
      }
    } else {
      return (
        <Badge variant="outline" className="text-gray-600">
          En cours...
        </Badge>
      );
    }
  };

  const getTimerColor = () => {
    if (isExpired) return 'text-red-600 bg-red-50';
    if (remainingTime <= 300) return 'text-orange-600 bg-orange-50'; // 5 minutes
    if (remainingTime <= 600) return 'text-yellow-600 bg-yellow-50'; // 10 minutes
    return 'text-green-600 bg-green-50';
  };

  const getProgressColor = () => {
    if (isExpired) return 'bg-red-500';
    if (remainingTime <= 300) return 'bg-orange-500';
    if (remainingTime <= 600) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const progressPercentage = ((timeLimit * 60 - remainingTime) / (timeLimit * 60)) * 100;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-2">
        <CardTitle className="text-center text-lg">
          {team1Name} vs {team2Name}
        </CardTitle>
        {getPointsInfo()}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Score */}
        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
          <div className="flex flex-col items-center space-y-2">
            <span className="text-sm font-medium truncate w-20 text-center">{team1Name}</span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleScoreChange('team1', -1)}
                disabled={disabled || status === 'COMPLETED'}
                className="h-8 w-8 p-0"
              >
                -
              </Button>
              <span className={`text-2xl font-mono ${getScoreColor(localTeam1Score, localTeam2Score)}`}>
                {localTeam1Score}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleScoreChange('team1', 1)}
                disabled={disabled || status === 'COMPLETED'}
                className="h-8 w-8 p-0"
              >
                +
              </Button>
            </div>
          </div>

          <div className="text-xl font-bold text-gray-400">VS</div>

          <div className="flex flex-col items-center space-y-2">
            <span className="text-sm font-medium truncate w-20 text-center">{team2Name}</span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleScoreChange('team2', -1)}
                disabled={disabled || status === 'COMPLETED'}
                className="h-8 w-8 p-0"
              >
                -
              </Button>
              <span className={`text-2xl font-mono ${getScoreColor(localTeam2Score, localTeam1Score)}`}>
                {localTeam2Score}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleScoreChange('team2', 1)}
                disabled={disabled || status === 'COMPLETED'}
                className="h-8 w-8 p-0"
              >
                +
              </Button>
            </div>
          </div>
        </div>

        {/* Timer (seulement pour Swiss et Marathon) */}
        {isTimedMatch && tournamentType !== 'GROUP' && (
          <Card className={`${getTimerColor()}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Chrono Match</span>
              </div>
              
              {/* Barre de progression */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div
                  className={`h-2 rounded-full transition-all duration-1000 ${getProgressColor()}`}
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                />
              </div>

              {/* Affichage du temps */}
              <div className="text-center mb-4">
                <div className="text-3xl font-mono font-bold mb-1">
                  {formatTime(remainingTime)}
                </div>
                <div className="text-xs opacity-75">
                  {isExpired ? 'TEMPS ÉCOULÉ' : `Limite: ${timeLimit}min`}
                </div>
              </div>

              {/* Contrôles */}
              <div className="flex gap-2 justify-center">
                {!timerStartedAt && !isActive ? (
                  <Button
                    onClick={handleStart}
                    disabled={disabled}
                    className="gap-1 bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    <Play className="h-3 w-3" />
                    Démarrer
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={isActive ? handlePause : handleStart}
                      disabled={disabled || isExpired}
                      className="gap-1"
                      size="sm"
                      variant={isActive ? "secondary" : "default"}
                    >
                      {isActive ? (
                        <>
                          <Pause className="h-3 w-3" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3" />
                          Reprendre
                        </>
                      )}
                    </Button>
                    
                    <Button
                      onClick={handleStop}
                      disabled={disabled}
                      className="gap-1"
                      size="sm"
                      variant="destructive"
                    >
                      <StopCircle className="h-3 w-3" />
                      Arrêter
                    </Button>
                  </>
                )}
              </div>

              {/* Messages d'état */}
              {isExpired && (
                <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-800 text-center">
                  ⚠️ Temps écoulé ! Le gagnant actuel remporte par temps limite.
                </div>
              )}
              
              {remainingTime <= 300 && remainingTime > 0 && (
                <div className="mt-3 p-2 bg-orange-100 border border-orange-300 rounded text-xs text-orange-800 text-center">
                  ⏰ Moins de 5 minutes restantes !
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Informations spéciales pour les groupes */}
        {tournamentType === 'GROUP' && (
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Tournoi par groupes</strong> - Pas de matchs nuls autorisés
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 