import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Database, 
  Palette,
  Trophy,
  Users,
  Download,
  Upload,
  Trash2,
  Save,
  RefreshCw,
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  Target,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { useTournaments, useTeams, useMatches } from '../hooks/useApi';
import { MatchStatus } from '../types/api';

interface ClubSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  description: string;
}

interface GameSettings {
  defaultMatchScore: number;
  matchTimeLimit: number;
  qualificationRatio: number;
  groupSize: number;
  enableTimers: boolean;
  enableScoreValidation: boolean;
}

interface NotificationSettings {
  emailNotifications: boolean;
  matchReminders: boolean;
  tournamentUpdates: boolean;
  resultsNotifications: boolean;
  systemAlerts: boolean;
}

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Récupération des données réelles
  const { data: tournaments = [], isLoading: tournamentsLoading } = useTournaments();
  const { data: teams = [], isLoading: teamsLoading } = useTeams();
  const { data: matches = [], isLoading: matchesLoading } = useMatches();

  const isLoading = tournamentsLoading || teamsLoading || matchesLoading;

  // Calcul des statistiques dynamiques
  const systemStats = {
    totalTournaments: tournaments.length,
    totalTeams: teams.length,
    totalMatches: matches.length,
    completedMatches: matches.filter(m => m.status === MatchStatus.COMPLETED).length,
    activeTournaments: tournaments.filter(t => t.status === 'ONGOING').length,
    lastUpdate: new Date().toLocaleDateString('fr-FR')
  };
  
  // États pour les différents paramètres
  const [clubSettings, setClubSettings] = useState<ClubSettings>({
    name: 'Club de Pétanque Municipal',
    address: '123 Avenue de la République, 75000 Paris',
    phone: '01 23 45 67 89',
    email: 'contact@petanque-club.fr',
    website: 'https://petanque-club.fr',
    description: 'Club de pétanque fondé en 1950, regroupant les passionnés de ce sport traditionnel.'
  });

  const [gameSettings, setGameSettings] = useState<GameSettings>({
    defaultMatchScore: 13,
    matchTimeLimit: 90,
    qualificationRatio: 0.5,
    groupSize: 4,
    enableTimers: true,
    enableScoreValidation: true
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    matchReminders: true,
    tournamentUpdates: true,
    resultsNotifications: false,
    systemAlerts: true
  });

  const [userProfile, setUserProfile] = useState({
    name: 'Administrateur',
    email: 'admin@petanque-club.fr',
    role: 'Président',
    phone: '06 12 34 56 78',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Chargement des paramètres depuis localStorage ou API
  useEffect(() => {
    // Charger les paramètres sauvegardés
    const savedClubSettings = localStorage.getItem('clubSettings');
    const savedGameSettings = localStorage.getItem('gameSettings');
    const savedNotifications = localStorage.getItem('notifications');
    const savedUserProfile = localStorage.getItem('userProfile');

    if (savedClubSettings) {
      setClubSettings(JSON.parse(savedClubSettings));
    }
    if (savedGameSettings) {
      setGameSettings(JSON.parse(savedGameSettings));
    }
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications));
    }
    if (savedUserProfile) {
      const profile = JSON.parse(savedUserProfile);
      setUserProfile(prev => ({ ...prev, ...profile, currentPassword: '', newPassword: '', confirmPassword: '' }));
    }
  }, []);

  const handleSaveSettings = async (section: string) => {
    setIsSaving(true);
    
    try {
      // Simulation de sauvegarde avec délai
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Sauvegarder dans localStorage (en production, utiliser une API)
      localStorage.setItem('clubSettings', JSON.stringify(clubSettings));
      localStorage.setItem('gameSettings', JSON.stringify(gameSettings));
      localStorage.setItem('notifications', JSON.stringify(notifications));
      localStorage.setItem('userProfile', JSON.stringify({
        name: userProfile.name,
        email: userProfile.email,
        role: userProfile.role,
        phone: userProfile.phone
      }));
      
      console.log(`Sauvegarde des paramètres: ${section}`, {
        clubSettings,
        gameSettings,
        notifications,
        userProfile: {
          name: userProfile.name,
          email: userProfile.email,
          role: userProfile.role,
          phone: userProfile.phone
        }
      });
      
      alert(`Paramètres ${section} sauvegardés avec succès !`);
    } catch {
      alert('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = () => {
    const data = {
      clubSettings,
      gameSettings,
      notifications,
      systemStats,
      tournaments: tournaments.map(t => ({ 
        id: t._id, 
        name: t.name, 
        type: t.type, 
        status: t.status,
        startDate: t.startDate 
      })),
      teams: teams.map(t => ({ 
        id: t._id, 
        name: t.name 
      })),
      exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `petanque-settings-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.clubSettings) setClubSettings(data.clubSettings);
        if (data.gameSettings) setGameSettings(data.gameSettings);
        if (data.notifications) setNotifications(data.notifications);
        alert('Paramètres importés avec succès !');
      } catch {
        alert('Erreur lors de l&apos;importation du fichier');
      }
    };
    reader.readAsText(file);
  };

  const handleResetSettings = () => {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres ?')) {
      // Réinitialisation aux valeurs par défaut
      setClubSettings({
        name: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        description: ''
      });
      
      setGameSettings({
        defaultMatchScore: 13,
        matchTimeLimit: 90,
        qualificationRatio: 0.5,
        groupSize: 4,
        enableTimers: true,
        enableScoreValidation: true
      });
      
      setNotifications({
        emailNotifications: true,
        matchReminders: true,
        tournamentUpdates: true,
        resultsNotifications: false,
        systemAlerts: true
      });

      // Supprimer du localStorage
      localStorage.removeItem('clubSettings');
      localStorage.removeItem('gameSettings');
      localStorage.removeItem('notifications');
      localStorage.removeItem('userProfile');
      
      alert('Paramètres réinitialisés !');
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Chargement des paramètres...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Paramètres
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configuration du club de pétanque
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportData}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Exporter
          </Button>
          
          <label className="cursor-pointer">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              asChild
            >
              <span>
                <Upload className="h-4 w-4" />
                Importer
              </span>
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
            />
          </label>
          
          <Button
            onClick={handleResetSettings}
            variant="outline"
            size="sm"
            className="gap-2 text-red-600 hover:text-red-700"
          >
            <RefreshCw className="h-4 w-4" />
            Réinitialiser
          </Button>
        </div>
      </div>

      {/* Onglets de paramètres */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="game">Jeu</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="system">Système</TabsTrigger>
        </TabsList>

        {/* Paramètres généraux */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Informations du club
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clubName">Nom du club</Label>
                  <Input
                    id="clubName"
                    value={clubSettings.name}
                    onChange={(e) => setClubSettings({...clubSettings, name: e.target.value})}
                    placeholder="Nom du club"
                  />
                </div>
                
                <div>
                  <Label htmlFor="clubEmail">Email</Label>
                  <Input
                    id="clubEmail"
                    type="email"
                    value={clubSettings.email}
                    onChange={(e) => setClubSettings({...clubSettings, email: e.target.value})}
                    placeholder="contact@club.fr"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="clubAddress">Adresse</Label>
                <Input
                  id="clubAddress"
                  value={clubSettings.address}
                  onChange={(e) => setClubSettings({...clubSettings, address: e.target.value})}
                  placeholder="Adresse complète du club"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clubPhone">Téléphone</Label>
                  <Input
                    id="clubPhone"
                    value={clubSettings.phone}
                    onChange={(e) => setClubSettings({...clubSettings, phone: e.target.value})}
                    placeholder="01 23 45 67 89"
                  />
                </div>
                
                <div>
                  <Label htmlFor="clubWebsite">Site web</Label>
                  <Input
                    id="clubWebsite"
                    value={clubSettings.website}
                    onChange={(e) => setClubSettings({...clubSettings, website: e.target.value})}
                    placeholder="https://club.fr"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="clubDescription">Description</Label>
                <textarea
                  id="clubDescription"
                  value={clubSettings.description}
                  onChange={(e) => setClubSettings({...clubSettings, description: e.target.value})}
                  placeholder="Description du club..."
                  className="w-full min-h-20 px-3 py-2 border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <Button 
                onClick={() => handleSaveSettings('généraux')}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Sauvegarder
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paramètres de jeu */}
        <TabsContent value="game" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Règles de jeu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="defaultScore">Score par défaut</Label>
                  <Input
                    id="defaultScore"
                    type="number"
                    min="1"
                    max="21"
                    value={gameSettings.defaultMatchScore}
                    onChange={(e) => setGameSettings({...gameSettings, defaultMatchScore: parseInt(e.target.value)})}
                  />
                  <p className="text-xs text-gray-500 mt-1">Score à atteindre pour gagner un match</p>
                </div>
                
                <div>
                  <Label htmlFor="timeLimit">Limite de temps (minutes)</Label>
                  <Input
                    id="timeLimit"
                    type="number"
                    min="30"
                    max="180"
                    value={gameSettings.matchTimeLimit}
                    onChange={(e) => setGameSettings({...gameSettings, matchTimeLimit: parseInt(e.target.value)})}
                  />
                  <p className="text-xs text-gray-500 mt-1">Durée maximale d&apos;un match</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="groupSize">Taille des groupes</Label>
                  <Input
                    id="groupSize"
                    type="number"
                    min="3"
                    max="8"
                    value={gameSettings.groupSize}
                    onChange={(e) => setGameSettings({...gameSettings, groupSize: parseInt(e.target.value)})}
                  />
                  <p className="text-xs text-gray-500 mt-1">Nombre d&apos;équipes par groupe</p>
                </div>
                
                <div>
                  <Label htmlFor="qualificationRatio">Ratio de qualification</Label>
                  <Input
                    id="qualificationRatio"
                    type="number"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={gameSettings.qualificationRatio}
                    onChange={(e) => setGameSettings({...gameSettings, qualificationRatio: parseFloat(e.target.value)})}
                  />
                  <p className="text-xs text-gray-500 mt-1">Pourcentage d&apos;équipes qualifiées par groupe</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <h4 className="font-medium">Options de jeu</h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enableTimers" className="font-normal">Minuteurs activés</Label>
                    <p className="text-xs text-gray-500">Afficher les minuteurs pendant les matchs</p>
                  </div>
                  <input
                    id="enableTimers"
                    type="checkbox"
                    checked={gameSettings.enableTimers}
                    onChange={(e) => setGameSettings({...gameSettings, enableTimers: e.target.checked})}
                    className="h-4 w-4"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enableScoreValidation" className="font-normal">Validation des scores</Label>
                    <p className="text-xs text-gray-500">Demander confirmation avant d&apos;enregistrer les scores</p>
                  </div>
                  <input
                    id="enableScoreValidation"
                    type="checkbox"
                    checked={gameSettings.enableScoreValidation}
                    onChange={(e) => setGameSettings({...gameSettings, enableScoreValidation: e.target.checked})}
                    className="h-4 w-4"
                  />
                </div>
              </div>
              
              <Button 
                onClick={() => handleSaveSettings('de jeu')}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Sauvegarder
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paramètres de notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-normal">Notifications par email</Label>
                    <p className="text-xs text-gray-500">Recevoir les notifications importantes par email</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.emailNotifications}
                    onChange={(e) => setNotifications({...notifications, emailNotifications: e.target.checked})}
                    className="h-4 w-4"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-normal">Rappels de matchs</Label>
                    <p className="text-xs text-gray-500">Rappels avant les matchs programmés</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.matchReminders}
                    onChange={(e) => setNotifications({...notifications, matchReminders: e.target.checked})}
                    className="h-4 w-4"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-normal">Mises à jour de tournois</Label>
                    <p className="text-xs text-gray-500">Notifications lors des changements de tournois</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.tournamentUpdates}
                    onChange={(e) => setNotifications({...notifications, tournamentUpdates: e.target.checked})}
                    className="h-4 w-4"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-normal">Notifications de résultats</Label>
                    <p className="text-xs text-gray-500">Être notifié des nouveaux résultats</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.resultsNotifications}
                    onChange={(e) => setNotifications({...notifications, resultsNotifications: e.target.checked})}
                    className="h-4 w-4"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-normal">Alertes système</Label>
                    <p className="text-xs text-gray-500">Notifications d&apos;erreurs et problèmes système</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.systemAlerts}
                    onChange={(e) => setNotifications({...notifications, systemAlerts: e.target.checked})}
                    className="h-4 w-4"
                  />
                </div>
              </div>
              
              <Button 
                onClick={() => handleSaveSettings('de notifications')}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Sauvegarder
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profil utilisateur */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profil utilisateur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="userName">Nom complet</Label>
                  <Input
                    id="userName"
                    value={userProfile.name}
                    onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                    placeholder="Nom complet"
                  />
                </div>
                
                <div>
                  <Label htmlFor="userEmail">Email</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    value={userProfile.email}
                    onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                    placeholder="email@exemple.fr"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="userRole">Rôle</Label>
                  <Input
                    id="userRole"
                    value={userProfile.role}
                    onChange={(e) => setUserProfile({...userProfile, role: e.target.value})}
                    placeholder="Président, Secrétaire, etc."
                  />
                </div>
                
                <div>
                  <Label htmlFor="userPhone">Téléphone</Label>
                  <Input
                    id="userPhone"
                    value={userProfile.phone}
                    onChange={(e) => setUserProfile({...userProfile, phone: e.target.value})}
                    placeholder="06 12 34 56 78"
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-medium">Changer le mot de passe</h4>
                
                <div>
                  <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showPassword ? "text" : "password"}
                      value={userProfile.currentPassword}
                      onChange={(e) => setUserProfile({...userProfile, currentPassword: e.target.value})}
                      placeholder="Mot de passe actuel"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={userProfile.newPassword}
                      onChange={(e) => setUserProfile({...userProfile, newPassword: e.target.value})}
                      placeholder="Nouveau mot de passe"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={userProfile.confirmPassword}
                      onChange={(e) => setUserProfile({...userProfile, confirmPassword: e.target.value})}
                      placeholder="Confirmer le mot de passe"
                    />
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={() => handleSaveSettings('de profil')}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Sauvegarder
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paramètres système */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Système et données
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4 text-center">
                    <Trophy className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-700">{systemStats.totalTournaments}</p>
                    <p className="text-sm text-blue-600">Tournois créés</p>
                    {systemStats.activeTournaments > 0 && (
                      <p className="text-xs text-blue-500 mt-1">{systemStats.activeTournaments} en cours</p>
                    )}
                  </CardContent>
                </Card>
                
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4 text-center">
                    <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-700">{systemStats.totalTeams}</p>
                    <p className="text-sm text-green-600">Équipes inscrites</p>
                  </CardContent>
                </Card>
                
                <Card className="border-purple-200 bg-purple-50">
                  <CardContent className="p-4 text-center">
                    <Target className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-purple-700">{systemStats.totalMatches}</p>
                    <p className="text-sm text-purple-600">Matchs total</p>
                    {systemStats.completedMatches > 0 && (
                      <p className="text-xs text-purple-500 mt-1">{systemStats.completedMatches} terminés</p>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Actions système
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    onClick={handleExportData}
                    variant="outline" 
                    className="gap-2 justify-start"
                  >
                    <Download className="h-4 w-4" />
                    Exporter toutes les données
                  </Button>
                  
                  <label className="cursor-pointer">
                    <Button 
                      variant="outline" 
                      className="gap-2 justify-start w-full"
                      asChild
                    >
                      <span>
                        <Upload className="h-4 w-4" />
                        Importer des données
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportData}
                      className="hidden"
                    />
                  </label>
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <h5 className="font-medium text-red-800">Zone dangereuse</h5>
                      <p className="text-sm text-red-600 mb-3">
                        Ces actions sont irréversibles. Assurez-vous d&apos;avoir une sauvegarde avant de continuer.
                      </p>
                      
                      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="gap-2 border-red-300 text-red-700 hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                            Supprimer toutes les données
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-red-600">
                              <AlertTriangle className="h-5 w-5" />
                              Supprimer toutes les données
                            </DialogTitle>
                            <DialogDescription>
                              Cette action supprimera définitivement tous les tournois, équipes, matchs et paramètres.
                              Cette action ne peut pas être annulée.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                              Annuler
                            </Button>
                            <Button 
                              variant="destructive" 
                              onClick={() => {
                                // Ici, vous ajouteriez la logique de suppression
                                alert('Fonctionnalité de suppression non implémentée pour des raisons de sécurité');
                                setShowDeleteDialog(false);
                              }}
                            >
                              Supprimer définitivement
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Informations système
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Version de l&apos;application</p>
                  <p className="font-medium">v2.1.0</p>
                </div>
                <div>
                  <p className="text-gray-600">Dernière mise à jour</p>
                  <p className="font-medium">{systemStats.lastUpdate}</p>
                </div>
                <div>
                  <p className="text-gray-600">Base de données</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                      <Check className="h-3 w-3 mr-1" />
                      Connectée
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600">Statut du système</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                      <Check className="h-3 w-3 mr-1" />
                      Opérationnel
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);
  
  if (!session) {
    return {
      redirect: {
        destination: '/auth',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};

export default SettingsPage;
