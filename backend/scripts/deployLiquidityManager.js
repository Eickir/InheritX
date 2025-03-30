const hre = require("hardhat");

async function main() {
  
  const [deployer, user1, user2] = await hre.ethers.getSigners();
  console.log("🚀 Deployer:", deployer.address);

  const overrides = {
    maxFeePerGas: hre.ethers.parseUnits("2", "gwei"),
    maxPriorityFeePerGas: hre.ethers.parseUnits("1", "gwei"),
  };

  const LIQUIDITY_AMOUNT = hre.ethers.parseUnits("1000000", 18); // 1 million (18 decimals)

  // 1️⃣ Deploy INHX
  const InhxToken = await hre.ethers.getContractFactory("InhxToken");
  const tokenA = await InhxToken.deploy(overrides);
  await tokenA.waitForDeployment();
  const tokenAAddress = await tokenA.getAddress();
  console.log("✅ INHX deployed at:", tokenAAddress);

  // 2️⃣ Deploy MUSDT (new version)
  const MusdtToken = await hre.ethers.getContractFactory("MockUsdtToken"); // ⚠️ rename file/class if needed
  const tokenB = await MusdtToken.deploy(overrides);
  await tokenB.waitForDeployment();
  const tokenBAddress = await tokenB.getAddress();
  console.log("✅ MUSDT deployed at:", tokenBAddress);

  // 3️⃣ Deploy LP contract
  const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Uniswap V2 router
  const LiquidityPool = await hre.ethers.getContractFactory("InheritXLiquidityPool");
  const pool = await LiquidityPool.deploy(tokenAAddress, tokenBAddress, routerAddress, overrides);
  await pool.waitForDeployment();
  const poolAddress = await pool.getAddress();
  console.log("✅ LP contract deployed at:", poolAddress);

  // 4️⃣ Transfer tokens to LP
  await tokenA.transfer(poolAddress, LIQUIDITY_AMOUNT, overrides);
  await tokenB.transfer(poolAddress, LIQUIDITY_AMOUNT, overrides);
  console.log("📦 Tokens transferred to LP");

  console.log(`Transferring 1000 tokens to ${user1.address}...`);
  const transferAmount = hre.ethers.parseUnits("1000", 18)
  const tx = await tokenB.transfer(user1.address, transferAmount);
  await tx.wait();
  const user1Balance = await tokenB.connect(user1).balanceOf(user1.address);
  console.log("🧾 Deployer MUSDT balance:", hre.ethers.formatUnits(user1Balance, 18));


  // 5️⃣ Approve router from inside LP contract
  try {
    await pool.approveRouter(overrides);
    console.log("✅ Router approved inside LP contract");
  } catch (err) {
    console.error("❌ approveRouter failed:", err);
    return;
  }

  // 6️⃣ Add liquidity via LP contract
  try {
    const tx = await pool.addLiquidity(
      LIQUIDITY_AMOUNT,
      LIQUIDITY_AMOUNT,
      1,
      1,
      overrides
    );
    await tx.wait();
    console.log("💧 Liquidity successfully added!");
  } catch (err) {
    console.error("❌ addLiquidity failed:", err);
    return;
  }

  // 7️⃣ Display Uniswap pair address
  try {
    const router = await hre.ethers.getContractAt("IUniswapV2Router02", routerAddress);
    const factoryAddr = await router.factory();
    const factory = await hre.ethers.getContractAt("IUniswapV2Factory", factoryAddr);
    const pair = await factory.getPair(tokenAAddress, tokenBAddress);
    console.log("🔗 Uniswap Pair Address:", pair);
  } catch (err) {
    console.error("❌ Could not fetch pair address:", err);
  }

  // 8. Deploy ValidatorPool
  const ValidatorPool = await hre.ethers.getContractFactory("ValidatorPool");
  const validatorPool = await ValidatorPool.deploy(tokenAAddress, 100);
  await validatorPool.waitForDeployment();
  const validatorPoolAddress = await validatorPool.getAddress();
  console.log("✅ ValidatorPool deployed at:", validatorPoolAddress);

  // 9. Deploy Testament Manager
  const TestatmentManager = await hre.ethers.getContractFactory("TestamentManager");
  const testamentManager = await TestatmentManager.deploy(validatorPoolAddress, tokenAAddress);
  await testamentManager.waitForDeployment();
  const testamentManagerAddress = await testamentManager.getAddress();
  console.log("✅ TestamentManager deployed at:", testamentManagerAddress);


}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});
