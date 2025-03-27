const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
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
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});
