import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import dbConnect from '@/lib/mongoose'
import Tournament from '@/models/Tournament'
import { z } from 'zod'

const updateTournamentSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Le nom ne peut pas dépasser 100 caractères').optional(),
  description: z.string().min(1, 'La description est requise').max(500, 'La description ne peut pas dépasser 500 caractères').optional(),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Date de début invalide').optional(),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Date de fin invalide').optional(),
  maxParticipants: z.number().min(2, 'Il faut au moins 2 participants').max(64, 'Maximum 64 participants').optional(),
  location: z.string().min(1, 'Le lieu est requis').optional(),
  entryFee: z.number().min(0, 'Les frais ne peuvent pas être négatifs').optional(),
  prize: z.string().optional(),
  status: z.enum(['upcoming', 'ongoing', 'completed', 'cancelled']).optional()
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req })

  if (!session || !session.user) {
    return res.status(401).json({ error: 'Non autorisé' })
  }

  await dbConnect()

  const { id } = req.query

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID de tournoi invalide' })
  }

  if (req.method === 'GET') {
    try {
      const tournament = await Tournament.findById(id)
        .populate('createdBy', 'name email')

      if (!tournament) {
        return res.status(404).json({ error: 'Tournoi non trouvé' })
      }

      return res.status(200).json(tournament)
    } catch (error) {
      console.error('Erreur lors de la récupération du tournoi:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  if (req.method === 'PUT') {
    try {
      const tournament = await Tournament.findById(id)

      if (!tournament) {
        return res.status(404).json({ error: 'Tournoi non trouvé' })
      }

      if (tournament.createdBy.toString() !== session.user.email) {
        return res.status(403).json({ error: 'Non autorisé à modifier ce tournoi' })
      }

      const validatedData = updateTournamentSchema.parse(req.body)

      const updatedTournament = await Tournament.findByIdAndUpdate(
        id,
        validatedData,
        { new: true, runValidators: true }
      ).populate('createdBy', 'name email')

      return res.status(200).json(updatedTournament)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Données invalides', 
          details: error.errors 
        })
      }

      console.error('Erreur lors de la mise à jour du tournoi:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const tournament = await Tournament.findById(id)

      if (!tournament) {
        return res.status(404).json({ error: 'Tournoi non trouvé' })
      }

      if (tournament.createdBy.toString() !== session.user.email) {
        return res.status(403).json({ error: 'Non autorisé à supprimer ce tournoi' })
      }

      if (tournament.status === 'ongoing' || tournament.status === 'completed') {
        return res.status(400).json({ error: 'Impossible de supprimer un tournoi en cours ou terminé' })
      }

      await Tournament.findByIdAndDelete(id)

      return res.status(200).json({ message: 'Tournoi supprimé avec succès' })
    } catch (error) {
      console.error('Erreur lors de la suppression du tournoi:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).json({ error: 'Méthode non autorisée' })
}
