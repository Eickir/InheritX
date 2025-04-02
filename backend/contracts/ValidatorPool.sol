// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ValidatorPool is Ownable {
    
    IERC20 public stakingToken;
    uint256 public minStakeAmount;

    mapping(address => uint256) public stakes;
    mapping(address => bool) public isValidator;

    // events
    event TokensStaked(address indexed user, uint256 amount);
    event TokensWithdrawn(address indexed user, uint256 amount);
    event AddedToPool(address indexed user);
    event RemovedFromPool(address indexed user);
    event MinStakeUpdated(uint256 newMinStake);

    // custom errors 
    error DepositBelowMinimumRequired();
    error ValidatorAlreadyInPool();
    error NoTokensToWithdraw();

    constructor(address _stakingToken, uint256 _minStakeAmount) 
        Ownable(msg.sender)
    {
        stakingToken = IERC20(_stakingToken);
        minStakeAmount = _minStakeAmount;
    } 

    // Déposer des tokens pour rejoindre le réseau
    function stake(uint256 _amount) external {
        require(isValidator[msg.sender] == false, ValidatorAlreadyInPool());
        require(_amount >= minStakeAmount, DepositBelowMinimumRequired());

        stakingToken.transferFrom(msg.sender, address(this), _amount);
        stakes[msg.sender] += _amount;

        if (stakes[msg.sender] == minStakeAmount) {
            isValidator[msg.sender] = true;
            emit AddedToPool(msg.sender);
        }

        emit TokensStaked(msg.sender, _amount);
    }

    // Retirer les tokens verrouillés et sortir du réseau
    function withdraw(address user) external {
        uint256 amount = stakes[msg.sender];
        require(amount > 0, NoTokensToWithdraw());

        stakes[msg.sender] = 0;
        isValidator[msg.sender] = false;

        stakingToken.transfer(msg.sender, amount);

        emit TokensWithdrawn(msg.sender, amount);
        emit RemovedFromPool(msg.sender);
    }

    // Vérifie si une adresse est dans la pool
    function isAuthorized(address user) external view returns (bool) {
        return isValidator[user];
    }

    // Admin : mettre à jour le montant minimal requis
    function updateMinStakeAmount(uint256 _amount) external onlyOwner {
        minStakeAmount = _amount;
        emit MinStakeUpdated(_amount);
    }
}