// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {Test} from "forge-std/Test.sol";
import {NirmalaLibrary} from "../src/libraries/NirmalaLibrary.sol";
import {NirmalaFactory} from "../src/NirmalaFactory.sol";
import {NirmalaPair} from "../src/NirmalaPair.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

/// @dev External wrapper so vm.expectRevert can catch reverts from NirmalaLibrary's internal functions.
contract NirmalaLibraryHarness {
    function sortTokens(address tokenA, address tokenB) external pure returns (address, address) {
        return NirmalaLibrary.sortTokens(tokenA, tokenB);
    }

    function pairFor(address factory, address tokenA, address tokenB) external pure returns (address) {
        return NirmalaLibrary.pairFor(factory, tokenA, tokenB);
    }

    function getReserves(address factory, address tokenA, address tokenB) external view returns (uint256, uint256) {
        return NirmalaLibrary.getReserves(factory, tokenA, tokenB);
    }

    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) external pure returns (uint256) {
        return NirmalaLibrary.quote(amountA, reserveA, reserveB);
    }

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) external pure returns (uint256) {
        return NirmalaLibrary.getAmountOut(amountIn, reserveIn, reserveOut);
    }

    function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut) external pure returns (uint256) {
        return NirmalaLibrary.getAmountIn(amountOut, reserveIn, reserveOut);
    }

    function getAmountsOut(address factory, uint256 amountIn, address[] memory path)
        external
        view
        returns (uint256[] memory)
    {
        return NirmalaLibrary.getAmountsOut(factory, amountIn, path);
    }

    function getAmountsIn(address factory, uint256 amountOut, address[] memory path)
        external
        view
        returns (uint256[] memory)
    {
        return NirmalaLibrary.getAmountsIn(factory, amountOut, path);
    }
}

contract NirmalaLibraryTest is Test {
    NirmalaLibraryHarness private harness;
    NirmalaFactory private factory;
    MockERC20 private tokenA;
    MockERC20 private tokenB;
    MockERC20 private tokenC;

    function setUp() public {
        harness = new NirmalaLibraryHarness();
        factory = new NirmalaFactory();
        tokenA = new MockERC20("TokenA", "TKA");
        tokenB = new MockERC20("TokenB", "TKB");
        tokenC = new MockERC20("TokenC", "TKC");
    }

    function _createFundedPair(MockERC20 x, MockERC20 y, uint256 amountX, uint256 amountY)
        private
        returns (NirmalaPair pair)
    {
        address pairAddr = factory.createPair(address(x), address(y));
        pair = NirmalaPair(pairAddr);
        x.mint(pairAddr, amountX);
        y.mint(pairAddr, amountY);
        pair.mint(address(this));
    }

    // ---------------------------------------------------------------------
    // PAIR_INIT_CODE_HASH guard
    // ---------------------------------------------------------------------

    function test_pairInitCodeHash_matchesNirmalaPairCreationCode() public pure {
        assertEq(NirmalaLibrary.PAIR_INIT_CODE_HASH, keccak256(type(NirmalaPair).creationCode));
    }

    // ---------------------------------------------------------------------
    // sortTokens
    // ---------------------------------------------------------------------

    function test_sortTokens_sortsRegardlessOfInputOrder() public view {
        (address token0, address token1) = harness.sortTokens(address(tokenA), address(tokenB));
        (address token0Reversed, address token1Reversed) = harness.sortTokens(address(tokenB), address(tokenA));
        assertLt(uint160(token0), uint160(token1));
        assertEq(token0, token0Reversed);
        assertEq(token1, token1Reversed);
    }

    function test_sortTokens_revertsIfIdenticalAddresses() public {
        vm.expectRevert(NirmalaLibrary.NirmalaLibrary__IdenticalAddresses.selector);
        harness.sortTokens(address(tokenA), address(tokenA));
    }

    function test_sortTokens_revertsIfTokenAIsZeroAddress() public {
        vm.expectRevert(NirmalaLibrary.NirmalaLibrary__ZeroAddress.selector);
        harness.sortTokens(address(0), address(tokenB));
    }

    function test_sortTokens_revertsIfTokenBIsZeroAddress() public {
        vm.expectRevert(NirmalaLibrary.NirmalaLibrary__ZeroAddress.selector);
        harness.sortTokens(address(tokenA), address(0));
    }

    // ---------------------------------------------------------------------
    // pairFor
    // ---------------------------------------------------------------------

    function test_pairFor_matchesFactoryDeployedAddress() public {
        address deployed = factory.createPair(address(tokenA), address(tokenB));
        assertEq(harness.pairFor(address(factory), address(tokenA), address(tokenB)), deployed);
        assertEq(harness.pairFor(address(factory), address(tokenB), address(tokenA)), deployed);
    }

    // ---------------------------------------------------------------------
    // getReserves
    // ---------------------------------------------------------------------

    function test_getReserves_returnsInCallerInputOrder() public {
        _createFundedPair(tokenA, tokenB, 1000e18, 2000e18);

        (uint256 reserveA, uint256 reserveB) = harness.getReserves(address(factory), address(tokenA), address(tokenB));
        assertEq(reserveA, 1000e18);
        assertEq(reserveB, 2000e18);

        (uint256 reserveB2, uint256 reserveA2) = harness.getReserves(address(factory), address(tokenB), address(tokenA));
        assertEq(reserveA2, 1000e18);
        assertEq(reserveB2, 2000e18);
    }

    // ---------------------------------------------------------------------
    // quote
    // ---------------------------------------------------------------------

    function test_quote_returnsProportionalAmount() public view {
        assertEq(harness.quote(100e18, 1000e18, 2000e18), 200e18);
    }

    function test_quote_revertsIfAmountAIsZero() public {
        vm.expectRevert(NirmalaLibrary.NirmalaLibrary__InsufficientAmount.selector);
        harness.quote(0, 1000e18, 2000e18);
    }

    function test_quote_revertsIfReserveAIsZero() public {
        vm.expectRevert(NirmalaLibrary.NirmalaLibrary__InsufficientLiquidity.selector);
        harness.quote(100e18, 0, 2000e18);
    }

    function test_quote_revertsIfReserveBIsZero() public {
        vm.expectRevert(NirmalaLibrary.NirmalaLibrary__InsufficientLiquidity.selector);
        harness.quote(100e18, 1000e18, 0);
    }

    // ---------------------------------------------------------------------
    // getAmountOut
    // ---------------------------------------------------------------------

    function test_getAmountOut_returnsExpectedValueWithFee() public view {
        assertEq(harness.getAmountOut(1000, 1000, 1000), 499);
    }

    function test_getAmountOut_revertsIfAmountInIsZero() public {
        vm.expectRevert(NirmalaLibrary.NirmalaLibrary__InsufficientInputAmount.selector);
        harness.getAmountOut(0, 1000, 1000);
    }

    function test_getAmountOut_revertsIfReserveInIsZero() public {
        vm.expectRevert(NirmalaLibrary.NirmalaLibrary__InsufficientLiquidity.selector);
        harness.getAmountOut(1000, 0, 1000);
    }

    function test_getAmountOut_revertsIfReserveOutIsZero() public {
        vm.expectRevert(NirmalaLibrary.NirmalaLibrary__InsufficientLiquidity.selector);
        harness.getAmountOut(1000, 1000, 0);
    }

    function test_getAmountOut_matchesRealSwap() public {
        NirmalaPair pair = _createFundedPair(tokenA, tokenB, 1000e18, 1000e18);
        bool aIsToken0 = pair.token0() == address(tokenA);

        uint256 amountIn = 100e18;
        (uint256 reserveIn, uint256 reserveOut) =
            harness.getReserves(address(factory), address(tokenA), address(tokenB));
        uint256 amountOut = harness.getAmountOut(amountIn, reserveIn, reserveOut);

        tokenA.mint(address(pair), amountIn);
        (uint256 amount0Out, uint256 amount1Out) = aIsToken0 ? (uint256(0), amountOut) : (amountOut, uint256(0));
        pair.swap(amount0Out, amount1Out, address(this), "");

        assertEq(tokenB.balanceOf(address(this)), amountOut);
    }

    function test_getAmountOut_plusOneRevertsRealSwap() public {
        NirmalaPair pair = _createFundedPair(tokenA, tokenB, 1000e18, 1000e18);
        bool aIsToken0 = pair.token0() == address(tokenA);

        uint256 amountIn = 100e18;
        (uint256 reserveIn, uint256 reserveOut) =
            harness.getReserves(address(factory), address(tokenA), address(tokenB));
        uint256 amountOut = harness.getAmountOut(amountIn, reserveIn, reserveOut) + 1;

        tokenA.mint(address(pair), amountIn);
        (uint256 amount0Out, uint256 amount1Out) = aIsToken0 ? (uint256(0), amountOut) : (amountOut, uint256(0));
        vm.expectRevert(NirmalaPair.NirmalaPair__K.selector);
        pair.swap(amount0Out, amount1Out, address(this), "");
    }

    // ---------------------------------------------------------------------
    // getAmountIn
    // ---------------------------------------------------------------------

    function test_getAmountIn_returnsExpectedValueWithFee() public view {
        assertEq(harness.getAmountIn(500, 1000, 1000), 1004);
    }

    function test_getAmountIn_revertsIfAmountOutIsZero() public {
        vm.expectRevert(NirmalaLibrary.NirmalaLibrary__InsufficientOutputAmount.selector);
        harness.getAmountIn(0, 1000, 1000);
    }

    function test_getAmountIn_revertsIfReserveInIsZero() public {
        vm.expectRevert(NirmalaLibrary.NirmalaLibrary__InsufficientLiquidity.selector);
        harness.getAmountIn(500, 0, 1000);
    }

    function test_getAmountIn_revertsIfReserveOutIsZero() public {
        vm.expectRevert(NirmalaLibrary.NirmalaLibrary__InsufficientLiquidity.selector);
        harness.getAmountIn(500, 1000, 0);
    }

    function test_getAmountIn_revertsIfAmountOutGreaterOrEqualToReserveOut() public {
        vm.expectRevert(NirmalaLibrary.NirmalaLibrary__InsufficientLiquidity.selector);
        harness.getAmountIn(1000, 1000, 1000);
    }

    function test_getAmountIn_matchesRealSwap() public {
        NirmalaPair pair = _createFundedPair(tokenA, tokenB, 1000e18, 1000e18);
        bool aIsToken0 = pair.token0() == address(tokenA);

        uint256 amountOut = 100e18;
        (uint256 reserveIn, uint256 reserveOut) =
            harness.getReserves(address(factory), address(tokenA), address(tokenB));
        uint256 amountIn = harness.getAmountIn(amountOut, reserveIn, reserveOut);

        tokenA.mint(address(pair), amountIn);
        (uint256 amount0Out, uint256 amount1Out) = aIsToken0 ? (uint256(0), amountOut) : (amountOut, uint256(0));
        pair.swap(amount0Out, amount1Out, address(this), "");

        assertEq(tokenB.balanceOf(address(this)), amountOut);
    }

    function test_getAmountIn_minusOneRevertsRealSwap() public {
        NirmalaPair pair = _createFundedPair(tokenA, tokenB, 1000e18, 1000e18);
        bool aIsToken0 = pair.token0() == address(tokenA);

        uint256 amountOut = 100e18;
        (uint256 reserveIn, uint256 reserveOut) =
            harness.getReserves(address(factory), address(tokenA), address(tokenB));
        uint256 amountIn = harness.getAmountIn(amountOut, reserveIn, reserveOut) - 1;

        tokenA.mint(address(pair), amountIn);
        (uint256 amount0Out, uint256 amount1Out) = aIsToken0 ? (uint256(0), amountOut) : (amountOut, uint256(0));
        vm.expectRevert(NirmalaPair.NirmalaPair__K.selector);
        pair.swap(amount0Out, amount1Out, address(this), "");
    }

    // ---------------------------------------------------------------------
    // getAmountsOut / getAmountsIn (multi-hop)
    // ---------------------------------------------------------------------

    function _threeTokenPath() private returns (address[] memory path) {
        _createFundedPair(tokenA, tokenB, 1000e18, 2000e18);
        _createFundedPair(tokenB, tokenC, 1500e18, 500e18);
        path = new address[](3);
        path[0] = address(tokenA);
        path[1] = address(tokenB);
        path[2] = address(tokenC);
    }

    function test_getAmountsOut_chainsThroughPath() public {
        address[] memory path = _threeTokenPath();
        uint256 amountIn = 10e18;

        (uint256 reserveA, uint256 reserveB) = harness.getReserves(address(factory), address(tokenA), address(tokenB));
        uint256 expectedHop1 = harness.getAmountOut(amountIn, reserveA, reserveB);
        (uint256 reserveB2, uint256 reserveC) = harness.getReserves(address(factory), address(tokenB), address(tokenC));
        uint256 expectedHop2 = harness.getAmountOut(expectedHop1, reserveB2, reserveC);

        uint256[] memory amounts = harness.getAmountsOut(address(factory), amountIn, path);
        assertEq(amounts.length, 3);
        assertEq(amounts[0], amountIn);
        assertEq(amounts[1], expectedHop1);
        assertEq(amounts[2], expectedHop2);
    }

    function test_getAmountsOut_revertsIfPathTooShort() public {
        address[] memory path = new address[](1);
        path[0] = address(tokenA);
        vm.expectRevert(NirmalaLibrary.NirmalaLibrary__InvalidPath.selector);
        harness.getAmountsOut(address(factory), 1e18, path);
    }

    function test_getAmountsIn_chainsThroughPath() public {
        address[] memory path = _threeTokenPath();
        uint256 amountOut = 10e18;

        (uint256 reserveB2, uint256 reserveC) = harness.getReserves(address(factory), address(tokenB), address(tokenC));
        uint256 expectedHop2 = harness.getAmountIn(amountOut, reserveB2, reserveC);
        (uint256 reserveA, uint256 reserveB) = harness.getReserves(address(factory), address(tokenA), address(tokenB));
        uint256 expectedHop1 = harness.getAmountIn(expectedHop2, reserveA, reserveB);

        uint256[] memory amounts = harness.getAmountsIn(address(factory), amountOut, path);
        assertEq(amounts.length, 3);
        assertEq(amounts[2], amountOut);
        assertEq(amounts[1], expectedHop2);
        assertEq(amounts[0], expectedHop1);
    }

    function test_getAmountsIn_revertsIfPathTooShort() public {
        address[] memory path = new address[](0);
        vm.expectRevert(NirmalaLibrary.NirmalaLibrary__InvalidPath.selector);
        harness.getAmountsIn(address(factory), 1e18, path);
    }

    // ---------------------------------------------------------------------
    // Fuzz
    // ---------------------------------------------------------------------

    function testFuzz_getAmountOut_isAlwaysLessThanReserveOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        public
        view
    {
        amountIn = bound(amountIn, 1, type(uint112).max);
        reserveIn = bound(reserveIn, 1, type(uint112).max);
        reserveOut = bound(reserveOut, 1, type(uint112).max);

        uint256 amountOut = harness.getAmountOut(amountIn, reserveIn, reserveOut);
        assertLt(amountOut, reserveOut);
    }

    function testFuzz_getAmountIn_roundTripCoversRequestedOutput(
        uint256 amountOut,
        uint256 reserveIn,
        uint256 reserveOut
    ) public view {
        reserveIn = bound(reserveIn, 1, type(uint112).max);
        reserveOut = bound(reserveOut, 2, type(uint112).max);
        // Bounded to half the reserve: past that, amountIn blows up toward infinity as the trade
        // approaches draining the pool, which would overflow the unrelated getAmountOut call below.
        amountOut = bound(amountOut, 1, reserveOut / 2);

        uint256 amountIn = harness.getAmountIn(amountOut, reserveIn, reserveOut);
        uint256 amountOutRoundTrip = harness.getAmountOut(amountIn, reserveIn, reserveOut);
        assertGe(amountOutRoundTrip, amountOut);
    }

    function testFuzz_quote_isProportional(uint256 amountA, uint256 reserveA, uint256 reserveB) public view {
        amountA = bound(amountA, 1, type(uint112).max);
        reserveA = bound(reserveA, 1, type(uint112).max);
        reserveB = bound(reserveB, 1, type(uint112).max);

        uint256 amountB = harness.quote(amountA, reserveA, reserveB);
        assertEq(amountB, (amountA * reserveB) / reserveA);
    }
}
