// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./ValidatorPool.sol";

contract TestamentManager is ERC721, ERC721URIStorage, Ownable {

    // stateVariable
    enum Status {Pending, Rejected, Approved, Outdated}
    enum Validity {Active,Outdated}
    uint256 private _tokenIdCounter;
    struct TestamentInfo {string cid; string decryptionKey; uint depositTimestamp; Validity validity; Status status;}
    mapping(string => string) private decryptionKeys;
    mapping(address => TestamentInfo) private lastTestament;
    mapping(address => TestamentInfo[]) private testaments;
    mapping(uint256 => string) private encryptedKeys;
    

    
    // events 
    event TestamentDeposited(address indexed _depositor, string _cid);
    event TestamentApproved(address indexed _testator, string _cid);
    event TestamentRejected(address indexed _testator, string _cid);
    event TestamentOutdated(address indexed _testator, string _cid);


    // custom errors 
    error HasNotEnoughToken();
    error TestamentAlreadyExists();


    ValidatorPool public validatorPool;
    IERC20 public paymentToken;  

    constructor(address _validatorPool, address _paymentToken)
        ERC721("Soulbound Testament", "SBT")
        Ownable(msg.sender)
    {
        validatorPool = ValidatorPool(_validatorPool);
        paymentToken = IERC20(_paymentToken);
    }

    // Modifier pour les fonctions nécessitant un paiement
    modifier requiresPayment(uint256 _amount) {
        require(
            paymentToken.balanceOf(msg.sender) >= _amount,
            HasNotEnoughToken()
        );
        _;
    }

    function depositTestament(string memory _cid, string calldata _decryptionKey, uint256 _amount) external requiresPayment(_amount) {
        paymentToken.transferFrom(msg.sender, address(this), _amount);

        if (lastTestament[msg.sender].depositTimestamp != 0) {
            lastTestament[msg.sender].validity = Validity.Outdated;
            emit TestamentOutdated(msg.sender, lastTestament[msg.sender].cid);
        }

        TestamentInfo memory _myTestament = TestamentInfo(_cid, _decryptionKey, block.timestamp, Validity.Active, Status.Pending);
        
        decryptionKeys[_cid] = _decryptionKey;
        lastTestament[msg.sender] = _myTestament;
        testaments[msg.sender].push(_myTestament);

        emit TestamentDeposited(msg.sender, _cid);
    }

    // check testament -> intervention des validateurs 
    function approveTestament(address _validator, address _testator) external {
        require(validatorPool.isAuthorized(_validator), "Not authorized notary");
        require(lastTestament[_testator].depositTimestamp != 0, "No testament found");
        require(lastTestament[_testator].status == Status.Pending, "Testament already processed");

        lastTestament[_testator].status = Status.Approved;
        mintTestament(_testator, lastTestament[_testator].cid, lastTestament[_testator].decryptionKey);
        emit TestamentApproved(_testator, lastTestament[_testator].cid);

    }

    function rejectTestament(address _validator, address _testator) external {
        require(validatorPool.isAuthorized(_validator), "Not authorized notary");
        require(lastTestament[_testator].depositTimestamp != 0, "No testament found");
        require(lastTestament[_testator].status == Status.Pending, "Testament already processed");

        lastTestament[_testator].status = Status.Rejected;
        emit TestamentRejected(_testator, lastTestament[_testator].cid);
    }

    function mintTestament(address to, string memory _cid, string memory _decryptionKey) internal {
        
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, _cid);
        encryptedKeys[tokenId] = _decryptionKey; 
    }


    // Getter pour obtenir les informations d’un testament
    function getTestament(address _testator) external view returns (TestamentInfo memory) {
        return lastTestament[_testator];
    }

    function getTestamentsNumber(address _testator) external view returns(uint256) {
        return testaments[_testator].length; 
    }

    function getDecryptedKey(address _validator, string calldata _cid) external view returns(string memory) {
        require(validatorPool.isAuthorized(_validator), "Not authorized notary");
        return decryptionKeys[_cid];
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

    // autoriser uniquement mint (from == address(0)) et burn (to == address(0))
    if (from != address(0) && to != address(0)) {
        revert("Soulbound: Transfers are disabled");
    }

    return super._update(to, tokenId, auth);
}

function burnTestament(uint256 tokenId) external {
    require(ownerOf(tokenId) == msg.sender, "Not token owner");
    _burn(tokenId);
}


}