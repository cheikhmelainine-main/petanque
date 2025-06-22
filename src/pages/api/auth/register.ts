import type { NextApiRequest, NextApiResponse } from 'next'
import connectDB from '@/lib/mongoose'
import User from '@/models/User'
import { z } from 'zod'

const registerSchema = z.object({
  username: z.string().min(3, 'Username doit avoir au moins 3 caractères').max(20, 'Username ne peut pas dépasser 20 caractères'),
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit avoir au moins 6 caractères')
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' })
  }

  try {
    // Validation des données
    const { username, email, password } = registerSchema.parse(req.body)

    // Connexion à la base de données
    await connectDB()

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    })

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' })
      }
      if (existingUser.username === username) {
        return res.status(400).json({ message: 'Ce nom d\'utilisateur est déjà pris' })
      }
    }

    // Créer le nouvel utilisateur
    const user = new User({
      username,
      email,
      password
    })

    await user.save()

    // Retourner l'utilisateur sans le mot de passe
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt
    }

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: userResponse
    })

  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error)
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: error.issues.map(issue => issue.message)
      })
    }

    if ((error as any).code === 11000) {
      const field = Object.keys((error as any).keyPattern)[0]
      return res.status(400).json({
        message: `Ce ${field === 'email' ? 'email' : 'nom d\'utilisateur'} est déjà utilisé`
      })
    }

    res.status(500).json({ message: 'Erreur serveur interne' })
  }
} 