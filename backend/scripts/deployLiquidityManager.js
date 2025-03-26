const hre = require("hardhat");

async function main() {
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("🚀 Deployer address:", deployer.address);

  // Define overrides with a higher maxFeePerGas and maxPriorityFeePerGas:
  const overrides = {
    // Set these to values higher than the current base fee.
    // For example, 2 gwei for maxFeePerGas and 1 gwei for maxPriorityFeePerGas:
    maxFeePerGas: hre.ethers.parseUnits("2", "gwei"),
    maxPriorityFeePerGas: hre.ethers.parseUnits("1", "gwei")
  };

  const LIQUIDITY_AMOUNT_A = hre.ethers.parseUnits("1000000000", 18);
  const LIQUIDITY_AMOUNT_B = hre.ethers.parseUnits("1000000000", 6);

  // 1️⃣ Deploy Token A (INHX)
  const TokenA = await hre.ethers.getContractFactory("InhxToken");
  const tokenA = await TokenA.deploy(overrides);
  await tokenA.waitForDeployment();
  console.log("✅ Token A deployed to:", await tokenA.getAddress());

  // 2️⃣ Deploy Token B (TetherToken)
  const TetherToken = await hre.ethers.getContractFactory("TetherToken");
  const tokenB = await TetherToken.deploy(
    1_000_000 * 10 ** 6, // initial supply for 6 decimals
    "Mock Tether USD",
    "MUSDT",
    6,
    overrides
  );
  await tokenB.waitForDeployment();
  await tokenB.issue(100000);
  console.log("✅ Token B deployed to:", await tokenB.getAddress());

  // 3️⃣ Deploy the Liquidity Pool Manager
  const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Uniswap V2 Router
  const LiquidityPool = await hre.ethers.getContractFactory("InheritXLiquidityPool");
  const pool = await LiquidityPool.deploy(
    await tokenA.getAddress(),
    await tokenB.getAddress(),
    routerAddress,
    overrides
  );
  await pool.waitForDeployment();
  console.log("✅ Liquidity Pool deployed to:", await pool.getAddress());

  // 4️⃣ Approve tokens to the pool
  await tokenA.approve(await pool.getAddress(), LIQUIDITY_AMOUNT_A, overrides);
  await tokenB.approve(await pool.getAddress(), LIQUIDITY_AMOUNT_B, overrides);
  console.log("✅ Tokens approved to Liquidity Pool");

  // 5️⃣ Add liquidity
  const tx = await pool.addLiquidity(
    LIQUIDITY_AMOUNT_A,
    LIQUIDITY_AMOUNT_B,
    LIQUIDITY_AMOUNT_A.mul(995).div(1000),
    LIQUIDITY_AMOUNT_B.mul(995).div(1000),
    overrides
  );
  await tx.wait();
  console.log("💧 Liquidity added!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
