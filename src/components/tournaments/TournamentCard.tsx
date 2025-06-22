import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Users, 
  Trophy, 
  Play, 
  CheckCircle,
  MoreHorizontal,
  Eye,
  MapPin
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Tournament, 
  TournamentStatus, 
  TournamentType, 
  TeamFormat 
} from '../../types/api';

interface TournamentCardProps {
  tournament: Tournament;
  onStart?: (id: string) => void;
  onEdit?: (tournament: Tournament) => void;
  teamCount?: number;
}

const statusConfig = {
  [TournamentStatus.UPCOMING]: { 
    label: 'À venir', 
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: Calendar
  },
  [TournamentStatus.ONGOING]: { 
    label: 'En cours', 
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    icon: Play
  },
  [TournamentStatus.COMPLETED]: { 
    label: 'Terminé', 
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    icon: CheckCircle
  }
};

const typeConfig = {
  [TournamentType.GROUP]: { label: 'Poules' },
  [TournamentType.SWISS]: { label: 'Suisse' },
  [TournamentType.KNOCKOUT]: { label: 'Élimination' },
  [TournamentType.MARATHON]: { label: 'Marathon' }
};

const formatConfig = {
  [TeamFormat.SINGLES]: { label: 'Individuel', icon: '👤' },
  [TeamFormat.DOUBLES]: { label: 'Doublettes', icon: '👥' },
  [TeamFormat.TRIPLETS]: { label: 'Triplettes', icon: '👨‍👩‍👦' }
};

const TournamentCard: React.FC<TournamentCardProps> = ({ 
  tournament, 
  onStart, 
  onEdit, 
  teamCount = 0
}) => {
  const status = statusConfig[tournament.status];
  const type = typeConfig[tournament.type];
  const format = formatConfig[tournament.format];
  const StatusIcon = status.icon;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'UPCOMING':
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-600 text-xs">
            À venir
          </Badge>
        );
      case 'ONGOING':
        return (
          <Badge className="bg-green-600 text-xs">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse mr-1" />
            En cours
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge variant="outline" className="text-gray-600 text-xs">
            Terminé
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base text-gray-900 dark:text-white truncate">
                {tournament.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-500">
                  {formatDate(tournament.startDate)}
                </span>
              </div>
            </div>
            {getStatusBadge(tournament.status)}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-1">
              <Trophy className="h-3 w-3 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">
                {type.label}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">
                {format.label}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {teamCount}
              </span>
              <span className="text-xs text-gray-500">équipes</span>
            </div>
            
            {tournament.rounds && (
              <div className="text-xs text-gray-500">
                {tournament.rounds} tours
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Link href={`/tournaments/${tournament._id}`} className="flex-1">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full gap-1 h-8 text-xs"
              >
                <Eye className="h-3 w-3" />
                Voir
              </Button>
            </Link>
            
            {tournament.status === TournamentStatus.UPCOMING && onStart && (
              <Button
                onClick={() => onStart(tournament._id)}
                size="sm"
                className="gap-1 h-8 text-xs"
              >
                <Play className="h-3 w-3" />
                Démarrer
              </Button>
            )}
            
            {onEdit && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onEdit(tournament)}
                className="shrink-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TournamentCard; 