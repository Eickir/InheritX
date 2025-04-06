const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const network = hre.network.name;
  console.log(`🚀 Deploying to ${network.toUpperCase()}`);

  // Détermine le signer principal
  let deployer, user1, user2, user3, user4, user5;
  if (network === "sepolia") {
    const provider = hre.ethers.provider;
    deployer = new hre.ethers.Wallet(`0x${process.env.PRIVATE_KEY}`, provider);
    console.log("🔐 Deployer Wallet:", deployer.address);
  } else {
    [deployer, user1, user2, user3, user4, user5] = await hre.ethers.getSigners();
    console.log("Deployment context:\n _Deployer:", deployer.address);
    console.log("_Testators:", user1.address, user2.address);
    console.log("_Validators:", user3.address, user4.address, user5.address);
  }

  // Ajuste les frais de gas selon le réseau
  const overrides =
    network === "sepolia"
      ? {
          maxFeePerGas: hre.ethers.parseUnits("30", "gwei"),
          maxPriorityFeePerGas: hre.ethers.parseUnits("2", "gwei"),
        }
      : {
          maxFeePerGas: hre.ethers.parseUnits("2", "gwei"),
          maxPriorityFeePerGas: hre.ethers.parseUnits("1", "gwei"),
        };

  const LIQUIDITY_AMOUNT = hre.ethers.parseUnits("1000000", 18);

  // 1️. Deploy INHX
  const InhxToken = await hre.ethers.getContractFactory("InhxToken", deployer);
  const INHX = await InhxToken.deploy(overrides);
  await INHX.waitForDeployment();
  const INHXAddress = await INHX.getAddress();
  console.log("✅ INHX deployed at:", INHXAddress);

  // 2️. Deploy MUSDT
  const MusdtToken = await hre.ethers.getContractFactory("MockUsdtToken", deployer);
  const MUSDT = await MusdtToken.deploy(overrides);
  await MUSDT.waitForDeployment();
  const MUSDTAddress = await MUSDT.getAddress();
  console.log("✅ MUSDT deployed at:", MUSDTAddress);

  // 3️. Deploy LP contract
  const routerAddress =
    network === "sepolia"
      ? "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3" // Sepolia-compatible UniswapV2 Router
      : "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

  // 7. Add liquidity
  if (network === "sepolia") {
    // Ajout de liquidité en interagissant directement avec le routeur et la factory
    try {
      // Récupère l'instance du routeur
      const router = await hre.ethers.getContractAt("IUniswapV2Router02", routerAddress, deployer);

      // Approuve le routeur pour dépenser les tokens
      await INHX.approve(router.getAddress(), LIQUIDITY_AMOUNT, overrides);
      await MUSDT.approve(router.getAddress(), LIQUIDITY_AMOUNT, overrides);
      console.log("✅ Tokens approved for router");

      // Récupère l'adresse de la Factory depuis le routeur
      const factoryAddr = await router.factory();
      const uniswapFactory = await hre.ethers.getContractAt("IUniswapV2Factory", factoryAddr, deployer);

      // Vérifie si la paire existe déjà
      let pair = await uniswapFactory.getPair(INHXAddress, MUSDTAddress);
      if (pair === hre.ethers.ZeroAddress) {
        console.log("Paire non trouvée, création de la paire...");
        const txPair = await uniswapFactory.createPair(INHXAddress, MUSDTAddress, overrides);
        await txPair.wait();
        pair = await uniswapFactory.getPair(INHXAddress, MUSDTAddress);
        console.log("✅ Paire créée avec succès, adresse :", pair);
      } else {
        console.log("✅ Paire trouvée :", pair);
      }

      // Définit un deadline (20 minutes à partir de maintenant)
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
      // Appelle la fonction addLiquidity du routeur
      const txLiquidity = await router.addLiquidity(
        INHXAddress,
        MUSDTAddress,
        LIQUIDITY_AMOUNT,
        LIQUIDITY_AMOUNT,
        0, // montant minimum pour INHX
        0, // montant minimum pour MUSDT
        deployer.address, // destinataire des tokens LP
        deadline,
        overrides
      );
      await txLiquidity.wait();
      console.log("💧 Liquidité ajoutée avec succès!");
    } catch (err) {
      console.error("❌ addLiquidity failed:", err);
      return;
    }
  } else {
    // Pour les autres réseaux, on utilise la fonction addLiquidity du contrat LP

    const LiquidityPool = await hre.ethers.getContractFactory("InheritXLiquidityPool", deployer);
    const pool = await LiquidityPool.deploy(INHXAddress, MUSDTAddress, routerAddress, overrides);
    await pool.waitForDeployment();
    const poolAddress = await pool.getAddress();
    console.log("✅ LP contract deployed at:", poolAddress);

    // 4️. Transfer tokens to LP
    await INHX.transfer(poolAddress, LIQUIDITY_AMOUNT, overrides);
    await MUSDT.transfer(poolAddress, LIQUIDITY_AMOUNT, overrides);
    console.log("📦 Tokens transferred to LP");

    // 5️. Token distribution (skip on sepolia)
    if (network !== "sepolia") {
      const validators = [user1, user2, user3];
      for (const user of validators) {
        const tx = await MUSDT.transfer(user.address, hre.ethers.parseUnits("10000", 18));
        await tx.wait();
      }
      const testators = [user4, user5];
      for (const user of testators) {
        const tx = await MUSDT.transfer(user.address, hre.ethers.parseUnits("10000", 18));
        await tx.wait();
      }
      for (const user of [user1, user2, user3, user4, user5]) {
        const balance = await MUSDT.balanceOf(user.address);
        console.log(`🧾 ${user.address} MUSDT balance:`, hre.ethers.formatUnits(balance, 18));
      }
    }

    // 6. Approve router inside LP
    try {
      await pool.approveRouter(overrides);
      console.log("✅ Router approved inside LP contract");
    } catch (err) {
      console.error("❌ approveRouter failed:", err);
      return;
    }

    try {
      const tx = await pool.addLiquidity(
        LIQUIDITY_AMOUNT,
        LIQUIDITY_AMOUNT,
        1,
        1,
        overrides
      );
      await tx.wait();
      console.log("💧 Liquidité ajoutée avec succès!");
    } catch (err) {
      console.error("❌ addLiquidity failed:", err);
      return;
    }
  }

  // 8. Uniswap pair
  try {
    const router = await hre.ethers.getContractAt("IUniswapV2Router02", routerAddress, deployer);
    const factoryAddr = await router.factory();
    const factory = await hre.ethers.getContractAt("IUniswapV2Factory", factoryAddr, deployer);
    const pair = await factory.getPair(INHXAddress, MUSDTAddress);
    console.log("🔗 Uniswap Pair Address:", pair);
  } catch (err) {
    console.error("❌ Could not fetch pair address:", err);
  }

  // 9. ValidatorPool
  const stakeEntryAmount = hre.ethers.parseUnits("5000", 18);
  const ValidatorPool = await hre.ethers.getContractFactory("ValidatorPool", deployer);
  const validatorPool = await ValidatorPool.deploy(INHXAddress, stakeEntryAmount);
  await validatorPool.waitForDeployment();
  const validatorPoolAddress = await validatorPool.getAddress();
  console.log("✅ ValidatorPool deployed at:", validatorPoolAddress);

  // 10. TestamentManager
  const TestamentManager = await hre.ethers.getContractFactory("TestamentManager", deployer);
  const baseTokenURI = process.env.BASE_TOKEN_URI || "";
  const testamentManager = await TestamentManager.deploy(
    validatorPoolAddress,
    INHXAddress,
    baseTokenURI
  );
  await testamentManager.waitForDeployment();
  const testamentManagerAddress = await testamentManager.getAddress();
  console.log("✅ TestamentManager deployed at:", testamentManagerAddress);
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});