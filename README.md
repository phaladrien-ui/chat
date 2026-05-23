Voici le README propre et simple, en français :

---

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

   Crée un fichier `.env` à la racine du projet avec :

   ```env
   DEEPSEEK_API_KEY=ta_clé_api_deepseek
   NUXT_SESSION_PASSWORD=un_mot_de_passe_long_d_au_moins_32_caracteres
   ```

   > Pour DeepSeek : crée un compte sur [platform.deepseek.com](https://platform.deepseek.com) et génère une clé API.
   >
   > Pour le mot de passe de session : invente une phrase longue (ex: `mon-super-chatbot-secret-123456789`).

5. **Créer la base de données**

   ```bash
   npx nuxt dev
   ```

   Le premier lancement crée automatiquement la base de données SQLite.

## Lancer le projet

```bash
npx nuxt dev
```

Ouvre `http://localhost:3000` dans ton navigateur.

## Authentification GitHub (optionnel)

Pour activer la connexion avec GitHub :

1. Va sur [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/developers)
2. Crée une nouvelle application avec l'URL de callback : `http://localhost:3000/auth/github/callback`
3. Ajoute dans le `.env` :

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

---
