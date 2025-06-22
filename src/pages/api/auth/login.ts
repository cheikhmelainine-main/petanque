import type { NextApiRequest, NextApiResponse } from 'next'
import connectDB from '@/lib/mongoose'
import User from '@/models/User'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis')
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' })
  }

  try {
    // Validation des données
    const { email, password } = loginSchema.parse(req.body)

    // Connexion à la base de données
    await connectDB()

    // Trouver l'utilisateur par email
    const user = await User.findOne({ email })

    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' })
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password)

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' })
    }

    // Retourner l'utilisateur sans le mot de passe
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt
    }

    res.status(200).json({
      message: 'Connexion réussie',
      user: userResponse
    })

  } catch (error) {
    console.error('Erreur lors de la connexion:', error)
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: error.issues.map(issue => issue.message)
      })
    }

    res.status(500).json({ message: 'Erreur serveur interne' })
  }
} 