const {assert, expect} = require("chai");
const {ethers} = require("hardhat");
const {loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");


describe("Tests d'InheritXLiquidityPool avec les contrats Uniswap réels", function () {
  let inhxToken, mockUsdtToken, pool, routerAddress;
  let owner, user;
  const oneEther = ethers.parseEther("1");
  const liquidityAmount = ethers.parseEther("1000");

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    
    // Déploiement des tokens
    const InhxTokenFactory = await ethers.getContractFactory("InhxToken");
    inhxToken = await InhxTokenFactory.deploy();
    const MockUsdtTokenFactory = await ethers.getContractFactory("MockUsdtToken");
    mockUsdtToken = await MockUsdtTokenFactory.deploy();

    // Déploiement pool
    routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Uniswap V2 router
    const LiquidityPool = await hre.ethers.getContractFactory("InheritXLiquidityPool");
    pool = await LiquidityPool.deploy(inhxToken, mockUsdtToken, routerAddress);
    await pool.waitForDeployment();

    // Transfert de quelques tokens au user pour effectuer des swaps
    await inhxToken.transfer(user.address, ethers.parseEther("100"));
    await mockUsdtToken.transfer(user.address, ethers.parseEther("100"));

    // Add liquidity to the pool
    await inhxToken.transfer(pool.target, liquidityAmount);
    await mockUsdtToken.transfer(pool.target, liquidityAmount);
    await pool.approveRouter();
    await pool.connect(owner).addLiquidity(liquidityAmount, liquidityAmount, 0, 0);    

  });


  describe("Contrôle d'accès", function () {
    it("approveRouter doit être accessible uniquement par le owner", async function () {
      await expect(pool.connect(user).approveRouter()).to.be.revertedWithCustomError(pool, "OwnableUnauthorizedAccount").withArgs(user.address);
    });

    it("addLiquidity doit être accessible uniquement par le owner", async function () {
      await expect(pool.connect(user).addLiquidity(oneEther, oneEther, 0, 0)).to.be.revertedWithCustomError(pool, "OwnableUnauthorizedAccount").withArgs(user.address);
    });

    it("addLiquidity échoue si amountADesired = 0", async function () {
      await expect(pool.connect(owner).addLiquidity(0, oneEther, 0, 0)).to.be.reverted;
    });

  });

  describe("approveRouter", function () {
    it("doit approuver le routeur pour tokenA et tokenB", async function () {
      // Appelle la fonction d'approbation
      await pool.approveRouter();
  
      // On récupère les soldes actuels du contrat
      const balanceA = await inhxToken.balanceOf(pool.target);
      const balanceB = await mockUsdtToken.balanceOf(pool.target);
  
      // On vérifie que l'allowance correspond au solde
      const allowanceA = await inhxToken.allowance(pool.target, routerAddress);
      const allowanceB = await mockUsdtToken.allowance(pool.target, routerAddress);
  
      expect(allowanceA).to.equal(balanceA);
      expect(allowanceB).to.equal(balanceB);
    });
  });

  describe("swapTokenAForTokenB", function () {
    it("doit échanger InhxToken contre MockUsdtToken via Uniswap", async function () {
      // Le user approuve le contrat LiquidityPool pour transférer ses InhxToken
      await inhxToken.connect(user).approve(pool.target, oneEther * 10n);

      // On récupère le solde initial de MockUsdtToken du user
      const balanceBefore = await mockUsdtToken.balanceOf(user.address);
      const deadline = Math.floor(Date.now() / 1000) + 1000;

      // Exécute le swap via le contrat LiquidityPool
      await pool.connect(user).swapTokenAForTokenB(oneEther * 10n, 0, deadline);

      // Le solde en MockUsdtToken du user doit avoir augmenté
      const balanceAfter = await mockUsdtToken.balanceOf(user.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("doit échouer si l'utilisateur n'a pas approuvé le contrat", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 1000;
        await expect(
          pool.connect(user).swapTokenAForTokenB(oneEther, 0, deadline)
        ).to.be.revertedWithCustomError(inhxToken, "ERC20InsufficientAllowance").withArgs(pool.target, 0n, oneEther);
    });

    it("échoue si le transfert échoue (tokenA - solde insuffisant)", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 1000;
    
      // User a une allowance élevée
      await inhxToken.connect(user).approve(pool.target, oneEther * 10n);
    
      // Mais on lui retire tous ses tokens
      const userBalance = await inhxToken.balanceOf(user.address);
      await inhxToken.connect(user).transfer(owner.address, userBalance);
    
      // Maintenant le transfert échouera à cause d'un solde insuffisant
      await expect(
        pool.connect(user).swapTokenAForTokenB(oneEther * 5n, 0, deadline)
      ).to.be.revertedWithCustomError(inhxToken, "ERC20InsufficientBalance")
    });

  });

  describe("swapTokenBForTokenA", function () {
    it("doit échanger MockUsdtToken contre InhxToken via Uniswap", async function () {
      // Le user approuve le contrat LiquidityPool pour transférer ses MockUsdtToken
      await mockUsdtToken.connect(user).approve(pool.target, oneEther * 10n);

      // On récupère le solde initial d'InhxToken du user
      const balanceBefore = await inhxToken.balanceOf(user.address);
      const deadline = Math.floor(Date.now() / 1000) + 1000;

      // Exécute le swap via le contrat LiquidityPool
      await pool.connect(user).swapTokenBForTokenA(oneEther * 10n, 0, deadline);

      // Le solde en InhxToken du user doit avoir augmenté
      const balanceAfter = await inhxToken.balanceOf(user.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("doit échouer si l'utilisateur n'a pas approuvé le contrat", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 1000;
        await expect(
          pool.connect(user).swapTokenBForTokenA(oneEther, 0, deadline)
        ).to.be.revertedWithCustomError(mockUsdtToken, "ERC20InsufficientAllowance").withArgs(pool.target, 0n, oneEther);
    });

  });

  describe("getReserves", function () {
    it("doit retourner les réserves correctes depuis la paire Uniswap", async function () {
      const [reserveA, reserveB] = await pool.getReserves();
      // Ici, les réserves devraient être non nulles (la liquidité a été ajoutée)
      expect(reserveA).to.equal(liquidityAmount);
      expect(reserveB).to.equal(liquidityAmount);
    });

    it("doit échouer si la paire n'existe pas", async function () {
      // Déployer deux nouveaux tokens sans ajouter de liquidité
      const TokenA = await ethers.getContractFactory("InhxToken");
      const token1 = await TokenA.deploy();
      const TokenB = await ethers.getContractFactory("MockUsdtToken");
      const token2 = await TokenB.deploy();
    
      const LiquidityPool = await ethers.getContractFactory("InheritXLiquidityPool");
      const pool2 = await LiquidityPool.deploy(token1, token2, routerAddress);
      await pool2.waitForDeployment();
    
      await expect(pool2.getReserves()).to.be.revertedWith("Pair does not exist");
    });

    it("getReserves gère tokenA > tokenB (ternaire)", async function () {
      const TokenA = await ethers.getContractFactory("MockUsdtToken");
      const TokenB = await ethers.getContractFactory("InhxToken");
    
      const token1 = await TokenA.deploy();
      const token2 = await TokenB.deploy();
    
      const LiquidityPool = await ethers.getContractFactory("InheritXLiquidityPool");
      const pool2 = await LiquidityPool.deploy(token1, token2, routerAddress);
    
      await token1.transfer(pool2.target, oneEther);
      await token2.transfer(pool2.target, oneEther);
      await pool2.approveRouter();
      await pool2.connect(owner).addLiquidity(oneEther, oneEther, 0, 0);
    
      const [rA, rB] = await pool2.getReserves();
      expect(rA).to.equal(oneEther);
      expect(rB).to.equal(oneEther);
    });
    

  });

  describe("OpenZeppelin ERC20 custom error handling", function () {
  it("revert si approve vers address(0) → ERC20InvalidSpender", async function () {
    await expect(
      inhxToken.connect(user).approve(ethers.ZeroAddress, oneEther)
    ).to.be.revertedWithCustomError(inhxToken, "ERC20InvalidSpender")
      .withArgs(ethers.ZeroAddress);
  });

  it("revert si allowance insuffisante → ERC20InsufficientAllowance", async function () {
    const deadline = Math.floor(Date.now() / 1000) + 1000;
    await expect(
      pool.connect(user).swapTokenAForTokenB(oneEther, 0, deadline)
    ).to.be.revertedWithCustomError(inhxToken, "ERC20InsufficientAllowance")
      .withArgs(pool.target, 0n, oneEther);
  });

  it("revert si balance insuffisante → ERC20InsufficientBalance", async function () {
    const deadline = Math.floor(Date.now() / 1000) + 1000;
    await inhxToken.connect(user).approve(pool.target, oneEther);
    const balance = await inhxToken.balanceOf(user.address);
    await inhxToken.connect(user).transfer(owner.address, balance);
    await expect(
      pool.connect(user).swapTokenAForTokenB(oneEther, 0, deadline)
    ).to.be.revertedWithCustomError(inhxToken, "ERC20InsufficientBalance")
      .withArgs(user.address, 0n, oneEther);
  });

  it("revert si receiver == address(0) → ERC20InvalidReceiver", async function () {
    await inhxToken.connect(user).approve(owner.address, oneEther);
    await expect(
      inhxToken.connect(owner).transfer(ethers.ZeroAddress, oneEther)
    ).to.be.revertedWithCustomError(inhxToken, "ERC20InvalidReceiver")
      .withArgs(ethers.ZeroAddress);
  });
});


});
