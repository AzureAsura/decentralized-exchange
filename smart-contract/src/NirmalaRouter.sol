// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {NirmalaFactory} from "./NirmalaFactory.sol";
import {NirmalaPair} from "./NirmalaPair.sol";
import {NirmalaLibrary} from "./libraries/NirmalaLibrary.sol";
import {IWETH} from "./interfaces/IWETH.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

contract NirmalaRouter {
    using SafeERC20 for IERC20;

    error NirmalaRouter__Expired();
    error NirmalaRouter__OnlyWETH();
    error NirmalaRouter__InsufficientAAmount();
    error NirmalaRouter__InsufficientBAmount();
    error NirmalaRouter__WETHTransferFailed();
    error NirmalaRouter__InsufficientAllowance();
    error NirmalaRouter__InsufficientOutputAmount();
    error NirmalaRouter__ExcessiveInputAmount();
    error NirmalaRouter__InvalidPath();

    address public immutable factory;
    address public immutable WETH;

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, NirmalaRouter__Expired());
        _;
    }

    constructor(address _factory, address _WETH) {
        factory = _factory;
        WETH = _WETH;
    }

    receive() external payable {
        require(msg.sender == WETH, NirmalaRouter__OnlyWETH());
    }

    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal returns (uint256 amountA, uint256 amountB) {
        if (NirmalaFactory(factory).getPair(tokenA, tokenB) == address(0)) {
            NirmalaFactory(factory).createPair(tokenA, tokenB);
        }
        (uint256 reserveA, uint256 reserveB) = NirmalaLibrary.getReserves(factory, tokenA, tokenB);
        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = NirmalaLibrary.quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, NirmalaRouter__InsufficientBAmount());
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = NirmalaLibrary.quote(amountBDesired, reserveB, reserveA);
                assert(amountAOptimal <= amountADesired);
                require(amountAOptimal >= amountAMin, NirmalaRouter__InsufficientAAmount());
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        (amountA, amountB) = _addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);
        liquidity = _settleLiquidity(tokenA, tokenB, amountA, amountB, to);
    }

    function _settleLiquidity(address tokenA, address tokenB, uint256 amountA, uint256 amountB, address to)
        internal
        returns (uint256 liquidity)
    {
        address pair = NirmalaLibrary.pairFor(factory, tokenA, tokenB);
        IERC20(tokenA).safeTransferFrom(msg.sender, pair, amountA);
        IERC20(tokenB).safeTransferFrom(msg.sender, pair, amountB);
        liquidity = NirmalaPair(pair).mint(to);
    }

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable ensure(deadline) returns (uint256 amountToken, uint256 amountETH, uint256 liquidity) {
        (amountToken, amountETH) =
            _addLiquidity(token, WETH, amountTokenDesired, msg.value, amountTokenMin, amountETHMin);
        address pair = NirmalaLibrary.pairFor(factory, token, WETH);
        IERC20(token).safeTransferFrom(msg.sender, pair, amountToken);
        IWETH(WETH).deposit{value: amountETH}();
        require(IWETH(WETH).transfer(pair, amountETH), NirmalaRouter__WETHTransferFailed());
        liquidity = NirmalaPair(pair).mint(to);
        if (msg.value > amountETH) Address.sendValue(payable(msg.sender), msg.value - amountETH);
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) public ensure(deadline) returns (uint256 amountA, uint256 amountB) {
        address pair = NirmalaLibrary.pairFor(factory, tokenA, tokenB);
        IERC20(pair).safeTransferFrom(msg.sender, pair, liquidity);
        (uint256 amount0, uint256 amount1) = NirmalaPair(pair).burn(to);
        (address token0,) = NirmalaLibrary.sortTokens(tokenA, tokenB);
        (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);
        require(amountA >= amountAMin, NirmalaRouter__InsufficientAAmount());
        require(amountB >= amountBMin, NirmalaRouter__InsufficientBAmount());
    }

    function removeLiquidityETH(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) public ensure(deadline) returns (uint256 amountToken, uint256 amountETH) {
        (amountToken, amountETH) = removeLiquidity(
            token, WETH, liquidity, amountTokenMin, amountETHMin, address(this), deadline
        );
        IERC20(token).safeTransfer(to, amountToken);
        IWETH(WETH).withdraw(amountETH);
        Address.sendValue(payable(to), amountETH);
    }

    function _permit(address pair, uint256 liquidity, uint256 deadline, bool approveMax, uint8 v, bytes32 r, bytes32 s)
        internal
    {
        uint256 value = approveMax ? type(uint256).max : liquidity;
        try NirmalaPair(pair).permit(msg.sender, address(this), value, deadline, v, r, s) {}
        catch {
            require(
                IERC20(pair).allowance(msg.sender, address(this)) >= liquidity, NirmalaRouter__InsufficientAllowance()
            );
        }
    }

    function removeLiquidityWithPermit(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline,
        bool approveMax,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 amountA, uint256 amountB) {
        _permit(NirmalaLibrary.pairFor(factory, tokenA, tokenB), liquidity, deadline, approveMax, v, r, s);
        (amountA, amountB) = removeLiquidity(tokenA, tokenB, liquidity, amountAMin, amountBMin, to, deadline);
    }

    function removeLiquidityETHWithPermit(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline,
        bool approveMax,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 amountToken, uint256 amountETH) {
        _permit(NirmalaLibrary.pairFor(factory, token, WETH), liquidity, deadline, approveMax, v, r, s);
        (amountToken, amountETH) = removeLiquidityETH(token, liquidity, amountTokenMin, amountETHMin, to, deadline);
    }

    function _swap(uint256[] memory amounts, address[] calldata path, address _to) internal {
        for (uint256 i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = NirmalaLibrary.sortTokens(input, output);
            uint256 amountOut = amounts[i + 1];
            (uint256 amount0Out, uint256 amount1Out) =
                input == token0 ? (uint256(0), amountOut) : (amountOut, uint256(0));
            address to = i < path.length - 2 ? NirmalaLibrary.pairFor(factory, output, path[i + 2]) : _to;
            NirmalaPair(NirmalaLibrary.pairFor(factory, input, output)).swap(amount0Out, amount1Out, to, new bytes(0));
        }
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        amounts = NirmalaLibrary.getAmountsOut(factory, amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, NirmalaRouter__InsufficientOutputAmount());
        IERC20(path[0]).safeTransferFrom(msg.sender, NirmalaLibrary.pairFor(factory, path[0], path[1]), amounts[0]);
        _swap(amounts, path, to);
    }

    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        amounts = NirmalaLibrary.getAmountsIn(factory, amountOut, path);
        require(amounts[0] <= amountInMax, NirmalaRouter__ExcessiveInputAmount());
        IERC20(path[0]).safeTransferFrom(msg.sender, NirmalaLibrary.pairFor(factory, path[0], path[1]), amounts[0]);
        _swap(amounts, path, to);
    }

    function swapExactETHForTokens(uint256 amountOutMin, address[] calldata path, address to, uint256 deadline)
        external
        payable
        ensure(deadline)
        returns (uint256[] memory amounts)
    {
        amounts = NirmalaLibrary.getAmountsOut(factory, msg.value, path);
        require(path[0] == WETH, NirmalaRouter__InvalidPath());
        require(amounts[amounts.length - 1] >= amountOutMin, NirmalaRouter__InsufficientOutputAmount());
        IWETH(WETH).deposit{value: amounts[0]}();
        require(
            IWETH(WETH).transfer(NirmalaLibrary.pairFor(factory, path[0], path[1]), amounts[0]),
            NirmalaRouter__WETHTransferFailed()
        );
        _swap(amounts, path, to);
    }

    function swapTokensForExactETH(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        amounts = NirmalaLibrary.getAmountsIn(factory, amountOut, path);
        require(path[path.length - 1] == WETH, NirmalaRouter__InvalidPath());
        require(amounts[0] <= amountInMax, NirmalaRouter__ExcessiveInputAmount());
        IERC20(path[0]).safeTransferFrom(msg.sender, NirmalaLibrary.pairFor(factory, path[0], path[1]), amounts[0]);
        _swap(amounts, path, address(this));
        IWETH(WETH).withdraw(amounts[amounts.length - 1]);
        Address.sendValue(payable(to), amounts[amounts.length - 1]);
    }

    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        amounts = NirmalaLibrary.getAmountsOut(factory, amountIn, path);
        require(path[path.length - 1] == WETH, NirmalaRouter__InvalidPath());
        require(amounts[amounts.length - 1] >= amountOutMin, NirmalaRouter__InsufficientOutputAmount());
        IERC20(path[0]).safeTransferFrom(msg.sender, NirmalaLibrary.pairFor(factory, path[0], path[1]), amounts[0]);
        _swap(amounts, path, address(this));
        IWETH(WETH).withdraw(amounts[amounts.length - 1]);
        Address.sendValue(payable(to), amounts[amounts.length - 1]);
    }

    function swapETHForExactTokens(uint256 amountOut, address[] calldata path, address to, uint256 deadline)
        external
        payable
        ensure(deadline)
        returns (uint256[] memory amounts)
    {
        amounts = NirmalaLibrary.getAmountsIn(factory, amountOut, path);
        require(path[0] == WETH, NirmalaRouter__InvalidPath());
        require(amounts[0] <= msg.value, NirmalaRouter__ExcessiveInputAmount());
        IWETH(WETH).deposit{value: amounts[0]}();
        require(
            IWETH(WETH).transfer(NirmalaLibrary.pairFor(factory, path[0], path[1]), amounts[0]),
            NirmalaRouter__WETHTransferFailed()
        );
        _swap(amounts, path, to);
        if (msg.value > amounts[0]) Address.sendValue(payable(msg.sender), msg.value - amounts[0]);
    }

    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) external pure returns (uint256 amountB) {
        return NirmalaLibrary.quote(amountA, reserveA, reserveB);
    }

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        external
        pure
        returns (uint256 amountOut)
    {
        return NirmalaLibrary.getAmountOut(amountIn, reserveIn, reserveOut);
    }

    function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut)
        external
        pure
        returns (uint256 amountIn)
    {
        return NirmalaLibrary.getAmountIn(amountOut, reserveIn, reserveOut);
    }

    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts) {
        return NirmalaLibrary.getAmountsOut(factory, amountIn, path);
    }

    function getAmountsIn(uint256 amountOut, address[] calldata path) external view returns (uint256[] memory amounts) {
        return NirmalaLibrary.getAmountsIn(factory, amountOut, path);
    }
}
