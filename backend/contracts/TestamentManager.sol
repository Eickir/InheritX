// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./ValidatorPool.sol";

/**
 * @title TestamentManager
 * @author Richard Lavoura
 * @dev Manages the deposit, approval, rejection, and minting of testaments as Soulbound Tokens (SBT).
 * Testaments are stored with an associated IPFS CID and decryption key.
 * Validators are responsible for approving or rejecting deposited testaments.
 */
contract TestamentManager is ERC721, ERC721URIStorage, Ownable {

    /// @notice Counter for tracking minted token IDs.
    uint256 private _tokenIdCounter;

    /// @notice Base fee required to deposit a testament, denominated in payment tokens.
    uint256 public baseDepositFee = 100 * 10**18;

    /**
     * @notice Enum representing the processing status of a testament.
     * @dev Values:
     * - Pending: Testament has been deposited and awaits validation.
     * - Rejected: Testament has been rejected by a validator.
     * - Approved: Testament has been approved and the SBT has been minted.
     * - Outdated: Testament has been replaced by a newer deposit.
     */
    enum Status {Pending, Rejected, Approved, Outdated}

    /**
     * @notice Enum representing the validity state of a testament.
     * @dev Values:
     * - Active: Testament is current and valid.
     * - Outdated: Testament has been replaced by a newer deposit.
     */
    enum Validity {Active, Outdated}

    /**
     * @notice Structure containing details about a testament.
     * @param depositor The address of the user who deposited the testament.
     * @param cid The content identifier (CID) of the testament stored on IPFS.
     * @param decryptionKey The key used to decrypt the testament content.
     * @param depositTimestamp The timestamp when the testament was deposited.
     * @param validity The validity state of the testament.
     * @param status The processing status of the testament.
     */
    struct TestamentInfo {
        address depositor;
        string cid;
        string decryptionKey;
        uint depositTimestamp;
        Validity validity;
        Status status;
    }
    
    /**
     * @notice Mapping of user addresses to their most recent testament information.
     */
    mapping(address => TestamentInfo) private lastTestament;
    
    /**
     * @notice Mapping of user addresses to an array of their deposited testaments.
     */
    mapping(address => TestamentInfo[]) private testaments;
    
    /**
     * @notice Mapping of testament content identifiers (CID) to their associated testament information.
     */
    mapping(string => TestamentInfo) private testamentsByCid;
    
    /**
     * @notice Mapping of token IDs to their associated encrypted decryption keys.
     */
    mapping(uint256 => string) private encryptedKeys;

    // External contracts defined as immutable

    /**
     * @notice The ValidatorPool contract that manages validator addresses.
     */
    ValidatorPool public immutable validatorPool;
    
    /**
     * @notice The ERC20 token used for payment of deposit fees.
     */
    IERC20 public immutable paymentToken;  
    
    // Events

    /**
     * @notice Emitted when a new testament is deposited.
     * @param _testator The address of the testator depositing the testament.
     * @param _cid The content identifier (CID) of the deposited testament.
     */
    event TestamentDeposited(address indexed _testator, string _cid);

    /**
     * @notice Emitted when a testament is approved.
     * @param _testator The address of the testator whose testament is approved.
     * @param _cid The content identifier (CID) of the approved testament.
     */
    event TestamentApproved(address indexed _testator, string _cid);

    /**
     * @notice Emitted when a testament is rejected.
     * @param _testator The address of the testator whose testament is rejected.
     * @param _cid The content identifier (CID) of the rejected testament.
     */
    event TestamentRejected(address indexed _testator, string _cid);

    /**
     * @notice Emitted when a previous testament becomes outdated.
     * @param _testator The address of the testator whose previous testament is outdated.
     * @param _cid The content identifier (CID) of the outdated testament.
     */
    event TestamentOutdated(address indexed _testator, string _cid);

    // Custom errors

    /**
     * @notice Error thrown when the caller does not have enough tokens for the required operation.
     */
    error HasNotEnoughToken();

    /**
     * @notice Error thrown when the deposit fee provided does not match the required base deposit fee.
     * @param sent The amount sent.
     * @param required The required deposit fee.
     */
    error InvalidDepositFee(uint256 sent, uint256 required);

    /**
     * @notice Error thrown when a caller is not authorized to perform the requested operation.
     */
    error NotAuthorized();

    /**
     * @notice Error thrown when no testament is found for the given address or CID.
     */
    error NoTestamentFound();

    /**
     * @notice Error thrown when a testament has already been processed (approved or rejected).
     */
    error TestamentAlreadyProcessed();

    /**
     * @notice Error thrown when attempting to transfer a Soulbound Token (SBT), which is non-transferable.
     */
    error TransferDisabledForSBT();

    /**
     * @notice Constructor to initialize the TestamentManager contract.
     * @param _validatorPool The address of the ValidatorPool contract.
     * @param _paymentToken The address of the ERC20 token used for payment.
     */
    constructor(address _validatorPool, address _paymentToken)
        ERC721("Soulbound Testament", "SBT")
        Ownable(msg.sender)
    {
        validatorPool = ValidatorPool(_validatorPool);
        paymentToken = IERC20(_paymentToken);
    }

    /**
     * @notice Modifier to ensure the caller has enough tokens for the operation.
     * @param _amount The required token amount.
     */
    modifier requiresPayment(uint256 _amount) {
        require(paymentToken.balanceOf(msg.sender) >= _amount, HasNotEnoughToken());
        _;
    }

    /**
     * @notice Deposit a new testament. Must be approved by a validator to mint the corresponding SBT.
     * @param _cid The content identifier (CID) of the file stored on IPFS.
     * @param _decryptionKey The decryption key to decode the content of the file.
     * @param _amount The amount to send (must match baseDepositFee).
     */
    function depositTestament(string memory _cid, string calldata _decryptionKey, uint256 _amount)
        external
        requiresPayment(_amount)
    {
        require(_amount == baseDepositFee, InvalidDepositFee(_amount, baseDepositFee));
        
        // Send tokens to the contract.
        paymentToken.transferFrom(msg.sender, address(this), _amount);
        
        // Mark existing testament as Outdated if one exists.
        if (lastTestament[msg.sender].depositTimestamp != 0) {
            lastTestament[msg.sender].validity = Validity.Outdated;
            emit TestamentOutdated(msg.sender, lastTestament[msg.sender].cid);
        }
        
        TestamentInfo memory newTestament = TestamentInfo({
            depositor: msg.sender,
            cid: _cid,
            decryptionKey: _decryptionKey,
            depositTimestamp: block.timestamp,
            validity: Validity.Active,
            status: Status.Pending
        });
        
        lastTestament[msg.sender] = newTestament;
        testaments[msg.sender].push(newTestament);
        testamentsByCid[_cid] = newTestament;
        
        emit TestamentDeposited(msg.sender, _cid);
    }

    /**
     * @notice Approve a testament, minting the corresponding SBT.
     * @dev Can only be called by an authorized validator.
     * @param _testator The address of the testator whose testament is to be approved.
     */
    function approveTestament(address _testator) external {
        require(validatorPool.isAuthorized(msg.sender), NotAuthorized());
        require(lastTestament[_testator].depositTimestamp != 0, NoTestamentFound());
        require(lastTestament[_testator].status == Status.Pending, TestamentAlreadyProcessed());
        
        lastTestament[_testator].status = Status.Approved;
        _mintTestament(_testator, lastTestament[_testator].cid, lastTestament[_testator].decryptionKey);
        emit TestamentApproved(_testator, lastTestament[_testator].cid);
    }

    /**
     * @notice Reject a testament.
     * @dev Can only be called by an authorized validator.
     * @param _testator The address of the testator whose testament is to be rejected.
     */
    function rejectTestament(address _testator) external {
        require(validatorPool.isAuthorized(msg.sender), NotAuthorized());
        require(lastTestament[_testator].depositTimestamp != 0, NoTestamentFound());
        require(lastTestament[_testator].status == Status.Pending, TestamentAlreadyProcessed());
        
        lastTestament[_testator].status = Status.Rejected;
        emit TestamentRejected(_testator, lastTestament[_testator].cid);
    }

    /**
     * @notice Internal function for minting an approved testament as an SBT.
     * @param to The beneficiary address that will own the minted SBT.
     * @param _cid The content identifier (CID) of the testament.
     * @param _decryptionKey The decryption key associated with the testament.
     */
    function _mintTestament(address to, string memory _cid, string memory _decryptionKey) internal {
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, _cid);
        encryptedKeys[tokenId] = _decryptionKey;
    }

    /**
     * @notice Returns the most recent testament deposited by the caller.
     * @return The TestamentInfo struct of the caller's last testament.
     */
    function getTestament() external view returns (TestamentInfo memory) {
        return lastTestament[msg.sender];
    }

    /**
     * @notice Returns the total number of testaments deposited by the caller.
     * @return The count of testaments for the caller.
     */
    function getTestamentsNumber() external view returns(uint256) {
        return testaments[msg.sender].length;
    }

    /**
     * @notice Retrieve the decryption key for a specific testament using its CID.
     * @dev Only accessible by the depositor or an authorized validator.
     * @param _cid The content identifier (CID) of the testament.
     * @return The decryption key associated with the testament.
     */
    function getDecryptedKey(string calldata _cid) external view returns (string memory) {
        TestamentInfo memory t = testamentsByCid[_cid];
        require(t.depositTimestamp != 0, NoTestamentFound());
        require(t.depositor == msg.sender || validatorPool.isAuthorized(msg.sender), NotAuthorized());
        return t.decryptionKey;
    }

    /**
     * @notice Returns the token URI for a given token ID.
     * @dev Overrides functions from ERC721 and ERC721URIStorage.
     * @param tokenId The token ID for which to retrieve the URI.
     * @return The token URI string.
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /**
     * @notice Indicates whether the contract implements an interface.
     * @dev Overrides functions from ERC721 and ERC721URIStorage.
     * @param interfaceId The interface identifier.
     * @return True if the interface is supported, false otherwise.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @notice Internal function to update token ownership.
     * @dev Prevents transfer of SBT tokens except during minting (from address(0)) or burning (to address(0)).
     * @param to The address to which the token is being transferred.
     * @param tokenId The token ID being updated.
     * @param auth The address authorized to perform the update.
     * @return The updated owner address.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0) || to == address(0), TransferDisabledForSBT());
        return super._update(to, tokenId, auth);
    }

    /**
     * @notice Allows the token owner to burn (destroy) their SBT.
     * @param tokenId The token ID to be burned.
     */
    function burnTestament(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, NotAuthorized());
        _burn(tokenId);
    }
}