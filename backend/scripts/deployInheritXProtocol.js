const hre = require("hardhat");

async function main() {
  
  const [deployer, user1, user2, user3, user4, user5] = await hre.ethers.getSigners();
  console.log("Deployment context:\n _Deployer: ", deployer.address)
  console.log("_Testators: ", user1.address, user2.address)
  console.log("_Validators: ", user3.address, user4.address, user5.address)

  const overrides = {
    maxFeePerGas: hre.ethers.parseUnits("2", "gwei"),
    maxPriorityFeePerGas: hre.ethers.parseUnits("1", "gwei"),
  };

  const LIQUIDITY_AMOUNT = hre.ethers.parseUnits("1000000", 18); // 1 million (18 decimals)

  // 1️. Deploy INHX
  const InhxToken = await hre.ethers.getContractFactory("InhxToken");
  const INHX = await InhxToken.deploy(overrides);
  await INHX.waitForDeployment();
  const INHXAddress = await INHX.getAddress();
  console.log("✅ INHX deployed at:", INHXAddress);

  // 2️. Deploy MUSDT 
  const MusdtToken = await hre.ethers.getContractFactory("MockUsdtToken"); // ⚠️ rename file/class if needed
  const MUSDT = await MusdtToken.deploy(overrides);
  await MUSDT.waitForDeployment();
  const MUSDTAddress = await MUSDT.getAddress();
  console.log("✅ MUSDT deployed at:", MUSDTAddress);

  // 3️. Deploy LP contract
  const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Uniswap V2 router
  const LiquidityPool = await hre.ethers.getContractFactory("InheritXLiquidityPool");
  const pool = await LiquidityPool.deploy(INHXAddress, MUSDTAddress, routerAddress, overrides);
  await pool.waitForDeployment();
  const poolAddress = await pool.getAddress();
  console.log("✅ LP contract deployed at:", poolAddress);

  // 4️. Transfer tokens to LP
  await INHX.transfer(poolAddress, LIQUIDITY_AMOUNT, overrides);
  await MUSDT.transfer(poolAddress, LIQUIDITY_AMOUNT, overrides);
  console.log("📦 Tokens transferred to LP");

  // 5. Transfer tokens for users to use in specific context 
  // Validators
  let i = 0; 
  const validators = [user1, user2, user3];
  for (i; i < validators.length; i++) {
    console.log(`Transferring 1000 tokens to ${validators[i].address}...`);
    const transferAmount = hre.ethers.parseUnits("10000", 18)
    const tx = await MUSDT.transfer(validators[i].address, transferAmount);
    await tx.wait();
  }
  i = 0;

  // Testators
  const testators = [user4, user5];
  for (i; i < testators.length; i++) {
    console.log(`Transferring 1000 tokens to ${testators[i].address}...`);
    const transferAmount = hre.ethers.parseUnits("10000", 18)
    const tx = await MUSDT.transfer(testators[i].address, transferAmount);
    await tx.wait();
  }

  // Check if balance has been updated for both user type
  const user1Balance = await MUSDT.connect(user1).balanceOf(user1.address);
  console.log("🧾 First Validator MUSDT balance:", hre.ethers.formatUnits(user1Balance, 18));
  const user2Balance = await MUSDT.connect(user1).balanceOf(user2.address);
  console.log("🧾 Second Validator MUSDT balance:", hre.ethers.formatUnits(user2Balance, 18));
  const user3Balance = await MUSDT.connect(user1).balanceOf(user3.address);
  console.log("🧾 Third Validator MUSDT balance:", hre.ethers.formatUnits(user3Balance, 18));
  const user4Balance = await MUSDT.connect(user1).balanceOf(user4.address);
  console.log("🧾 First Testator MUSDT balance:", hre.ethers.formatUnits(user4Balance, 18));
  const user5Balance = await MUSDT.connect(user1).balanceOf(user5.address);
  console.log("🧾 Second Testator MUSDT balance:", hre.ethers.formatUnits(user5Balance, 18));



  // 6. Approve router from inside LP contract
  try {
    await pool.approveRouter(overrides);
    console.log("✅ Router approved inside LP contract");
  } catch (err) {
    console.error("❌ approveRouter failed:", err);
    return;
  }

  // 7. Add liquidity via LP contract
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

  // 8. Display Uniswap pair address
  try {
    const router = await hre.ethers.getContractAt("IUniswapV2Router02", routerAddress);
    const factoryAddr = await router.factory();
    const factory = await hre.ethers.getContractAt("IUniswapV2Factory", factoryAddr);
    const pair = await factory.getPair(INHXAddress, MUSDTAddress);
    console.log("🔗 Uniswap Pair Address:", pair);
  } catch (err) {
    console.error("❌ Could not fetch pair address:", err);
  }

  // 9. Deploy ValidatorPool
  const stakeEntryAmount = 100;
  console.log("Amount to enter the Validator Network: ", stakeEntryAmount);
  const ValidatorPool = await hre.ethers.getContractFactory("ValidatorPool");
  const validatorPool = await ValidatorPool.deploy(INHXAddress, stakeEntryAmount);
  await validatorPool.waitForDeployment();
  const validatorPoolAddress = await validatorPool.getAddress();
  console.log("✅ ValidatorPool deployed at:", validatorPoolAddress);

  // 10. Deploy Testament Manager
  const TestatmentManager = await hre.ethers.getContractFactory("TestamentManager");
  const testamentManager = await TestatmentManager.deploy(validatorPoolAddress, INHXAddress);
  await testamentManager.waitForDeployment();
  const testamentManagerAddress = await testamentManager.getAddress();
  console.log("✅ TestamentManager deployed at:", testamentManagerAddress);

}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});
