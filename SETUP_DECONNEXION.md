# Configuration de la Déconnexion

## Problème résolu

✅ **Bouton de déconnexion fonctionnel ajouté dans :**
- Sidebar gauche (Navigation.tsx)
- Menu utilisateur en haut à droite (Navbar.tsx)

## Fonctionnalités ajoutées

### 1. Navigation Sidebar
- Affichage des informations utilisateur connecté
- Bouton de déconnexion avec style rouge au survol
- Gestion d'erreur avec fallback

### 2. Navbar (en haut)
- Menu déroulant utilisateur avec avatar
- Informations de session (nom et email)
- Liens vers Paramètres et Déconnexion
- Menu responsive (masqué sur mobile)

## Configuration requise

### Variables d'environnement
Créez un fichier `.env.local` à la racine du projet :

```bash
# NextAuth.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=votre-clé-secrète-ici

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/petanque

# Optionnel - OAuth providers
GOOGLE_CLIENT_ID=votre-google-client-id
GOOGLE_CLIENT_SECRET=votre-google-client-secret
GITHUB_ID=votre-github-id
GITHUB_SECRET=votre-github-secret
```

### Générer une clé secrète
```bash
openssl rand -base64 32
```

## Résolution du problème "Non autorisé"

Le problème 401 vient du fait que NextAuth ne peut pas s'initialiser sans les variables d'environnement. Après avoir créé `.env.local` :

1. Redémarrez le serveur de développement
2. La session sera correctement gérée
3. Les données dynamiques s'afficheront

## Fonctionnement

### Déconnexion
```javascript
const handleSignOut = async () => {
  try {
    await signOut({ 
      callbackUrl: '/auth',
      redirect: true 
    });
  } catch (error) {
    // Fallback vers redirection manuelle
    router.push('/auth');
  }
};
```

### Affichage conditionnel
- Si connecté : menu utilisateur complet
- Si déconnecté : bouton "Se connecter"

## Test

1. Connectez-vous via `/auth`
2. Vérifiez l'affichage du nom/email dans la sidebar et navbar
3. Testez la déconnexion depuis les deux endroits
4. Vérifiez la redirection vers `/auth`

La déconnexion fonctionne maintenant correctement avec NextAuth ! 🎉 