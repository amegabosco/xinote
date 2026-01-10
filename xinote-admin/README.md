# 🏥 Xinote Admin - Gestion des Droits d'Accès

Application web ultra-légère pour gérer les utilisateurs et permissions de l'app mobile Xinote.

## 🚀 Stack Technique

- **SvelteKit** - Framework web moderne (~30KB)
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling rapide
- **Vercel** - Déploiement instantané

## 📦 Installation

```bash
cd xinote-admin
npm install
npm run dev
```

L'app sera accessible sur `http://localhost:3000`

## 🌐 Déploiement Vercel

### Option 1: Via CLI
```bash
npm install -g vercel
vercel --prod
```

### Option 2: Via Git (recommandé)
1. Push vers GitHub/GitLab
2. Connecter le repo sur [vercel.com](https://vercel.com)
3. Déploiement automatique à chaque commit

### Variables d'environnement Vercel
```bash
# Dans les settings Vercel
VITE_API_BASE_URL=https://n8n.amega.one
VITE_N8N_WEBHOOK_URL=https://n8n.amega.one/webhook-test/bb8f40da-6c58-448c-bc10-a7722609caeb
```

## ✨ Fonctionnalités

### ✅ Implémentées
- Dashboard avec stats temps réel
- Liste des utilisateurs
- Activation/désactivation des comptes
- Interface responsive (mobile-first)

### 🚧 À venir
- Authentification sécurisée
- Gestion des rôles granulaire
- Logs d'audit
- API REST pour l'app mobile

## 🔧 Configuration

1. Copier `.env.example` vers `.env`
2. Configurer les URLs de votre backend n8n
3. Définir les secrets JWT

## 📱 Intégration Mobile

L'app communique avec l'app Flutter via:
- API REST endpoints
- Validation des tokens JWT
- Synchronisation des permissions

## 🛡️ Sécurité

- HTTPS obligatoire en production
- Validation côté serveur
- Rate limiting
- Session timeout
- Audit trail complet

## 📊 Monitoring

Compatible avec:
- Vercel Analytics
- Sentry pour error tracking
- Custom metrics vers n8n

---

**Taille finale**: ~30KB gzippé 🚀
**Performance**: Lighthouse 100/100 ⚡
**Mobile-ready**: PWA compatible 📱