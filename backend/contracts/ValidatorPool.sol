// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ValidatorPool
 * @author Richard Lavoura
 * @dev This contract allows users to stake tokens in order to join the validator pool.
 * Users must stake at least a minimum amount of tokens to be considered validators.
 * They can also withdraw their staked tokens and leave the pool.
 */
contract ValidatorPool is Ownable {
    
    /// @notice The ERC20 token used for staking.
    IERC20 public stakingToken;
    
    /// @notice The minimum amount of tokens required to stake.
    uint256 public minStakeAmount;

    /// @notice Mapping of user addresses to their staked token amounts.
    mapping(address => uint256) public stakes;
    
    /// @notice Mapping of user addresses to their validator status.
    mapping(address => bool) public isValidator;

    // Events

    /**
     * @notice Emitted when a user stakes tokens.
     * @param user The address of the user staking tokens.
     * @param amount The amount of tokens staked.
     */
    event TokensStaked(address indexed user, uint256 amount);
    
    /**
     * @notice Emitted when a user withdraws staked tokens.
     * @param user The address of the user withdrawing tokens.
     * @param amount The amount of tokens withdrawn.
     */
    event TokensWithdrawn(address indexed user, uint256 amount);
    
    /**
     * @notice Emitted when a user is added to the validator pool.
     * @param user The address of the user added to the pool.
     */
    event AddedToPool(address indexed user);
    
    /**
     * @notice Emitted when a user is removed from the validator pool.
     * @param user The address of the user removed from the pool.
     */
    event RemovedFromPool(address indexed user);
    
    /**
     * @notice Emitted when the minimum staking amount is updated.
     * @param newMinStake The new minimum stake amount.
     */
    event MinStakeUpdated(uint256 newMinStake);

    // Custom errors 

    error DepositBelowMinimumRequired();
    error ValidatorAlreadyInPool();
    error NoTokensToWithdraw();

    /**
     * @notice Constructor to initialize the staking token and minimum stake amount.
     * @param _stakingToken The address of the ERC20 token used for staking.
     * @param _minStakeAmount The minimum amount of tokens required to become a validator.
     */
    constructor(address _stakingToken, uint256 _minStakeAmount) Ownable(msg.sender) {
        stakingToken = IERC20(_stakingToken);
        minStakeAmount = _minStakeAmount;
    } 

    /**
     * @notice Stake tokens to join the validator pool.
     * @dev Transfers tokens from the caller to the contract. Reverts if the caller is already a validator 
     * or if the staked amount is below the minimum required.
     * @param _amount The amount of tokens to stake.
     */
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

    /**
     * @notice Withdraw staked tokens and leave the validator pool.
     * @dev Transfers all staked tokens from the contract to the caller. Reverts if the caller has no tokens staked.
     */
    function withdraw() external {
        uint256 amount = stakes[msg.sender];
        require(amount > 0, NoTokensToWithdraw());

        stakes[msg.sender] = 0;
        isValidator[msg.sender] = false;

        stakingToken.transfer(msg.sender, amount);

        emit TokensWithdrawn(msg.sender, amount);
        emit RemovedFromPool(msg.sender);
    }

    /**
     * @notice Check if an address is a validator.
     * @param user The address to check.
     * @return True if the address is a validator, false otherwise.
     */
    function isAuthorized(address user) external view returns (bool) {
        return isValidator[user];
    }

    /**
     * @notice Update the minimum staking amount required to join the validator pool.
     * @dev Only callable by the contract owner.
     * @param _amount The new minimum stake amount.
     */
    function updateMinStakeAmount(uint256 _amount) external onlyOwner {
        minStakeAmount = _amount;
        emit MinStakeUpdated(_amount);
    }
}
