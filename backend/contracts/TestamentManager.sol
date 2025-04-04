// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./ValidatorPool.sol";

contract TestamentManager is ERC721, ERC721URIStorage, Ownable {

    // stateVariable
    uint256 private _tokenIdCounter;
    uint256 public baseDepositFee = 100 * 10**18;
    enum Status {Pending, Rejected, Approved, Outdated}
    enum Validity {Active,Outdated}


    struct TestamentInfo {address depositor; string cid; string decryptionKey; uint depositTimestamp; Validity validity; Status status;}
    
    
    mapping(address => TestamentInfo) private lastTestament;
    mapping(address => TestamentInfo[]) private testaments;
    mapping(string => TestamentInfo) private testamentsByCid;
    mapping(uint256 => string) private encryptedKeys;

    // External contrats defined as immutable
    ValidatorPool public immutable validatorPool;
    IERC20 public immutable paymentToken;  
    
    // events 
    event TestamentDeposited(address indexed _testator, string _cid);
    event TestamentApproved(address indexed _testator, string _cid);
    event TestamentRejected(address indexed _testator, string _cid);
    event TestamentOutdated(address indexed _testator, string _cid);


    // custom errors to clarify errors + optimize gas
    error HasNotEnoughToken();
    error InvalidDepositFee(uint256 sent, uint256 required);
    error NotAuthorized();
    error NoTestamentFound();
    error TestamentAlreadyProcessed();
    error TransferDisabledForSBT();

    constructor(address _validatorPool, address _paymentToken)
        ERC721("Soulbound Testament", "SBT")
        Ownable(msg.sender)
    {
        validatorPool = ValidatorPool(_validatorPool);
        paymentToken = IERC20(_paymentToken);
    }

    // Modifier for functions where INHX tokens are required 
    modifier requiresPayment(uint256 _amount) {
        require(paymentToken.balanceOf(msg.sender) >= _amount, HasNotEnoughToken());
        _;
    }


    /**
     * @notice Deposit a new testament. Must be approved by a validator to send the SBT to the testator
     * @param _cid ID of the file sent to IPFS
     * @param _decryptionKey Decryption key to decode the content of the file
     * @param _amount Amout to send (must match baseDepositFee)
     */
    function depositTestament(string memory _cid, string calldata _decryptionKey, uint256 _amount)
        external
        requiresPayment(_amount)
    {
        require(_amount == baseDepositFee, InvalidDepositFee(_amount, baseDepositFee));
        
        // Send token to the contract
        paymentToken.transferFrom(msg.sender, address(this), _amount);
        
        // Mark existing testament as Outdated
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
     * @notice Approve a testament (called by an authorized validator)
     * @param _testator testator address
     */
    function approveTestament(address _testator) external {
        require(validatorPool.isAuthorized(msg.sender),NotAuthorized());
        require(lastTestament[_testator].depositTimestamp != 0, NoTestamentFound());
        require(lastTestament[_testator].status == Status.Pending, TestamentAlreadyProcessed());
        
        lastTestament[_testator].status = Status.Approved;
        _mintTestament(_testator, lastTestament[_testator].cid, lastTestament[_testator].decryptionKey);
        emit TestamentApproved(_testator, lastTestament[_testator].cid);
    }

    /**
     * @notice Reject a testament (called by an authorized validator)
     * @param _testator testator address
     */
    function rejectTestament(address _testator) external {
        require(validatorPool.isAuthorized(msg.sender),NotAuthorized());
        require(lastTestament[_testator].depositTimestamp != 0, NoTestamentFound());
        require(lastTestament[_testator].status == Status.Pending, TestamentAlreadyProcessed());
        
        lastTestament[_testator].status = Status.Rejected;
        emit TestamentRejected(_testator, lastTestament[_testator].cid);
    }

    /**
     * @notice Internal function for minting an approved testament
     * @param to Benfeciary address of the SBT. In this case, it will be the validator
     * @param _cid ID of SBT content
     * @param _decryptionKey Decryption key to decode the content of the SBT
     */
    function _mintTestament(address to, string memory _cid, string memory _decryptionKey) internal {
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, _cid);
        encryptedKeys[tokenId] = _decryptionKey;
    }


    /// @notice Returns the last deposit of the sender
    function getTestament() external view returns (TestamentInfo memory) {
        return lastTestament[msg.sender];
    }

    /// @notice Returns the count of sender deposits 
    function getTestamentsNumber() external view returns(uint256) {
        return testaments[msg.sender].length;
    }

    /**
     * @notice Retrieve decryption key for a specific ID.
     * Only accessible to depositor or testator.
     * @param _cid Identifiant de contenu du testament
     */
    function getDecryptedKey(string calldata _cid) external view returns (string memory) {
        TestamentInfo memory t = testamentsByCid[_cid];
        require(t.depositTimestamp != 0, NoTestamentFound());
        require(t.depositor == msg.sender || validatorPool.isAuthorized(msg.sender), NotAuthorized());
        return t.decryptionKey;
    }


    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _update(
    address to,
    uint256 tokenId,
    address auth
) internal override returns (address) {
    address from = _ownerOf(tokenId);

    require(from == address(0) || to == address(0), TransferDisabledForSBT()) ;
    return super._update(to, tokenId, auth);
}

    /// @notice Allow token owner to burn it
    function burnTestament(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, NotAuthorized());
        _burn(tokenId);
    }


}