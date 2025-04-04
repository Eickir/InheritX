const { assert, expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// Fixture principale : déploie les tokens, le pool et ajoute de la liquidité
async function deployContractsFixture() {
  const [owner, user] = await ethers.getSigners();

  // Déploiement des tokens
  const InhxTokenFactory = await ethers.getContractFactory("InhxToken");
  const inhxToken = await InhxTokenFactory.deploy();
  const MockUsdtTokenFactory = await ethers.getContractFactory("MockUsdtToken");
  const mockUsdtToken = await MockUsdtTokenFactory.deploy();

  // Déploiement du liquidity pool
  const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Uniswap V2 router
  const LiquidityPoolFactory = await ethers.getContractFactory("InheritXLiquidityPool");
  const pool = await LiquidityPoolFactory.deploy(inhxToken, mockUsdtToken, routerAddress);
  await pool.waitForDeployment();

  // Transfert de tokens au user pour les swaps
  await inhxToken.transfer(user.address, ethers.parseEther("100"));
  await mockUsdtToken.transfer(user.address, ethers.parseEther("100"));

  // Ajout de liquidité dans le pool
  const liquidityAmount = ethers.parseEther("1000");
  await inhxToken.transfer(pool.target, liquidityAmount);
  await mockUsdtToken.transfer(pool.target, liquidityAmount);
  await pool.approveRouter();
  await pool.connect(owner).addLiquidity(liquidityAmount, liquidityAmount, 0, 0);

  return { owner, user, inhxToken, mockUsdtToken, pool, routerAddress, liquidityAmount };
}

// Fixture pour tester le comportement quand la paire n'existe pas (aucune liquidité ajoutée)
async function deployNoLiquidityFixture() {
  const [owner, user] = await ethers.getSigners();

  const InhxTokenFactory = await ethers.getContractFactory("InhxToken");
  const token1 = await InhxTokenFactory.deploy();
  const MockUsdtTokenFactory = await ethers.getContractFactory("MockUsdtToken");
  const token2 = await MockUsdtTokenFactory.deploy();

  const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
  const LiquidityPoolFactory = await ethers.getContractFactory("InheritXLiquidityPool");
  const poolNoLiquidity = await LiquidityPoolFactory.deploy(token1, token2, routerAddress);
  await poolNoLiquidity.waitForDeployment();

  return { poolNoLiquidity };
}

// Fixture pour tester la gestion de l'ordre des tokens (tokens déployés dans l'ordre inverse)
async function deployReorderedTokensFixture() {
  const [owner, user] = await ethers.getSigners();

  // Ici, tokenA sera le MockUsdtToken et tokenB InhxToken
  const TokenAFactory = await ethers.getContractFactory("MockUsdtToken");
  const token1 = await TokenAFactory.deploy();
  const TokenBFactory = await ethers.getContractFactory("InhxToken");
  const token2 = await TokenBFactory.deploy();

  const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
  const LiquidityPoolFactory = await ethers.getContractFactory("InheritXLiquidityPool");
  const poolReordered = await LiquidityPoolFactory.deploy(token1, token2, routerAddress);

  // Ajout de liquidité pour ce pool
  const oneEther = ethers.parseEther("1");
  await token1.transfer(poolReordered.target, oneEther);
  await token2.transfer(poolReordered.target, oneEther);
  await poolReordered.approveRouter();
  await poolReordered.connect(owner).addLiquidity(oneEther, oneEther, 0, 0);

  return { poolReordered, oneEther, owner };
}

describe("InheritXLiquidityPool Tests with Real Uniswap Contracts", function () {

  describe("Access Control", function () {
    it("approveRouter should only be callable by the owner", async function () {
      const { pool, user } = await loadFixture(deployContractsFixture);
      await expect(pool.connect(user).approveRouter())
        .to.be.revertedWithCustomError(pool, "OwnableUnauthorizedAccount")
        .withArgs(user.address);
    });

    it("addLiquidity should only be callable by the owner", async function () {
      const { pool, user } = await loadFixture(deployContractsFixture);
      const oneEther = ethers.parseEther("1");
      await expect(pool.connect(user).addLiquidity(oneEther, oneEther, 0, 0))
        .to.be.revertedWithCustomError(pool, "OwnableUnauthorizedAccount")
        .withArgs(user.address);
    });

    it("addLiquidity should revert if amountADesired is 0", async function () {
      const { pool } = await loadFixture(deployContractsFixture);
      const oneEther = ethers.parseEther("1");
      await expect(pool.addLiquidity(0, oneEther, 0, 0)).to.be.reverted;
    });
  });

  describe("approveRouter", function () {
    it("should approve the router for tokenA and tokenB", async function () {
      const { pool, inhxToken, mockUsdtToken, routerAddress } = await loadFixture(deployContractsFixture);
      
      // Appel de approveRouter
      await pool.approveRouter();

      // Récupération des soldes du pool
      const balanceA = await inhxToken.balanceOf(pool.target);
      const balanceB = await mockUsdtToken.balanceOf(pool.target);

      // Vérification que l'allowance correspond au solde
      const allowanceA = await inhxToken.allowance(pool.target, routerAddress);
      const allowanceB = await mockUsdtToken.allowance(pool.target, routerAddress);

      expect(allowanceA).to.equal(balanceA);
      expect(allowanceB).to.equal(balanceB);
    });
  });

  describe("swapTokenAForTokenB", function () {
    it("should swap InhxToken for MockUsdtToken via Uniswap", async function () {
      const { pool, inhxToken, mockUsdtToken, user } = await loadFixture(deployContractsFixture);
      const oneEther = ethers.parseEther("1");
      
      // L'utilisateur approuve le pool pour transférer ses InhxToken
      await inhxToken.connect(user).approve(pool.target, oneEther * 10n);

      // Récupération du solde initial de MockUsdtToken pour l'utilisateur
      const balanceBefore = await mockUsdtToken.balanceOf(user.address);
      const deadline = Math.floor(Date.now() / 1000) + 1000;

      // Exécution du swap
      await pool.connect(user).swapTokenAForTokenB(oneEther * 10n, 0, deadline);

      // Le solde en MockUsdtToken de l'utilisateur doit augmenter
      const balanceAfter = await mockUsdtToken.balanceOf(user.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("should fail if the user has not approved the contract", async function () {
      const { pool, inhxToken, user } = await loadFixture(deployContractsFixture);
      const oneEther = ethers.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 1000;
      await expect(
        pool.connect(user).swapTokenAForTokenB(oneEther, 0, deadline)
      ).to.be.revertedWithCustomError(inhxToken, "ERC20InsufficientAllowance")
        .withArgs(pool.target, 0n, oneEther);
    });

    it("should fail if the transfer fails due to insufficient tokenA balance", async function () {
      const { pool, inhxToken, user, owner } = await loadFixture(deployContractsFixture);
      const oneEther = ethers.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 1000;
      
      // L'utilisateur approuve avec une allowance élevée
      await inhxToken.connect(user).approve(pool.target, oneEther * 10n);
      
      // Retirer tous les tokens de l'utilisateur pour forcer un solde insuffisant
      const userBalance = await inhxToken.balanceOf(user.address);
      await inhxToken.connect(user).transfer(owner.address, userBalance);
      
      // Le swap doit échouer en raison d'un solde insuffisant
      await expect(
        pool.connect(user).swapTokenAForTokenB(oneEther * 5n, 0, deadline)
      ).to.be.revertedWithCustomError(inhxToken, "ERC20InsufficientBalance");
    });
  });

  describe("swapTokenBForTokenA", function () {
    it("should swap MockUsdtToken for InhxToken via Uniswap", async function () {
      const { pool, inhxToken, mockUsdtToken, user } = await loadFixture(deployContractsFixture);
      const oneEther = ethers.parseEther("1");
      
      // L'utilisateur approuve le pool pour transférer ses MockUsdtToken
      await mockUsdtToken.connect(user).approve(pool.target, oneEther * 10n);

      // Récupération du solde initial d'InhxToken pour l'utilisateur
      const balanceBefore = await inhxToken.balanceOf(user.address);
      const deadline = Math.floor(Date.now() / 1000) + 1000;

      // Exécution du swap
      await pool.connect(user).swapTokenBForTokenA(oneEther * 10n, 0, deadline);

      // Le solde en InhxToken de l'utilisateur doit augmenter
      const balanceAfter = await inhxToken.balanceOf(user.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("should fail if the user has not approved the contract", async function () {
      const { pool, mockUsdtToken, user } = await loadFixture(deployContractsFixture);
      const oneEther = ethers.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 1000;
      await expect(
        pool.connect(user).swapTokenBForTokenA(oneEther, 0, deadline)
      ).to.be.revertedWithCustomError(mockUsdtToken, "ERC20InsufficientAllowance")
        .withArgs(pool.target, 0n, oneEther);
    });
  });

  describe("getReserves", function () {
    it("should return the correct reserves from the Uniswap pair", async function () {
      const { pool, liquidityAmount } = await loadFixture(deployContractsFixture);
      const [reserveA, reserveB] = await pool.getReserves();
      expect(reserveA).to.equal(liquidityAmount);
      expect(reserveB).to.equal(liquidityAmount);
    });

    it("should revert if the pair does not exist", async function () {
      const { poolNoLiquidity } = await loadFixture(deployNoLiquidityFixture);
      await expect(poolNoLiquidity.getReserves())
        .to.be.revertedWithCustomError(poolNoLiquidity, "PairDoesNotExist");
    });

    it("should handle token ordering when tokenA > tokenB", async function () {
      const { poolReordered, oneEther } = await loadFixture(deployReorderedTokensFixture);
      const [rA, rB] = await poolReordered.getReserves();
      expect(rA).to.equal(oneEther);
      expect(rB).to.equal(oneEther);
    });
  });

  describe("OpenZeppelin ERC20 Custom Error Handling", function () {
    it("should revert if approve is called with address(0) → ERC20InvalidSpender", async function () {
      const { inhxToken, user } = await loadFixture(deployContractsFixture);
      const oneEther = ethers.parseEther("1");
      await expect(
        inhxToken.connect(user).approve(ethers.ZeroAddress, oneEther)
      ).to.be.revertedWithCustomError(inhxToken, "ERC20InvalidSpender")
        .withArgs(ethers.ZeroAddress);
    });

    it("should revert if allowance is insufficient → ERC20InsufficientAllowance", async function () {
      const { pool, inhxToken, user } = await loadFixture(deployContractsFixture);
      const oneEther = ethers.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 1000;
      await expect(
        pool.connect(user).swapTokenAForTokenB(oneEther, 0, deadline)
      ).to.be.revertedWithCustomError(inhxToken, "ERC20InsufficientAllowance")
        .withArgs(pool.target, 0n, oneEther);
    });

    it("should revert if balance is insufficient → ERC20InsufficientBalance", async function () {
      const { pool, inhxToken, user, owner } = await loadFixture(deployContractsFixture);
      const oneEther = ethers.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 1000;
      await inhxToken.connect(user).approve(pool.target, oneEther);
      const userBalance = await inhxToken.balanceOf(user.address);
      await inhxToken.connect(user).transfer(owner.address, userBalance);
      await expect(
        pool.connect(user).swapTokenAForTokenB(oneEther, 0, deadline)
      ).to.be.revertedWithCustomError(inhxToken, "ERC20InsufficientBalance")
        .withArgs(user.address, 0n, oneEther);
    });

    it("should revert if receiver is address(0) → ERC20InvalidReceiver", async function () {
      const { inhxToken, user } = await loadFixture(deployContractsFixture);
      const oneEther = ethers.parseEther("1");
      await inhxToken.connect(user).approve(user.address, oneEther);
      await expect(
        inhxToken.connect(user).transfer(ethers.ZeroAddress, oneEther)
      ).to.be.revertedWithCustomError(inhxToken, "ERC20InvalidReceiver")
        .withArgs(ethers.ZeroAddress);
    });
  });
});
