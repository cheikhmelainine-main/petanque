import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { useCreateTeam, useTournaments } from '@/hooks/useApi';
import toast from 'react-hot-toast';

interface ImportTeamsFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId?: string;
}

interface TeamData {
  name: string;
  members: string[];
  isValid: boolean;
  errors: string[];
}

const ImportTeamsForm: React.FC<ImportTeamsFormProps> = ({
  open,
  onOpenChange,
  tournamentId
}) => {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>(tournamentId || '');
  
  const createTeam = useCreateTeam();
  const { data: tournaments = [] } = useTournaments();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const processedTeams = processExcelData(jsonData as string[][]);
        setTeams(processedTeams);
        setStep('preview');
      } catch (error) {
        console.error('Erreur lors de la lecture du fichier:', error);
        toast.error('Erreur lors de la lecture du fichier Excel');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsBinaryString(file);
  }, []);

  const processExcelData = (data: string[][]): TeamData[] => {
    const teams: TeamData[] = [];
    
    // Ignorer la première ligne (en-têtes)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      const teamName = row[0]?.toString().trim();
      if (!teamName) continue;

      const members: string[] = [];
      const errors: string[] = [];

      // Récupérer les membres (colonnes 1 à 3)
      for (let j = 1; j <= 3; j++) {
        const member = row[j]?.toString().trim();
        if (member) {
          members.push(member);
        }
      }

      // Validation
      if (!teamName) {
        errors.push('Nom d\'équipe manquant');
      }
      if (members.length < 1) {
        errors.push('Au moins 1 joueur requis');
      }
      if (members.length > 3) {
        errors.push('Maximum 3 joueurs par équipe');
      }

      teams.push({
        name: teamName,
        members,
        isValid: errors.length === 0,
        errors
      });
    }

    return teams;
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: false,
    disabled: isProcessing
  });

  const handleImport = async () => {
    const validTeams = teams.filter(team => team.isValid);
    if (validTeams.length === 0) {
      toast.error('Aucune équipe valide à importer');
      return;
    }

    // Vérifier qu'un tournamentId est fourni si nécessaire
    const finalTournamentId = tournamentId || selectedTournamentId;
    if (!finalTournamentId) {
      toast.error('Aucun tournoi sélectionné pour l\'import');
      return;
    }

    setStep('importing');
    let successCount = 0;
    let errorCount = 0;

    for (const team of validTeams) {
      try {
        await createTeam.mutateAsync({
          name: team.name,
          memberNames: team.members,
          tournamentId: finalTournamentId
        });
        successCount++;
      } catch (error: unknown) {
        errorCount++;
        console.error(`Erreur lors de la création de l'équipe ${team.name}:`, error);
        
        // Afficher l'erreur spécifique si disponible
        const errorMessage = (error as any)?.response?.data?.message || (error as any)?.message || 'Erreur inconnue';
        console.error(`Détail erreur pour ${team.name}:`, errorMessage);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} équipe(s) importée(s) avec succès`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} équipe(s) n'ont pas pu être importées`);
    }
    
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setTeams([]);
    setStep('upload');
    setIsProcessing(false);
  };

  const downloadTemplate = () => {
    const templateData = [
      ['Nom Équipe', 'Joueur 1', 'Joueur 2', 'Joueur 3'],
      ['Les Boules d\'Or', 'Jean Dupont', 'Marie Martin', 'Pierre Durand'],
      ['Team Champions', 'Sophie Leroy', 'Michel Bernard', 'Anne Petit'],
      ['Les Pointeurs', 'Claude Roux', 'Sylvie Blanc', '']
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Équipes');
    XLSX.writeFile(wb, 'modele_equipes.xlsx');
  };

  const validTeamsCount = teams.filter(team => team.isValid).length;
  const invalidTeamsCount = teams.length - validTeamsCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Importer des équipes depuis Excel
          </DialogTitle>
          <DialogDescription>
            Importez plusieurs équipes en une fois depuis un fichier Excel (.xlsx, .xls) ou CSV
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Sélection du tournoi si pas déjà défini */}
              {!tournamentId && (
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">Sélectionner un tournoi :</h4>
                    <select
                      value={selectedTournamentId}
                      onChange={(e) => setSelectedTournamentId(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700"
                      required
                    >
                      <option value="">-- Choisir un tournoi --</option>
                      {tournaments.map(tournament => (
                        <option key={tournament._id} value={tournament._id}>
                          {tournament.name}
                        </option>
                      ))}
                    </select>
                  </CardContent>
                </Card>
              )}

              {/* Zone de téléchargement */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                {isDragActive ? (
                  <p className="text-blue-600 font-medium">Déposez le fichier ici...</p>
                ) : (
                  <div>
                    <p className="text-gray-600 dark:text-gray-300 mb-2">
                      Glissez-déposez un fichier Excel ici, ou cliquez pour sélectionner
                    </p>
                    <p className="text-sm text-gray-500">
                      Formats supportés: .xlsx, .xls, .csv
                    </p>
                  </div>
                )}
              </div>

              {/* Bouton pour télécharger le modèle */}
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Télécharger le modèle Excel
                </Button>
              </div>

              {/* Instructions */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Format attendu :</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <li>• Colonne A : Nom de l'équipe</li>
                    <li>• Colonne B : Joueur 1 (obligatoire)</li>
                    <li>• Colonne C : Joueur 2 (optionnel)</li>
                    <li>• Colonne D : Joueur 3 (optionnel)</li>
                    <li>• Maximum 3 joueurs par équipe</li>
                    <li>• Première ligne : En-têtes (ignorée)</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4 h-full flex flex-col">
              {/* Statistiques */}
              <div className="flex gap-4">
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {validTeamsCount} équipes valides
                </Badge>
                {invalidTeamsCount > 0 && (
                  <Badge variant="outline" className="text-red-600 border-red-600">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {invalidTeamsCount} équipes avec erreurs
                  </Badge>
                )}
              </div>

              {/* Tableau des équipes */}
              <div className="flex-1 overflow-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Statut</TableHead>
                      <TableHead>Nom de l'équipe</TableHead>
                      <TableHead>Joueurs</TableHead>
                      <TableHead>Erreurs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teams.map((team, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {team.isValid ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{team.name}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {team.members.map((member, idx) => (
                              <div key={idx} className="text-sm">
                                {member}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {team.errors.length > 0 && (
                            <div className="space-y-1">
                              {team.errors.map((error, idx) => (
                                <div key={idx} className="text-sm text-red-600">
                                  {error}
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-300">
                  Import en cours...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              if (step === 'preview') {
                resetForm();
              } else {
                onOpenChange(false);
              }
            }}
            disabled={step === 'importing'}
          >
            {step === 'preview' ? 'Retour' : 'Annuler'}
          </Button>

          {step === 'preview' && (
            <Button
              onClick={handleImport}
              disabled={validTeamsCount === 0 || step === 'importing'}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Importer {validTeamsCount} équipe(s)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportTeamsForm; 