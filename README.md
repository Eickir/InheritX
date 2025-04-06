# 🧾 InheritX - dApp de Gestion de Testaments Numériques via la Blockchain

**InheritX** est une application décentralisée (dApp) permettant la gestion, la validation et la certification de testaments numériques sous forme de tokens non-transférables (**Soulbound Tokens - SBT**), grâce à un système sécurisé de validateurs et à l'intégration avec Uniswap pour la gestion des liquidités.

## 🚀 Fonctionnalités principales

### ✅ Pour les utilisateurs (testateurs)
- Déposer un testament chiffré (CID IPFS + clé de déchiffrement).
- Payer le dépôt avec le token INHX (qu'ils auront préalablement swappés)
- une fois le testament validé par un validateur du réseau, ils obtiennent un SBT

### 🔐 Pour les validateurs
- Staker des tokens INHX pour rejoindre le pool de validateurs
- Valider ou rejeter les testaments déposés.
- Retire les tokens stakés pour ne plus faire partie du réseau

### 🧪 Pour l’admin (owner)
- Gérer le staking minimum.
- Mettre à jour l’URI des métadonnées IPFS.
- Ajouter de la liquidité ou approuver des tokens via Uniswap.

### 🔁 Intégration avec Uniswap V2
- Ajout de liquidité via Uniswap.
- Swaps ERC20 (M-USDT ↔ INHX) pour utiliser les services de la DApp

---

## 🧩 Architecture des Smart Contracts

### `TestamentManager.sol`
- Gère les dépôts, validations, rejets et mint de SBT.
- Communication avec `ValidatorPool` pour vérifier l’autorisation des validateurs.

### `ValidatorPool.sol`
- Permet aux utilisateurs de staker des tokens pour devenir validateurs.
- Fournit une fonction `isAuthorized(address)` utilisée par `TestamentManager`.

### `InheritXLiquidityPool.sol`
- Permet l’interaction avec Uniswap V2.
- Swaps directs de tokens.

---

## 🛠️ Technologies

- Solidity (smart contracts)
- OpenZeppelin (Ownable, ReentrancyGuard, ERC721, ERC20 interfaces)
- Uniswap V2 (Router, Factory, Pair)
- IPFS (stockage des testaments)
- SBT
- Hardhat 

---
