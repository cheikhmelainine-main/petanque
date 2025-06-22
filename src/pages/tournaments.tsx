import { useState, useEffect } from 'react'
import { GetServerSideProps } from 'next'
import { getSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit, Trash2, Trophy, Users, MapPin, Euro, Calendar, Clock } from 'lucide-react'
import { toast } from 'react-hot-toast'

// Badge simple sans import
const Badge = ({ children, variant = 'default', className = '' }: { 
  children: React.ReactNode
  variant?: 'default' | 'secondary' | 'destructive'
  className?: string 
}) => {
  const variants = {
    default: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    secondary: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    destructive: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  }
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}

interface Tournament {
  _id: string
  name: string
  description: string
  startDate: string
  endDate: string
  maxParticipants: number
  currentParticipants: number
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
  location: string
  entryFee: number
  prize: string
  createdBy: {
    name: string
    email: string
  }
  createdAt: string
}

interface TournamentFormData {
  name: string
  description: string
  startDate: string
  endDate: string
  maxParticipants: number
  location: string
  entryFee: number
  prize: string
}

const initialFormData: TournamentFormData = {
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  maxParticipants: 16,
  location: '',
  entryFee: 0,
  prize: ''
}

const statusConfig = {
  upcoming: { 
    label: 'À venir', 
    variant: 'default' as const,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
  },
  ongoing: { 
    label: 'En cours', 
    variant: 'default' as const,
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
  },
  completed: { 
    label: 'Terminé', 
    variant: 'secondary' as const,
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
  },
  cancelled: { 
    label: 'Annulé', 
    variant: 'destructive' as const,
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  }
}

export default function Tournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<TournamentFormData>(initialFormData)
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchTournaments()
  }, [])

  const fetchTournaments = async () => {
    try {
      const response = await fetch('/api/tournaments')
      if (response.ok) {
        const data = await response.json()
        setTournaments(data)
      } else {
        toast.error('Erreur lors du chargement des tournois')
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des tournois')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const url = editingTournament 
        ? `/api/tournaments/${editingTournament._id}`
        : '/api/tournaments'
      
      const method = editingTournament ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success(editingTournament ? 'Tournoi modifié avec succès' : 'Tournoi créé avec succès')
        setIsDialogOpen(false)
        setFormData(initialFormData)
        setEditingTournament(null)
        fetchTournaments()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erreur lors de la sauvegarde')
      }
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (tournament: Tournament) => {
    setEditingTournament(tournament)
    setFormData({
      name: tournament.name,
      description: tournament.description,
      startDate: tournament.startDate.split('T')[0],
      endDate: tournament.endDate.split('T')[0],
      maxParticipants: tournament.maxParticipants,
      location: tournament.location,
      entryFee: tournament.entryFee,
      prize: tournament.prize
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (tournament: Tournament) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce tournoi ?')) {
      return
    }

    try {
      const response = await fetch(`/api/tournaments/${tournament._id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Tournoi supprimé avec succès')
        fetchTournaments()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const resetForm = () => {
    setFormData(initialFormData)
    setEditingTournament(null)
    setIsDialogOpen(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement des tournois...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Tournois</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Gérez les tournois de votre club de pétanque
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau tournoi
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-[425px] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-lg">
                {editingTournament ? 'Modifier le tournoi' : 'Créer un tournoi'}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {editingTournament 
                  ? 'Modifiez les informations du tournoi'
                  : 'Créez un nouveau tournoi pour votre club'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">Nom du tournoi</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Championnat d'été 2024"
                    className="w-full"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description du tournoi..."
                    className="min-h-[60px] w-full resize-none"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-medium">Lieu</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Boulodrome municipal"
                    className="w-full"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-sm font-medium">Date début</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate" className="text-sm font-medium">Date fin</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxParticipants" className="text-sm font-medium">Participants max</Label>
                    <Input
                      id="maxParticipants"
                      type="number"
                      min="2"
                      max="64"
                      value={formData.maxParticipants}
                      onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) })}
                      className="w-full"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="entryFee" className="text-sm font-medium">Frais (€)</Label>
                    <Input
                      id="entryFee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.entryFee}
                      onChange={(e) => setFormData({ ...formData, entryFee: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="prize" className="text-sm font-medium">Prix / Récompense</Label>
                  <Input
                    id="prize"
                    value={formData.prize}
                    onChange={(e) => setFormData({ ...formData, prize: e.target.value })}
                    placeholder="Trophée, argent, etc."
                    className="w-full"
                  />
                </div>
              </div>
              
              <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto">
                  Annuler
                </Button>
                <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                  {submitting ? 'Sauvegarde...' : editingTournament ? 'Modifier' : 'Créer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-blue-900 dark:text-blue-100">Total</CardTitle>
            <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-blue-900 dark:text-blue-100">{tournaments.length}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-green-900 dark:text-green-100">En cours</CardTitle>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-green-900 dark:text-green-100">
              {tournaments.filter(t => t.status === 'ongoing').length}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-purple-900 dark:text-purple-100">À venir</CardTitle>
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-purple-900 dark:text-purple-100">
              {tournaments.filter(t => t.status === 'upcoming').length}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-orange-900 dark:text-orange-100">Terminés</CardTitle>
            <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-orange-900 dark:text-orange-100">
              {tournaments.filter(t => t.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tournaments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-primary" />
            Liste des tournois
          </CardTitle>
          <CardDescription className="text-sm">
            Tous les tournois de votre club
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {tournaments.length === 0 ? (
            <div className="text-center py-8 sm:py-12 px-4">
              <Trophy className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">Aucun tournoi</h3>
              <p className="text-muted-foreground mb-4 sm:mb-6 text-sm">
                Créez votre premier tournoi pour commencer
              </p>
              <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Créer un tournoi
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Tournoi</TableHead>
                    <TableHead className="hidden sm:table-cell">Lieu</TableHead>
                    <TableHead className="hidden md:table-cell">Dates</TableHead>
                    <TableHead className="hidden lg:table-cell">Participants</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="hidden sm:table-cell">Frais</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tournaments.map((tournament) => (
                    <TableRow key={tournament._id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-semibold text-sm sm:text-base">{tournament.name}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                            {tournament.description}
                          </div>
                          {/* Mobile info */}
                          <div className="sm:hidden space-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {tournament.location}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {tournament.currentParticipants}/{tournament.maxParticipants}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {tournament.location}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-sm space-y-1">
                          <div>Du {formatDate(tournament.startDate)}</div>
                          <div>Au {formatDate(tournament.endDate)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{tournament.currentParticipants}</span>
                          <span className="text-muted-foreground">/ {tournament.maxParticipants}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={statusConfig[tournament.status].variant}
                          className={statusConfig[tournament.status].color}
                        >
                          {statusConfig[tournament.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1 text-sm">
                          <Euro className="h-4 w-4 text-muted-foreground" />
                          {tournament.entryFee}€
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(tournament)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(tournament)}
                            disabled={tournament.status === 'ongoing' || tournament.status === 'completed'}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context)

  if (!session) {
    return {
      redirect: {
        destination: '/auth',
        permanent: false,
      },
    }
  }

  return {
    props: {
      session,
    },
  }
}
