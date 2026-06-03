# Messenger avec Pusher

## Configuration pour Render

1. **Créez un compte sur [Pusher](https://pusher.com/)**
2. **Créez une nouvelle app Pusher** et notez vos clés
3. **Modifiez le fichier `script.js`** :
   - Remplacez `VOTRE_PUSHER_APP_KEY` par votre clé
   - Remplacez `VOTRE_PUSHER_CLUSTER` par votre cluster (ex: "mt1")

## Déploiement sur Render

1. **Poussez ce code sur GitHub**
2. **Connectez-vous à [Render](https://render.com)**
3. **Cliquez sur "New +" puis "Static Site"**
4. **Connectez votre dépôt GitHub**
5. **Configurez** :
   - Name: `votre-messenger`
   - Build Command: `# (laisser vide)`
   - Publish Directory: `.` (point)
6. **Cliquez sur "Create Static Site"**

## Utilisation

1. Ouvrez le site dans plusieurs onglets
2. Connectez-vous avec différents noms
3. Commencez à discuter en temps réel !

## Technologies utilisées
- HTML5/CSS3
- JavaScript pur
- Pusher pour le temps réel
- LocalStorage pour la persistance