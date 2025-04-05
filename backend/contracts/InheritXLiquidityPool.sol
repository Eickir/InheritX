// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

/**
 * @title IERC20Metadata
 * @dev Extension of the IERC20 interface with additional metadata functions.
 */
interface IERC20Metadata is IERC20 {
    /**
     * @notice Returns the symbol of the token.
     * @return The token symbol.
     */
    function symbol() external view returns (string memory);

    /**
     * @notice Returns the token balance.
     * @return The token balance.
     */
    function balanceOf() external view returns (uint256);
}

/**
 * @title InheritXLiquidityPool
 * @author Richard Lavoura
 * @dev This contract manages liquidity pool interactions via Uniswap V2.
 * It allows the owner to approve the router for token spending, add liquidity,
 * execute token swaps between two tokens, and retrieve pool reserves.
 */
contract InheritXLiquidityPool is Ownable, ReentrancyGuard {

    /// @notice Address of token A used in the liquidity pool.
    address public tokenA; 

    /// @notice Address of token B used in the liquidity pool.
    address public tokenB;

    /// @notice Uniswap V2 router contract used for liquidity operations.
    IUniswapV2Router02 public router;
    
    // Custom Errors

    /**
     * @notice Thrown when a token approval fails.
     * @param token The address of the token for which approval failed.
     */
    error TokenApprovalFailed(address token);

    /**
     * @notice Thrown when a token transfer fails.
     * @param token The address of the token for which transfer failed.
     */
    error TokenTransferFailed(address token);

    /**
     * @notice Thrown when the Uniswap pair does not exist.
     */
    error PairDoesNotExist();

    /// @notice Error thrown when the contract receives Ether
    error EtherNotAccepted();

    /**
     * @notice Constructor to initialize the liquidity pool contract.
     * @dev Sets the addresses for token A, token B, and the Uniswap V2 router.
     * @param _tokenA The address of token A.
     * @param _tokenB The address of token B.
     * @param _router The address of the Uniswap V2 router.
     */
    constructor(
        address _tokenA,
        address _tokenB,
        address _router
    ) Ownable(msg.sender)
    {
        tokenA = _tokenA;
        tokenB = _tokenB;
        router = IUniswapV2Router02(_router);
    }

    /**
     * @notice Emitted when a token swap is executed.
     * @param _tokenSent The symbol of the token that was sent.
     * @param _tokenReceived The symbol of the token that was received.
     * @param _balanceBeforeTokenReceived The receiver's token balance before the swap.
     * @param _balanceAfterTokenReceived The receiver's token balance after the swap.
     */
    event TokenSwapped(string _tokenSent, string _tokenReceived, uint256 _balanceBeforeTokenReceived, uint256 _balanceAfterTokenReceived);

    /**
     * @notice Approve the Uniswap V2 router to spend the contract's full balance of token A and token B.
     * @dev Only the contract owner can call this function.
     */
    function approveRouter() external onlyOwner {
        uint256 balanceA = IERC20(tokenA).balanceOf(address(this));
        uint256 balanceB = IERC20(tokenB).balanceOf(address(this));

        require(IERC20(tokenA).approve(address(router), balanceA), TokenApprovalFailed(tokenA));
        require(IERC20(tokenB).approve(address(router), balanceB), TokenApprovalFailed(tokenB));
    }

    /**
     * @notice Add liquidity to the Uniswap V2 pool.
     * @dev Approves the router to spend the tokens and then calls addLiquidity on the router.
     * @param amountADesired The desired amount of token A to add.
     * @param amountBDesired The desired amount of token B to add.
     * @param amountAMin The minimum amount of token A to add.
     * @param amountBMin The minimum amount of token B to add.
     */
    function addLiquidity(
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) external onlyOwner {

        // Approve router to spend the tokens
        IERC20(tokenA).approve(address(router), amountADesired);
        IERC20(tokenB).approve(address(router), amountBDesired);


        router.addLiquidity(
            address(tokenA),
            address(tokenB),
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin,
            msg.sender,
            block.timestamp + 600
        );
    }

    /**
     * @notice Swap token A for token B via the Uniswap V2 router.
     * @dev Transfers token A from the caller to the contract, approves the router, and executes the swap.
     * The swapped tokens are sent directly to the caller.
     * @param amountIn The amount of token A to swap.
     * @param amountOutMin The minimum amount of token B expected.
     * @param deadline The timestamp by which the swap must be executed.
     */
    function swapTokenAForTokenB(
        uint amountIn,
        uint amountOutMin,
        uint deadline
    ) external nonReentrant {
        
        uint256 balanceBefore = IERC20Metadata(tokenB).balanceOf(msg.sender);

        // Transfer token A from the user to this contract.
        require(IERC20(tokenA).transferFrom(msg.sender, address(this), amountIn),TokenTransferFailed(tokenA));
        // Approve the router to spend token A.
        require(IERC20(tokenA).approve(address(router), amountIn),TokenApprovalFailed(tokenA));

        // Define the swap path: token A -> token B.
        address[] memory path = new address[](2);
        path[0] = tokenA;
        path[1] = tokenB;

        // Execute the swap on Uniswap V2.
        router.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            msg.sender, // Tokens received will be sent directly to the user.
            deadline
        );

        uint256 balanceAfter = IERC20Metadata(tokenB).balanceOf(msg.sender);

        emit TokenSwapped(
            IERC20Metadata(tokenA).symbol(),
            IERC20Metadata(tokenB).symbol(),
            balanceBefore,
            balanceAfter
        );
    }

    /**
     * @notice Swap token B for token A via the Uniswap V2 router.
     * @dev Transfers token B from the caller to the contract, approves the router, and executes the swap.
     * The swapped tokens are sent directly to the caller.
     * @param amountIn The amount of token B to swap.
     * @param amountOutMin The minimum amount of token A expected.
     * @param deadline The timestamp by which the swap must be executed.
     */
    function swapTokenBForTokenA(
        uint amountIn,
        uint amountOutMin,
        uint deadline
    ) external nonReentrant {

        uint256 balanceBefore = IERC20Metadata(tokenA).balanceOf(msg.sender);

        // Transfer token B from the user to this contract.
        require(IERC20(tokenB).transferFrom(msg.sender, address(this), amountIn),TokenTransferFailed(tokenB));
        // Approve the router to spend token B.
        require(IERC20(tokenB).approve(address(router), amountIn),TokenApprovalFailed(tokenB));

        // Define the swap path: token B -> token A.
        address[] memory path = new address[](2);
        path[0] = tokenB;
        path[1] = tokenA;

        // Execute the swap on Uniswap V2.
        router.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            msg.sender, // Tokens received will be sent directly to the user.
            deadline
        );

        uint256 balanceAfter = IERC20Metadata(tokenA).balanceOf(msg.sender);

        emit TokenSwapped(
            IERC20Metadata(tokenB).symbol(),
            IERC20Metadata(tokenA).symbol(),
            balanceBefore,
            balanceAfter
        );
    }

    /**
     * @notice Retrieve the liquidity reserves for token A and token B from the Uniswap V2 pair.
     * @dev Fetches the reserves from the pair contract and returns them in tokenA/tokenB order.
     * @return reserveA The reserve amount for token A.
     * @return reserveB The reserve amount for token B.
     */
    function getReserves() external view returns (uint112 reserveA, uint112 reserveB) {
        address pair = IUniswapV2Factory(router.factory()).getPair(tokenA, tokenB);
        require(pair != address(0), PairDoesNotExist());

        (uint112 reserve0, uint112 reserve1, ) = IUniswapV2Pair(pair).getReserves();

        // Return reserves in tokenA/tokenB order.
        (reserveA, reserveB) = tokenA < tokenB ? (reserve0, reserve1) : (reserve1, reserve0);
    }

    /**
     * @notice Reverts any direct Ether transfers to the contract.
     * @dev This function is triggered when the contract receives Ether with empty calldata.
     */
    receive() external payable {
        revert EtherNotAccepted();
    }

    /**
     * @notice Reverts any calls to non-existent functions or direct Ether transfers with calldata.
     * @dev This function is triggered when no other function matches the call data.
     */
    fallback() external payable {
        revert EtherNotAccepted();
    }
}
