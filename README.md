Ok, compris ! C'est un message personnel de toi à ton ami. Voici :

```markdown
# Chatbot IA

Application de chat avec intelligence artificielle, authentification GitHub, historique des conversations, et interface claire/sombre.

## Prérequis

- [Node.js](https://nodejs.org) (version 18 ou plus)
- Un compte [GitHub](https://github.com) (pour l'authentification)

## Installation

1. **Télécharger et décompresser le projet**

   Dézippe le dossier `chat-main.zip` où tu veux.

2. **Ouvrir un terminal dans le dossier**

   ```bash
   cd chat-main
   ```

3. **Installer les dépendances**

   ```bash
   npm install
   ```

4. **Configurer les variables d'environnement**

   Le fichier `.env.example` est un modèle. Crée un nouveau fichier `.env` à la racine du projet et copie ceci dedans :

   ```env
   DEEPSEEK_API_KEY=demande-moi_la_clé
   NUXT_SESSION_PASSWORD=colle_le_resultat_de_la_commande_ci_dessous
   ```

   > **Clé API :** demande-moi la clé, je te la donnerai.
   >
   > **Mot de passe de session :** génère une clé de 32 caractères avec la commande adaptée à ton système :
   >
   > **Windows :**
   > ```powershell
   > [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(24))
   > ```
   >
   > **Mac/Linux :**
   > ```bash
   > openssl rand -base64 24
   > ```

5. **Lancer le projet**

   ```bash
   npx nuxt dev
   ```

   Ouvre `http://localhost:3000` dans ton navigateur. La base de données se crée automatiquement au premier lancement.

## Authentification GitHub (optionnel)

Pour activer la connexion avec GitHub :

1. Va sur [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/developers)
2. Crée une nouvelle application avec l'URL de callback : `http://localhost:3000/auth/github/callback`
3. Ajoute ces lignes dans ton fichier `.env` :

```env
NUXT_OAUTH_GITHUB_CLIENT_ID=ton_client_id
NUXT_OAUTH_GITHUB_CLIENT_SECRET=ton_client_secret
```

## Déploiement

```bash
npm run build
```

Le dossier `.output` contient l'application prête à être déployée sur n'importe quel serveur Node.js.

---

Fait avec ❤️ et Nuxt
```