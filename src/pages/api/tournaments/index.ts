import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import dbConnect from '@/lib/mongoose'
import Tournament from '@/models/Tournament'
import { z } from 'zod'

const createTournamentSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  description: z.string().min(1, 'La description est requise').max(500, 'La description ne peut pas dépasser 500 caractères'),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Date de début invalide'),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Date de fin invalide'),
  maxParticipants: z.number().min(2, 'Il faut au moins 2 participants').max(64, 'Maximum 64 participants'),
  location: z.string().min(1, 'Le lieu est requis'),
  entryFee: z.number().min(0, 'Les frais ne peuvent pas être négatifs').optional().default(0),
  prize: z.string().optional().default('')
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req })

  if (!session || !session.user) {
    return res.status(401).json({ error: 'Non autorisé' })
  }

  await dbConnect()

  if (req.method === 'GET') {
    try {
      const tournaments = await Tournament.find()
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })

      return res.status(200).json(tournaments)
    } catch (error) {
      console.error('Erreur lors de la récupération des tournois:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  if (req.method === 'POST') {
    try {
      const validatedData = createTournamentSchema.parse(req.body)

      // Vérifier que la date de fin est après la date de début
      const startDate = new Date(validatedData.startDate)
      const endDate = new Date(validatedData.endDate)

      if (endDate <= startDate) {
        return res.status(400).json({ error: 'La date de fin doit être après la date de début' })
      }

      const tournament = await Tournament.create({
        ...validatedData,
        startDate,
        endDate,
        createdBy: session.user.email // Utiliser l'email comme référence
      })

      const populatedTournament = await Tournament.findById(tournament._id)
        .populate('createdBy', 'name email')

      return res.status(201).json(populatedTournament)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Données invalides', 
          details: error.errors 
        })
      }

      console.error('Erreur lors de la création du tournoi:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).json({ error: 'Méthode non autorisée' })
}
