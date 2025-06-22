# Configuration MongoDB et NextAuth

## Prérequis
MONGODB_URI=mongodb://localhost:27017/petanque- Node.js et npm/yarn installés
- MongoDB installé localement ou accès à MongoDB Atlas
- Comptes développeur Google et GitHub (pour OAuth)

## Variables d'environnement

Créez un fichier `.env.local` à la racine du projet avec les variables suivantes :

```bash
# Configuration NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=votre-secret-super-securise-ici

# Configuration MongoDB

# Ou pour MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/petanque?retryWrites=true&w=majority

# Configuration Google OAuth
GOOGLE_CLIENT_ID=votre-google-client-id
GOOGLE_CLIENT_SECRET=votre-google-client-secret

# Configuration GitHub OAuth
GITHUB_ID=votre-github-id
GITHUB_SECRET=votre-github-secret
```

## Configuration OAuth

### Google OAuth
1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Activez l'API Google+ 
4. Créez des identifiants OAuth 2.0
5. Ajoutez `http://localhost:3000/api/auth/callback/google` aux URLs de redirection

### GitHub OAuth
1. Allez sur [GitHub Developer Settings](https://github.com/settings/developers)
2. Créez une nouvelle OAuth App
3. Définissez l'URL de callback : `http://localhost:3000/api/auth/callback/github`

## Lancement du projet

```bash
# Installer les dépendances (déjà fait)
yarn install

# Lancer le serveur de développement
yarn dev
```

## Fonctionnalités implémentées

✅ Configuration MongoDB avec connexion singleton  
✅ NextAuth avec adaptateur MongoDB  
✅ Authentification Google et GitHub  
✅ Gestion des sessions avec base de données  
✅ Interface utilisateur pour l'authentification  
✅ Types TypeScript pour NextAuth  

## Structure des fichiers

- `src/lib/mongodb.ts` - Configuration de la connexion MongoDB
- `src/pages/api/auth/[...nextauth].ts` - Configuration NextAuth
- `src/types/next-auth.d.ts` - Types TypeScript pour NextAuth
- `src/pages/_app.tsx` - Provider de session
- `src/pages/index.tsx` - Exemple d'utilisation

## Base de données

NextAuth créera automatiquement les collections suivantes dans MongoDB :
- `users` - Informations des utilisateurs
- `accounts` - Comptes liés (Google, GitHub, etc.)
- `sessions` - Sessions actives
- `verification_tokens` - Tokens de vérification

## Sécurité

- Assurez-vous de générer un `NEXTAUTH_SECRET` fort pour la production
- Utilisez HTTPS en production
- Configurez correctement les domaines autorisés pour OAuth 