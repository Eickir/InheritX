// SPDX-License-identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract InheritXLiquidityPool is Ownable {

    // add addresses of the two tokens used for the liquidity pool + router from UniswapV2
    address public tokenA; 
    address public tokenB;
    IUniswapV2Router02 public router;
    
    // take address of token A and B, router and owner inside the constructor 
    // POC purpose: create liquidity when the contract is deployed 
    constructor(
        address _tokenA,
        address _tokenB,
        address _router
    ) 
    Ownable(msg.sender)
    {
        tokenA = _tokenA;
        tokenB = _tokenB;
        router = IUniswapV2Router02(_router);
    }

    function approveRouter() external onlyOwner {
            IERC20(tokenA).approve(address(router), type(uint256).max);
            IERC20(tokenB).approve(address(router), type(uint256).max);
        }

    function addLiquidity(
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) external onlyOwner {
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

}
