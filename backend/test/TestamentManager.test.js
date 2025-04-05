const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// Fixture de base : déploiement des contrats sans dépôt de testament
async function deployContractsFixture() {
  const [owner, user, validator, otherUser] = await ethers.getSigners();

  const InhxToken = await ethers.getContractFactory("InhxToken");
  const INHX = await InhxToken.deploy();
  const INHXAddress = await INHX.getAddress();

  const stakeEntryAmount = ethers.parseEther("5000");
  const ValidatorPool = await ethers.getContractFactory("ValidatorPool");
  const validatorPool = await ValidatorPool.deploy(INHXAddress, stakeEntryAmount);
  const validatorPoolAddress = await validatorPool.getAddress();

  // Transfert et staking pour autoriser le validateur
  await INHX.transfer(validator.address, ethers.parseEther("5000"));
  await INHX.connect(validator).approve(validatorPoolAddress, stakeEntryAmount);
  await validatorPool.connect(validator).stake(stakeEntryAmount);

  // Transfert de tokens pour l'utilisateur
  await INHX.transfer(user.address, ethers.parseEther("500"));

  const TestamentManager = await ethers.getContractFactory("TestamentManager");
  const baseTokenURI = "https://fake.gateway.test/ipfs/"; // valeur factice
  const testamentManager = await TestamentManager.deploy(validatorPoolAddress, INHXAddress, baseTokenURI);
  const testamentManagerAddress = await testamentManager.getAddress();

  // Autorise le contrat à dépenser les tokens de l'utilisateur
  await INHX.connect(user).approve(testamentManagerAddress, ethers.parseEther("1000"));

  return { owner, user, validator, otherUser, INHX, validatorPool, testamentManager, baseTokenURI };
}

// Fixture avec dépôt d'un testament (sans approbation)
async function deployAndDepositTestamentFixture() {
  const env = await deployContractsFixture();
  const { user, testamentManager } = env;
  const cid = "QmSampleTestament";
  const decryptionKey = "sampleKey";
  const amount = ethers.parseEther("100"); // Correspond à baseDepositFee

  // Dépôt du testament par l'utilisateur
  await testamentManager.connect(user).depositTestament(cid, decryptionKey, amount);

  return { ...env, cid, decryptionKey, amount };
}

describe("TestamentManager", function () {

  describe("depositTestament", function () {
    it("should deposit a new testament", async function () {
      const { user, testamentManager } = await loadFixture(deployContractsFixture);
      const cid = "Qm123";
      const decryptionKey = "secret";
      const amount = ethers.parseEther("100"); // baseDepositFee

      await expect(
        testamentManager.connect(user).depositTestament(cid, decryptionKey, amount)
      )
        .to.emit(testamentManager, "TestamentDeposited")
        .withArgs(user.address, cid);

      const testament = await testamentManager.connect(user).getTestament();
      expect(testament.cid).to.equal(cid);
      expect(testament.decryptionKey).to.equal(decryptionKey);
      expect(testament.validity).to.equal(0); // Active
      expect(testament.status).to.equal(0);   // Pending
    });

    it("should revert if deposit amount does not match baseDepositFee", async function () {
      const { user, testamentManager } = await loadFixture(deployContractsFixture);
      const cid = "QmInvalid";
      const decryptionKey = "invalid";
      const wrongAmount = ethers.parseEther("50"); // montant incorrect

      await expect(
        testamentManager.connect(user).depositTestament(cid, decryptionKey, wrongAmount)
      ).to.be.revertedWithCustomError(testamentManager, "InvalidDepositFee");
    });
    
    it("should mark previous testament as outdated", async function () {
      const { user, testamentManager } = await loadFixture(deployContractsFixture);
      const amount = ethers.parseEther("100");

      await testamentManager.connect(user).depositTestament("CID1", "KEY1", amount);
      await expect(
        testamentManager.connect(user).depositTestament("CID2", "KEY2", amount)
      ).to.emit(testamentManager, "TestamentOutdated");
    });

    it("should fail if user has not enough token", async function () {
      const { otherUser, testamentManager } = await loadFixture(deployContractsFixture);
      await expect(
        testamentManager.connect(otherUser).depositTestament("CID", "KEY", ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(testamentManager, "HasNotEnoughToken");
    });
  });

  describe("approveTestament", function () {
    it("should approve testament and mint NFT", async function () {
      const { user, validator, cid, testamentManager } = await loadFixture(deployAndDepositTestamentFixture);

      await expect(
        testamentManager.connect(validator).approveTestament(user.address)
      )
        .to.emit(testamentManager, "TestamentApproved")
          .withArgs(user.address, cid)
        .and.to.emit(testamentManager, "TestamentMinted")
          .withArgs(user.address, 1, cid);

      const testament = await testamentManager.connect(user).getTestament();
      expect(testament.status).to.equal(2); // Approved
    });

    it("should revert if testament already approved", async function () {
      const { user, validator, testamentManager } = await loadFixture(deployAndDepositTestamentFixture);
      // Approuver le testament une première fois
      await testamentManager.connect(validator).approveTestament(user.address);
      // Une seconde tentative doit renvoyer l'erreur
      await expect(
        testamentManager.connect(validator).approveTestament(user.address)
      ).to.be.revertedWithCustomError(testamentManager, "TestamentAlreadyProcessed");
    });

    it("should mint a soulbound NFT with correct tokenURI", async function () {
      const { user, validator, testamentManager, baseTokenURI } = await loadFixture(deployContractsFixture);
      const cid = "QmMintCheck";
      const key = "encryptedKey123";
      const amount = ethers.parseEther("100");
    
      await testamentManager.connect(user).depositTestament(cid, key, amount);
      await testamentManager.connect(validator).approveTestament(user.address);
    
      const tokenUri = await testamentManager.tokenURI(1);
      expect(tokenUri).to.equal(`${baseTokenURI}${cid}`);
    
      const storedKey = await testamentManager.connect(validator).getDecryptedKey(cid);
      expect(storedKey).to.equal(key);
    });

    it("should revert if non-validator tries to approve a testament", async function () {
      const { user, testamentManager } = await loadFixture(deployContractsFixture);
      const amount = ethers.parseEther("100");
      
      await testamentManager.connect(user).depositTestament("CID1", "KEY1", amount);
      
      await expect(
        testamentManager.connect(user).approveTestament(user.address)
      ).to.be.revertedWithCustomError(testamentManager, "NotAuthorized");
    });

    it("should revert if no testament found", async function () {
      const { validator, otherUser, testamentManager } = await loadFixture(deployContractsFixture);
      await expect(
        testamentManager.connect(validator).approveTestament(otherUser.address)
      ).to.be.revertedWithCustomError(testamentManager, "NoTestamentFound");
    });
  });

  describe("rejectTestament", function () {
    it("should reject testament correctly", async function () {
      const { user, validator, cid, testamentManager } = await loadFixture(deployAndDepositTestamentFixture);

      await expect(
        testamentManager.connect(validator).rejectTestament(user.address)
      )
        .to.emit(testamentManager, "TestamentRejected")
        .withArgs(user.address, cid);

      const testament = await testamentManager.connect(user).getTestament();
      expect(testament.status).to.equal(1); // Rejected
    });

    it("should revert if validator is not authorized", async function () {
      const { user, testamentManager } = await loadFixture(deployContractsFixture);
      const amount = ethers.parseEther("100");
      await testamentManager.connect(user).depositTestament("CID", "KEY", amount);
    
      await expect(
        testamentManager.connect(user).rejectTestament(user.address)
      ).to.be.revertedWithCustomError(testamentManager, "NotAuthorized");
    });
  
    it("should revert if no testament found", async function () {
      const { validator, otherUser, testamentManager } = await loadFixture(deployContractsFixture);
      await expect(
        testamentManager.connect(validator).rejectTestament(otherUser.address)
      ).to.be.revertedWithCustomError(testamentManager, "NoTestamentFound");
    });
    
    it("should revert if testament already rejected", async function () {
      const { user, validator, testamentManager } = await loadFixture(deployAndDepositTestamentFixture);
      await testamentManager.connect(validator).rejectTestament(user.address);
  
      await expect(
        testamentManager.connect(validator).rejectTestament(user.address)
      ).to.be.revertedWithCustomError(testamentManager, "TestamentAlreadyProcessed");
    });
  });

  describe("getters", function () {
    it("should return number of testaments", async function () {
      const { user, testamentManager } = await loadFixture(deployContractsFixture);
      const amount = ethers.parseEther("100");
      await testamentManager.connect(user).depositTestament("CID1", "KEY1", amount);
      await testamentManager.connect(user).depositTestament("CID2", "KEY2", amount);
      const count = await testamentManager.connect(user).getTestamentsNumber();
      expect(count).to.equal(2);
    });

    it("should return decrypted key if validator is authorized", async function () {
      const { validator, testamentManager } = await loadFixture(deployAndDepositTestamentFixture);
      const result = await testamentManager.connect(validator).getDecryptedKey("QmSampleTestament");
      expect(result).to.equal("sampleKey");
    });

    it("should return decrypted key if depositor calls getDecryptedKey", async function () {
      const { user, testamentManager } = await loadFixture(deployAndDepositTestamentFixture);
      const result = await testamentManager.connect(user).getDecryptedKey("QmSampleTestament");
      expect(result).to.equal("sampleKey");
    });
    
    it("should revert if non-authorized user tries to access key", async function () {
      const { otherUser, testamentManager } = await loadFixture(deployAndDepositTestamentFixture);
      await expect(
        testamentManager.connect(otherUser).getDecryptedKey("QmSampleTestament")
      ).to.be.revertedWithCustomError(testamentManager, "NotAuthorized");
    });

    it("should return NoTestamentFound error if CID does not exist", async function () {
      const { owner, testamentManager } = await loadFixture(deployContractsFixture);
      await expect(
        testamentManager.connect(owner).getDecryptedKey("UnknownCID")
      ).to.be.revertedWithCustomError(testamentManager, "NoTestamentFound");
    });
  });

  describe("Soulbound enforcement", function () {
    it("should revert transferFrom (Soulbound)", async function () {
      const { user, validator, otherUser, testamentManager } = await loadFixture(deployAndDepositTestamentFixture);
      // Approuver pour mint le token
      await testamentManager.connect(validator).approveTestament(user.address);
      await expect(
        testamentManager.connect(user).transferFrom(user.address, otherUser.address, 1)
      ).to.be.revertedWithCustomError(testamentManager, "TransferDisabledForSBT");
    });

    it("should revert safeTransferFrom (Soulbound)", async function () {
      const { user, validator, otherUser, testamentManager } = await loadFixture(deployAndDepositTestamentFixture);
      await testamentManager.connect(validator).approveTestament(user.address);
      await expect(
        testamentManager.connect(user)["safeTransferFrom(address,address,uint256)"](
          user.address,
          otherUser.address,
          1
        )
      ).to.be.revertedWithCustomError(testamentManager, "TransferDisabledForSBT");
    });
  });

  describe("interface support", function () {
    it("should support ERC721 interface", async function () {
      const { testamentManager } = await loadFixture(deployContractsFixture);
      const result = await testamentManager.supportsInterface("0x80ac58cd");
      expect(result).to.equal(true);
    });
  
    it("should not support random interface", async function () {
      const { testamentManager } = await loadFixture(deployContractsFixture);
      const result = await testamentManager.supportsInterface("0x12345678");
      expect(result).to.equal(false);
    });
  });

  describe("burn (internal check only)", function () {
    it("should allow owner to burn the token", async function () {
      const { user, validator, testamentManager } = await loadFixture(deployAndDepositTestamentFixture);
      await testamentManager.connect(validator).approveTestament(user.address);
      await expect(
        testamentManager.connect(user).burnTestament(1)
      ).to.not.be.reverted;
    });
    
    it("should revert if non-owner tries to burn a token", async function () {
      const { user, validator, otherUser, testamentManager } = await loadFixture(deployAndDepositTestamentFixture);
      await testamentManager.connect(validator).approveTestament(user.address);
      await expect(
        testamentManager.connect(otherUser).burnTestament(1)
      ).to.be.revertedWithCustomError(testamentManager, "NotAuthorized");
    });
  });

  describe("BaseTokenURI", function () {
    it("should initialize baseTokenURI correctly", async function () {
      const { testamentManager, baseTokenURI } = await loadFixture(deployContractsFixture);
      expect(await testamentManager.baseTokenURI()).to.equal(baseTokenURI);
    });
  
    it("should allow owner to update baseTokenURI", async function () {
      const { testamentManager, owner } = await loadFixture(deployContractsFixture);
      const newUri = "https://new.fake.uri/ipfs/";
      await testamentManager.connect(owner).setBaseTokenURI(newUri);
      expect(await testamentManager.baseTokenURI()).to.equal(newUri);
    });

    it("should revert if non-owner tries to update baseTokenURI", async function () {
      const { testamentManager, user } = await loadFixture(deployContractsFixture);
      const newUri = "https://malicious.uri/ipfs/";
      
      await expect(
        testamentManager.connect(user).setBaseTokenURI(newUri)
      ).to.be.revertedWithCustomError(testamentManager, "OwnableUnauthorizedAccount").withArgs(user.address);
    });

  });

});
