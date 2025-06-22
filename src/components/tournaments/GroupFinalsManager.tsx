import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { Trophy, Medal, Users } from 'lucide-react';
import { WinnersFinalManager } from './WinnersFinalManager';
import { LosersFinalManager } from './LosersFinalManager';

interface GroupFinalsManagerProps {
  tournamentId: string;
  groupNumber: number;
  onRefresh?: () => void;
}

export const GroupFinalsManager: React.FC<GroupFinalsManagerProps> = ({
  tournamentId,
  groupNumber,
  onRefresh
}) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Finales de Groupe {groupNumber}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Finale des Gagnants */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-green-600" />
            <h3 className="text-lg font-semibold text-green-700">Finale des Gagnants</h3>
          </div>
          <WinnersFinalManager
            tournamentId={tournamentId}
            groupNumber={groupNumber}
            onRefresh={onRefresh}
          />
        </div>

        <Separator />

        {/* Finale des Perdants */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Medal className="h-4 w-4 text-orange-600" />
            <h3 className="text-lg font-semibold text-orange-700">Finale des Perdants</h3>
          </div>
          <LosersFinalManager
            tournamentId={tournamentId}
            groupNumber={groupNumber}
            onRefresh={onRefresh}
          />
        </div>

        {/* Informations */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">ℹ️ Informations sur les Finales</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• <strong>Finale des Gagnants</strong> : 1er vs 2e place du groupe</p>
            <p>• <strong>Finale des Perdants</strong> : 3e vs 4e place du groupe</p>
            <p>• Les gagnants de chaque finale sont qualifiés pour des brackets séparés</p>
            <p>• Les finales se génèrent automatiquement après les matchs de groupe</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 