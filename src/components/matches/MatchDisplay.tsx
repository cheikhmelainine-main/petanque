import React from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface Match {
  _id: string;
  tournamentId: string;
  round: number;
  groupNumber?: number;
  team1Id?: { name: string };
  team2Id?: { name: string };
  team1Score?: number;
  team2Score?: number;
  status: 'PENDING' | 'ONGOING' | 'COMPLETED' | 'TIMED_OUT';
  createdAt: string;
}

interface Tournament {
  _id: string;
  name: string;
  type: 'GROUP' | 'SWISS' | 'MARATHON';
}

interface MatchDisplayProps {
  matches: Match[];
  tournaments: Tournament[];
  onScoreUpdate?: (matchId: string, team1Score: number, team2Score: number) => void;
  isUpdating?: boolean;
}

const MatchDisplay: React.FC<MatchDisplayProps> = ({ 
  matches, 
  tournaments, 
  onScoreUpdate,
  isUpdating = false
}) => {
  
  const getRoundLabel = (match: Match) => {
    const tournament = tournaments.find(t => t._id === match.tournamentId);
    if (tournament?.type === 'GROUP') {
      return `Poule ${match.groupNumber || 1}`;
    }
    return `Tour ${match.round}`;
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      'PENDING': { label: 'En attente', className: 'bg-yellow-100 text-yellow-800' },
      'ONGOING': { label: 'En cours', className: 'bg-blue-100 text-blue-800' },
      'COMPLETED': { label: 'Terminé', className: 'bg-green-100 text-green-800' },
      'TIMED_OUT': { label: 'Temps écoulé', className: 'bg-red-100 text-red-800' }
    };
    
    const config = configs[status as keyof typeof configs] || configs['PENDING'];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (matches.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mb-3" />
          <h3 className="text-base font-medium mb-2">Aucun match</h3>
          <p className="text-sm text-gray-500 text-center">
            Les matchs apparaîtront ici une fois les tournois démarrés
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {matches.map((match, index) => (
        <motion.div
          key={match._id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.02 }}
        >
          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Équipes et score */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {getRoundLabel(match)}
                      </span>
                      {getStatusBadge(match.status)}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(match.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-4">
                    {/* Équipe 1 */}
                    <div className="flex-1 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                          {match.team1Id?.name || 'Équipe 1'}
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {match.team1Score ?? '-'}
                      </div>
                    </div>

                    {/* VS */}
                    <div className="text-gray-400 font-medium text-sm">
                      VS
                    </div>

                    {/* Équipe 2 */}
                    <div className="flex-1 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                          {match.team2Id?.name || 'Équipe 2'}
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {match.team2Score ?? '-'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions et résultat */}
                {match.status === 'COMPLETED' && (
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Vainqueur</div>
                    <div className="font-medium text-sm text-green-600">
                      {(match.team1Score ?? 0) > (match.team2Score ?? 0) 
                        ? match.team1Id?.name 
                        : match.team2Id?.name
                      }
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default MatchDisplay; 