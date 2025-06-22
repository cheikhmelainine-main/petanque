import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Trophy, Shield, Users, CheckCircle } from 'lucide-react';
import WinnersQualificationManager from './WinnersQualificationManager';
import LosersQualificationManager from './LosersQualificationManager';

interface SeparateQualificationManagerProps {
  tournamentId: string;
  onQualificationGenerated?: () => void;
}

export default function SeparateQualificationManager({ 
  tournamentId, 
  onQualificationGenerated 
}: SeparateQualificationManagerProps) {
  const [activeTab, setActiveTab] = useState('winners');

  return (
    <Card className="w-full">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Users className="h-5 w-5" />
          Gestion des Qualifications Séparées
        </CardTitle>
        <p className="text-sm text-blue-600 mt-1">
          Générez séparément les brackets des gagnants et des perdants
        </p>
      </CardHeader>
      
      <CardContent className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="winners" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Bracket des Gagnants
            </TabsTrigger>
            <TabsTrigger value="losers" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Bracket des Perdants
            </TabsTrigger>
          </TabsList>

          <TabsContent value="winners" className="space-y-4">
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">
                🏆 Bracket des Gagnants
              </h3>
              <p className="text-sm text-yellow-700">
                Les équipes qui ont gagné leurs finales de groupe s'affrontent dans ce bracket séparé.
                Seules les équipes gagnantes peuvent participer à ce bracket.
              </p>
            </div>
            
            <WinnersQualificationManager 
              tournamentId={tournamentId}
              onQualificationGenerated={onQualificationGenerated}
            />
          </TabsContent>

          <TabsContent value="losers" className="space-y-4">
            <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">
                🥉 Bracket des Perdants
              </h3>
              <p className="text-sm text-gray-700">
                Les équipes qui ont perdu leurs finales de groupe s'affrontent dans ce bracket séparé.
                Seules les équipes perdantes peuvent participer à ce bracket.
              </p>
            </div>
            
            <LosersQualificationManager 
              tournamentId={tournamentId}
              onQualificationGenerated={onQualificationGenerated}
            />
          </TabsContent>
        </Tabs>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">
            ℹ️ Informations importantes
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Les brackets sont <strong>complètement séparés</strong> - aucune équipe gagnante ne peut affronter une équipe perdante</li>
            <li>• Chaque bracket nécessite au moins <strong>4 équipes</strong> pour être généré</li>
            <li>• Les équipes du même groupe sont <strong>séparées</strong> dans les premiers tours</li>
            <li>• Vous pouvez générer les brackets <strong>indépendamment</strong> l'un de l'autre</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 