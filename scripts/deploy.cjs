const { ethers } = require("hardhat");

async function main() {
  const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
  const liquidityPool = await LiquidityPool.deploy();

  await liquidityPool.waitForDeployment();

  console.log("LiquidityPool deployed to:", liquidityPool.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
