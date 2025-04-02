const {assert, expect} = require("chai");
const {ethers} = require("hardhat");
const {loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Tests des tokens InhxToken et MockUsdtToken", function () {
  let inhxToken, mockUsdtToken;
  let owner, addr1;
  const initialSupplyInhx = ethers.parseEther("1000000");
  const initialSupplyUsdt = ethers.parseEther("2000000");

  beforeEach(async () => {
    [owner, addr1] = await ethers.getSigners();

    // Déploiement d'InhxToken
    const InhxTokenFactory = await ethers.getContractFactory("InhxToken");
    inhxToken = await InhxTokenFactory.deploy();


    // Déploiement de MockUsdtToken
    const MockUsdtTokenFactory = await ethers.getContractFactory("MockUsdtToken");
    mockUsdtToken = await MockUsdtTokenFactory.deploy();

  });

  it("doit attribuer l'offre initiale au owner (InhxToken)", async function () {
    expect(await inhxToken.balanceOf(owner.address)).to.equal(initialSupplyInhx);
  });

  it("doit refuser le mint pour un non-owner (InhxToken)", async function () {
    await expect(
      inhxToken.connect(addr1).mint(addr1.address, ethers.parseEther("1"))
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("doit refuser un mint qui dépasserait le MAX_SUPPLY (InhxToken)", async function () {
    // L'offre initiale atteint déjà le MAX_SUPPLY
    await expect(inhxToken.mint(owner.address, ethers.parseEther("1")))
      .to.be.revertedWith("Max supply reached");
  });

  it("doit attribuer l'offre initiale au owner (MockUsdtToken)", async function () {
    expect(await mockUsdtToken.balanceOf(owner.address)).to.equal(initialSupplyUsdt);
  });

  it("doit refuser le mint pour un non-owner (MockUsdtToken)", async function () {
    await expect(
      mockUsdtToken.connect(addr1).mint(addr1.address, ethers.parseEther("1"))
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("doit refuser un mint qui dépasserait le MAX_SUPPLY (MockUsdtToken)", async function () {
    const currentSupply = await mockUsdtToken.totalSupply();
    const maxSupply = ethers.parseEther("1000000000000"); // 1_000_000_000_000 ether
    const amountToMint = maxSupply.sub(currentSupply).add(ethers.parseEther("1"));
    await expect(mockUsdtToken.mint(owner.address, amountToMint))
      .to.be.revertedWith("Max supply reached");
  });
});

describe("Tests d'InheritXLiquidityPool avec les contrats Uniswap réels", function () {
  let inhxToken, mockUsdtToken, liquidityPool;
  let uniswapFactory, uniswapRouter, weth;
  let owner, user;
  const oneEther = ethers.parseEther("1");
  const liquidityAmount = ethers.parseEther("1000");

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Déploiement de vos tokens
    const InhxTokenFactory = await ethers.getContractFactory("InhxToken");
    inhxToken = await InhxTokenFactory.deploy();


    const MockUsdtTokenFactory = await ethers.getContractFactory("MockUsdtToken");
    mockUsdtToken = await MockUsdtTokenFactory.deploy();


    // Déploiement d'un contrat WETH (WETH9)
    const WETHFactory = await ethers.getContractFactory("WETH9");
    weth = await WETHFactory.deploy();


    // Déploiement d'UniswapV2Factory avec owner comme feeToSetter
    const UniswapV2Factory = await ethers.getContractFactory("UniswapV2Factory");
    uniswapFactory = await UniswapV2Factory.deploy(owner.address);


    // Déploiement d'UniswapV2Router02 avec l'adresse de la factory et du WETH
    const UniswapV2RouterFactory = await ethers.getContractFactory("UniswapV2Router02");
    uniswapRouter = await UniswapV2RouterFactory.deploy(uniswapFactory.address, weth.address);


    // Création de la paire pour InhxToken et MockUsdtToken
    await uniswapFactory.createPair(inhxToken.address, mockUsdtToken.address);
    const pairAddress = await uniswapFactory.getPair(inhxToken.address, mockUsdtToken.address);
    expect(pairAddress).to.properAddress; // vérifie que l'adresse de la pair est valide

    // Approve du routeur pour dépenser les tokens (pour fournir la liquidité)
    await inhxToken.approve(uniswapRouter.address, liquidityAmount);
    await mockUsdtToken.approve(uniswapRouter.address, liquidityAmount);

    // Fourniture de liquidité au pool Uniswap (depuis le owner)
    await uniswapRouter.addLiquidity(
      inhxToken.address,
      mockUsdtToken.address,
      liquidityAmount,
      liquidityAmount,
      0,
      0,
      owner.address,
      Math.floor(Date.now() / 1000) + 1000
    );

    // Déploiement de votre contrat InheritXLiquidityPool avec l'adresse du routeur Uniswap réel
    const LiquidityPoolFactory = await ethers.getContractFactory("InheritXLiquidityPool");
    liquidityPool = await LiquidityPoolFactory.deploy(
      inhxToken.address,
      mockUsdtToken.address,
      uniswapRouter.address
    );
    await liquidityPool.deployed();

    // Transfert de quelques tokens au user pour effectuer des swaps
    await inhxToken.transfer(user.address, ethers.parseEther("100"));
    await mockUsdtToken.transfer(user.address, ethers.parseEther("100"));
  });

  describe("Contrôle d'accès", function () {
    it("approveRouter doit être accessible uniquement par le owner", async function () {
      await expect(liquidityPool.connect(user).approveRouter())
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("addLiquidity doit être accessible uniquement par le owner", async function () {
      await expect(liquidityPool.connect(user).addLiquidity(oneEther, oneEther, 0, 0))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("approveRouter", function () {
    it("doit approuver le routeur pour tokenA et tokenB", async function () {
      await liquidityPool.approveRouter();
      const allowanceA = await inhxToken.allowance(liquidityPool.address, uniswapRouter.address);
      const allowanceB = await mockUsdtToken.allowance(liquidityPool.address, uniswapRouter.address);
      expect(allowanceA).to.equal(ethers.constants.MaxUint256);
      expect(allowanceB).to.equal(ethers.constants.MaxUint256);
    });
  });

  describe("swapTokenAForTokenB", function () {
    it("doit échanger InhxToken contre MockUsdtToken via Uniswap", async function () {
      // Le user approuve le contrat LiquidityPool pour transférer ses InhxToken
      await inhxToken.connect(user).approve(liquidityPool.address, oneEther.mul(10));

      // On récupère le solde initial de MockUsdtToken du user
      const balanceBefore = await mockUsdtToken.balanceOf(user.address);
      const deadline = Math.floor(Date.now() / 1000) + 1000;

      // Exécute le swap via le contrat LiquidityPool
      await liquidityPool.connect(user).swapTokenAForTokenB(oneEther.mul(10), 0, deadline);

      // Le solde en MockUsdtToken du user doit avoir augmenté
      const balanceAfter = await mockUsdtToken.balanceOf(user.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });
  });

  describe("swapTokenBForTokenA", function () {
    it("doit échanger MockUsdtToken contre InhxToken via Uniswap", async function () {
      // Le user approuve le contrat LiquidityPool pour transférer ses MockUsdtToken
      await mockUsdtToken.connect(user).approve(liquidityPool.address, oneEther.mul(10));

      // On récupère le solde initial d'InhxToken du user
      const balanceBefore = await inhxToken.balanceOf(user.address);
      const deadline = Math.floor(Date.now() / 1000) + 1000;

      // Exécute le swap via le contrat LiquidityPool
      await liquidityPool.connect(user).swapTokenBForTokenA(oneEther.mul(10), 0, deadline);

      // Le solde en InhxToken du user doit avoir augmenté
      const balanceAfter = await inhxToken.balanceOf(user.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });
  });

  describe("getReserves", function () {
    it("doit retourner les réserves correctes depuis la paire Uniswap", async function () {
      const [reserveA, reserveB] = await liquidityPool.getReserves();
      // Ici, les réserves devraient être non nulles (la liquidité a été ajoutée)
      expect(reserveA).to.be.gt(0);
      expect(reserveB).to.be.gt(0);
    });

    it("doit rejeter si la pair n'existe pas", async function () {
      // Pour simuler ce cas, déployons deux nouveaux tokens et créons un nouveau LiquidityPool sans créer la paire
      const TokenFactory = await ethers.getContractFactory("InhxToken");
      const newToken1 = await TokenFactory.deploy();
      await newToken1.deployed();
      const newToken2 = await TokenFactory.deploy(); // On peut utiliser InhxToken pour simuler un second token
      await newToken2.deployed();

      const LiquidityPoolFactory = await ethers.getContractFactory("InheritXLiquidityPool");
      const newLiquidityPool = await LiquidityPoolFactory.deploy(
        newToken1.address,
        newToken2.address,
        uniswapRouter.address
      );
      await newLiquidityPool.deployed();

      await expect(newLiquidityPool.getReserves()).to.be.revertedWith("Pair does not exist");
    });
  });
});
