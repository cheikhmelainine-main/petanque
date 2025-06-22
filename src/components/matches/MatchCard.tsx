import React, { useState, useEffect } from 'react';
import { Clock, Play, Pause, StopCircle, Trophy, Timer, Plus, Minus } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

interface MatchCardProps {
  matchId: string;
  team1Name: string;
  team2Name: string;
  team1Score?: number;
  team2Score?: number;
  timeLimit?: number; // en minutes
  timerStartedAt?: string;
  isTimedMatch?: boolean;
  tournamentType?: 'GROUP' | 'SWISS' | 'MARATHON';
  status?: 'PENDING' | 'ONGOING' | 'COMPLETED' | 'TIMED_OUT';
  onScoreUpdate?: (matchId: string, team1Score: number, team2Score: number) => void;
  onTimerStart?: (matchId: string) => void;
  onTimerEnd?: (matchId: string) => void;
  disabled?: boolean;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  matchId,
  team1Name,
  team2Name,
  team1Score = 0,
  team2Score = 0,
  timeLimit = 45,
  timerStartedAt,
  isTimedMatch = false,
  tournamentType = 'SWISS',
  status = 'PENDING',
  onScoreUpdate,
  onTimerStart,
  onTimerEnd,
  disabled = false
}) => {
  const [remainingTime, setRemainingTime] = useState<number>(timeLimit * 60);
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
            if (onTimerEnd) onTimerEnd(matchId);
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

  const handleScoreChange = (team: 'team1' | 'team2', increment: number) => {
    if (status === 'COMPLETED' || disabled) return;

    const newTeam1Score = team === 'team1' ? Math.max(0, localTeam1Score + increment) : localTeam1Score;
    const newTeam2Score = team === 'team2' ? Math.max(0, localTeam2Score + increment) : localTeam2Score;

    setLocalTeam1Score(newTeam1Score);
    setLocalTeam2Score(newTeam2Score);

    if (onScoreUpdate) {
      onScoreUpdate(matchId, newTeam1Score, newTeam2Score);
    }
  };

  const handleTimerStart = () => {
    setIsActive(true);
    if (onTimerStart) onTimerStart(matchId);
  };

  const handleTimerStop = () => {
    setIsActive(false);
    setRemainingTime(timeLimit * 60);
    if (onTimerEnd) onTimerEnd(matchId);
  };

  const getScoreColor = (score: number, opponentScore: number) => {
    if (score > opponentScore) return 'text-green-600 font-bold';
    if (score < opponentScore) return 'text-red-600';
    return 'text-gray-600';
  };

  const getPointsInfo = () => {
    if (tournamentType === 'GROUP') {
      return (
        <Badge variant="outline" className="text-blue-600">
          Qualification
        </Badge>
      );
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
    if (isExpired) return 'border-red-500 bg-red-50';
    if (remainingTime <= 300) return 'border-orange-500 bg-orange-50';
    if (remainingTime <= 600) return 'border-yellow-500 bg-yellow-50';
    return 'border-green-500 bg-green-50';
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">
            {team1Name} vs {team2Name}
          </CardTitle>
          {getPointsInfo()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Score Section */}
        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
          <div className="flex flex-col items-center space-y-3">
            <span className="text-sm font-medium text-center max-w-[100px] truncate">
              {team1Name}
            </span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleScoreChange('team1', -1)}
                disabled={disabled || status === 'COMPLETED'}
                className="h-8 w-8 p-0"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className={`text-3xl font-mono font-bold ${getScoreColor(localTeam1Score, localTeam2Score)}`}>
                {localTeam1Score}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleScoreChange('team1', 1)}
                disabled={disabled || status === 'COMPLETED'}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="text-2xl font-bold text-gray-300 mx-4">VS</div>

          <div className="flex flex-col items-center space-y-3">
            <span className="text-sm font-medium text-center max-w-[100px] truncate">
              {team2Name}
            </span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleScoreChange('team2', -1)}
                disabled={disabled || status === 'COMPLETED'}
                className="h-8 w-8 p-0"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className={`text-3xl font-mono font-bold ${getScoreColor(localTeam2Score, localTeam1Score)}`}>
                {localTeam2Score}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleScoreChange('team2', 1)}
                disabled={disabled || status === 'COMPLETED'}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Timer Section (seulement pour Swiss et Marathon) */}
        {isTimedMatch && tournamentType !== 'GROUP' && (
          <div className={`p-4 rounded-lg border-2 ${getTimerColor()}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Chrono</span>
              </div>
              <span className="text-xs text-gray-500">Limite: {timeLimit}min</span>
            </div>
            
            <div className="text-center mb-3">
              <div className="text-2xl font-mono font-bold">
                {formatTime(remainingTime)}
              </div>
            </div>

            {/* Barre de progression */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div
                className={`h-2 rounded-full transition-all duration-1000 ${
                  isExpired ? 'bg-red-500' : 
                  remainingTime <= 300 ? 'bg-orange-500' : 
                  remainingTime <= 600 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(((timeLimit * 60 - remainingTime) / (timeLimit * 60)) * 100, 100)}%` }}
              />
            </div>

            <div className="flex gap-2 justify-center">
              {!timerStartedAt && !isActive ? (
                <Button
                  onClick={handleTimerStart}
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
                    onClick={isActive ? () => setIsActive(false) : handleTimerStart}
                    disabled={disabled || isExpired}
                    size="sm"
                    variant={isActive ? "secondary" : "default"}
                  >
                    {isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    {isActive ? 'Pause' : 'Reprendre'}
                  </Button>
                  
                  <Button
                    onClick={handleTimerStop}
                    disabled={disabled}
                    size="sm"
                    variant="destructive"
                  >
                    <StopCircle className="h-3 w-3" />
                    Arrêter
                  </Button>
                </>
              )}
            </div>

            {isExpired && (
              <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-800 text-center">
                ⚠️ Temps écoulé ! Résultat selon le score actuel.
              </div>
            )}
          </div>
        )}

        {/* Informations spéciales pour les groupes */}
        {tournamentType === 'GROUP' && (
          <div className="text-center p-3 bg-blue-50 rounded-lg border">
            <p className="text-sm text-blue-800 font-medium">
              🏆 Tournoi par groupes - Pas de matchs nuls autorisés
            </p>
          </div>
        )}

        {/* Statut du match */}
        <div className="text-center">
          <Badge 
            variant={
              status === 'COMPLETED' ? 'default' : 
              status === 'ONGOING' ? 'secondary' : 
              'outline'
            }
          >
            {status === 'PENDING' && 'En attente'}
            {status === 'ONGOING' && 'En cours'}
            {status === 'COMPLETED' && 'Terminé'}
            {status === 'TIMED_OUT' && 'Temps écoulé'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}; 