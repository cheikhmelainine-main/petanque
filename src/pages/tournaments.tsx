import React, { useState } from 'react'
import { GetServerSideProps } from 'next'
import { getSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { 
  Trophy, 
  Plus, 
  Search,
  Calendar
} from 'lucide-react'

import TournamentCard from '../components/tournaments/TournamentCard'
import CreateTournamentForm from '../components/tournaments/CreateTournamentForm'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { useTournaments, useTeams, useStartTournament } from '../hooks/useApi'

const TournamentsPage: React.FC = () => {
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const { data: tournaments = [], isLoading } = useTournaments()
  const { data: allTeams = [] } = useTeams()
  const startTournament = useStartTournament()

  const filteredTournaments = tournaments.filter(tournament =>
    tournament.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getTeamCount = (tournamentId: string) => {
    return allTeams.filter(team => team.tournament === tournamentId).length
  }

  const handleStartTournament = (tournamentId: string) => {
    startTournament.mutate(tournamentId)
  }

  const activeTournaments = tournaments.filter(t => t.status === 'ONGOING')
  const upcomingTournaments = tournaments.filter(t => t.status === 'UPCOMING')
  const completedTournaments = tournaments.filter(t => t.status === 'COMPLETED')

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* En-tête compact */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">
            Tournois
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Gérez vos tournois de pétanque
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateFormOpen(true)} 
          size="sm"
          className="gap-2 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Nouveau
        </Button>
      </div>

      {/* Statistiques compactes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              </div>
              <div>
                <p className="text-lg font-semibold">{activeTournaments.length}</p>
                <p className="text-xs text-gray-500">En cours</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-6 w-6 text-blue-600" />
              <div>
                <p className="text-lg font-semibold">{upcomingTournaments.length}</p>
                <p className="text-xs text-gray-500">À venir</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-600" />
              <div>
                <p className="text-lg font-semibold">{completedTournaments.length}</p>
                <p className="text-xs text-gray-500">Terminés</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-bold text-xs">#</span>
              </div>
              <div>
                <p className="text-lg font-semibold">{tournaments.length}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barre de recherche compacte */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Rechercher un tournoi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-0 bg-gray-50 dark:bg-gray-800 h-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Liste des tournois */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      ) : filteredTournaments.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-base font-medium mb-2">
              {searchQuery ? 'Aucun tournoi trouvé' : 'Aucun tournoi'}
            </h3>
            <p className="text-sm text-gray-500 text-center mb-4">
              {searchQuery 
                ? 'Essayez de modifier votre recherche'
                : 'Commencez par créer votre premier tournoi'
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsCreateFormOpen(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Créer un tournoi
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTournaments.map((tournament, index) => (
            <motion.div
              key={tournament._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <TournamentCard
                tournament={tournament}
                teamCount={getTeamCount(tournament._id)}
                onStart={handleStartTournament}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Formulaire de création */}
      <CreateTournamentForm
        open={isCreateFormOpen}
        onOpenChange={setIsCreateFormOpen}
      />
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
    props: {},
  }
}

export default TournamentsPage 