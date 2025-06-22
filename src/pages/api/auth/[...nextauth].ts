import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import { MongoDBAdapter } from '@next-auth/mongodb-adapter'
import { clientPromise } from '../../../lib/mongodb'
import connectDB from '../../../lib/mongoose'
import User from '../../../models/User'

export const authOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          await connectDB()
          const user = await User.findOne({ email: credentials.email })

          if (!user) {
            return null
          }

          const isPasswordValid = await user.comparePassword(credentials.password)

          if (!isPasswordValid) {
            return null
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.username,
          }
        } catch (error) {
          console.error('Erreur lors de l\'authentification:', error)
          return null
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 jours
    updateAge: 24 * 60 * 60, // 24 heures
  },
  callbacks: {
    async session({ session, token }) {
      // Ajouter l'ID utilisateur à la session depuis le token
      if (session?.user && token?.sub) {
        (session.user as any).id = token.sub
      }
      return session
    },
    async jwt({ token, user }) {
      // Persister l'ID utilisateur dans le token
      if (user) {
        token.sub = user.id
      }
      return token
    },
    async signIn() {
      // Vous pouvez ajouter une logique personnalisée ici
      return true
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  debug: process.env.NODE_ENV === 'development',
}

export default NextAuth(authOptions as any)
