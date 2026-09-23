// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {Test} from "forge-std/Test.sol";
import {NirmalaPair} from "../src/NirmalaPair.sol";
import {UQ112x112} from "../src/libraries/UQ112x112.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockNirmalaCallee} from "./mocks/MockNirmalaCallee.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @dev Test-only harness exposing NirmalaPair's internal _update; mint/burn/swap/sync call it for real in later steps.
contract NirmalaPairHarness is NirmalaPair {
    function update(uint256 balance0, uint256 balance1, uint112 _reserve0, uint112 _reserve1) external {
        _update(balance0, balance1, _reserve0, _reserve1);
    }
}

contract NirmalaPairTest is Test {
    using UQ112x112 for uint224;

    NirmalaPairHarness private pair;
    MockERC20 private token0;
    MockERC20 private token1;

    address private factory = makeAddr("factory");
    address private to = makeAddr("to");

    function setUp() public {
        token0 = new MockERC20("Token0", "TK0");
        token1 = new MockERC20("Token1", "TK1");

        vm.prank(factory);
        pair = new NirmalaPairHarness();
    }

    function _initialize() private {
        vm.prank(factory);
        pair.initialize(address(token0), address(token1));
    }

    function test_getReserves_startsAtZero() public view {
        (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast) = pair.getReserves();
        assertEq(reserve0, 0);
        assertEq(reserve1, 0);
        assertEq(blockTimestampLast, 0);
    }

    function test_factory_isSetToDeployer() public view {
        assertEq(pair.factory(), factory);
    }

    function test_initialize_setsTokens() public {
        _initialize();
        assertEq(pair.token0(), address(token0));
        assertEq(pair.token1(), address(token1));
    }

    function test_initialize_revertsIfNotFactory() public {
        vm.expectRevert(NirmalaPair.NirmalaPair__Forbidden.selector);
        pair.initialize(address(token0), address(token1));
    }

    function test_initialize_revertsIfAlreadyInitialized() public {
        _initialize();
        vm.prank(factory);
        vm.expectRevert(NirmalaPair.NirmalaPair__AlreadyInitialized.selector);
        pair.initialize(address(token0), address(token1));
    }

    function test_update_revertsOnOverflowBalance0() public {
        vm.expectRevert(NirmalaPair.NirmalaPair__Overflow.selector);
        pair.update(uint256(type(uint112).max) + 1, 100e18, 0, 0);
    }

    function test_update_revertsOnOverflowBalance1() public {
        vm.expectRevert(NirmalaPair.NirmalaPair__Overflow.selector);
        pair.update(100e18, uint256(type(uint112).max) + 1, 0, 0);
    }

    function test_update_setsReservesFromBalances() public {
        pair.update(100e18, 200e18, 0, 0);

        (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast) = pair.getReserves();
        assertEq(reserve0, 100e18);
        assertEq(reserve1, 200e18);
        assertEq(blockTimestampLast, uint32(block.timestamp % 2 ** 32));
    }

    function test_update_emitsSync() public {
        vm.expectEmit(false, false, false, true, address(pair));
        emit NirmalaPair.Sync(100e18, 200e18);
        pair.update(100e18, 200e18, 0, 0);
    }

    function test_update_skipsTwapOnFirstCallBecauseReservesAreZero() public {
        // _reserve0/_reserve1 passed in are 0 (nothing to derive a price from yet).
        pair.update(100e18, 200e18, 0, 0);
        assertEq(pair.price0CumulativeLast(), 0);
        assertEq(pair.price1CumulativeLast(), 0);
    }

    function test_update_skipsTwapWhenTimeElapsedIsZero() public {
        pair.update(100e18, 200e18, 0, 0);
        // Second call in the same block: timeElapsed == 0, so no accumulation despite non-zero reserves.
        pair.update(150e18, 250e18, 100e18, 200e18);

        assertEq(pair.price0CumulativeLast(), 0);
        assertEq(pair.price1CumulativeLast(), 0);
    }

    function test_update_accumulatesTwapAfterTimeElapses() public {
        pair.update(100e18, 200e18, 0, 0);
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();

        vm.warp(block.timestamp + 10);
        pair.update(150e18, 250e18, reserve0, reserve1);

        uint256 expectedPrice0 = uint256(UQ112x112.encode(reserve1).uqdiv(reserve0)) * 10;
        uint256 expectedPrice1 = uint256(UQ112x112.encode(reserve0).uqdiv(reserve1)) * 10;
        assertEq(pair.price0CumulativeLast(), expectedPrice0);
        assertEq(pair.price1CumulativeLast(), expectedPrice1);
    }

    function testFuzz_update_accumulatesTwapMatchingManualCalculation(
        uint112 _reserve0,
        uint112 _reserve1,
        uint32 timeDelta
    ) public {
        _reserve0 = uint112(bound(_reserve0, 1, type(uint112).max));
        _reserve1 = uint112(bound(_reserve1, 1, type(uint112).max));
        timeDelta = uint32(bound(timeDelta, 1, 365 days));

        pair.update(_reserve0, _reserve1, 0, 0);

        vm.warp(block.timestamp + timeDelta);
        pair.update(_reserve0, _reserve1, _reserve0, _reserve1);

        uint256 expectedPrice0 = uint256(UQ112x112.encode(_reserve1).uqdiv(_reserve0)) * timeDelta;
        uint256 expectedPrice1 = uint256(UQ112x112.encode(_reserve0).uqdiv(_reserve1)) * timeDelta;
        assertEq(pair.price0CumulativeLast(), expectedPrice0);
        assertEq(pair.price1CumulativeLast(), expectedPrice1);
    }

    function test_mint_firstLiquidity_locksMinimumLiquidityAndMintsRest() public {
        _initialize();

        uint256 amount0 = 4e18;
        uint256 amount1 = 9e18;
        token0.mint(address(pair), amount0);
        token1.mint(address(pair), amount1);

        uint256 liquidity = pair.mint(to);

        uint256 expectedTotal = Math.sqrt(amount0 * amount1);
        assertEq(pair.balanceOf(pair.BURN_ADDRESS()), pair.MINIMUM_LIQUIDITY());
        assertEq(liquidity, expectedTotal - pair.MINIMUM_LIQUIDITY());
        assertEq(pair.balanceOf(to), liquidity);
        assertEq(pair.totalSupply(), expectedTotal);

        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        assertEq(reserve0, amount0);
        assertEq(reserve1, amount1);
    }

    function test_mint_firstLiquidity_emitsMint() public {
        _initialize();
        token0.mint(address(pair), 4e18);
        token1.mint(address(pair), 9e18);

        vm.expectEmit(true, false, false, true, address(pair));
        emit NirmalaPair.Mint(address(this), 4e18, 9e18);
        pair.mint(to);
    }

    function test_mint_subsequentLiquidity_mintsProportionalShare() public {
        _initialize();
        token0.mint(address(pair), 4e18);
        token1.mint(address(pair), 9e18);
        pair.mint(to);

        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        uint256 totalSupplyBefore = pair.totalSupply();

        // Add exactly half of each existing reserve.
        uint256 amount0 = uint256(reserve0) / 2;
        uint256 amount1 = uint256(reserve1) / 2;
        token0.mint(address(pair), amount0);
        token1.mint(address(pair), amount1);

        uint256 liquidity = pair.mint(to);

        uint256 expected = Math.min((amount0 * totalSupplyBefore) / reserve0, (amount1 * totalSupplyBefore) / reserve1);
        assertEq(liquidity, expected);
    }

    function test_mint_revertsIfInsufficientLiquidityMinted() public {
        _initialize();
        // sqrt(1000 * 1000) == MINIMUM_LIQUIDITY exactly, so liquidity minted to `to` is 0.
        token0.mint(address(pair), pair.MINIMUM_LIQUIDITY());
        token1.mint(address(pair), pair.MINIMUM_LIQUIDITY());

        vm.expectRevert(NirmalaPair.NirmalaPair__InsufficientLiquidityMinted.selector);
        pair.mint(to);
    }

    function testFuzz_mint_firstLiquidity_matchesManualCalculation(uint256 amount0, uint256 amount1) public {
        amount0 = bound(amount0, 1e6, 1e30);
        amount1 = bound(amount1, 1e6, 1e30);
        vm.assume(Math.sqrt(amount0 * amount1) > pair.MINIMUM_LIQUIDITY());

        _initialize();
        token0.mint(address(pair), amount0);
        token1.mint(address(pair), amount1);

        uint256 liquidity = pair.mint(to);

        assertEq(liquidity, Math.sqrt(amount0 * amount1) - pair.MINIMUM_LIQUIDITY());
    }

    function _mintInitialLiquidity(uint256 amount0, uint256 amount1) private returns (uint256 liquidity) {
        _initialize();
        token0.mint(address(pair), amount0);
        token1.mint(address(pair), amount1);
        liquidity = pair.mint(to);
    }

    function test_burn_returnsProportionalShareAndBurnsLp() public {
        uint256 liquidity = _mintInitialLiquidity(4e18, 9e18);
        uint256 totalSupplyBefore = pair.totalSupply();
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();

        vm.prank(to);
        pair.transfer(address(pair), liquidity);

        uint256 expectedAmount0 = (liquidity * reserve0) / totalSupplyBefore;
        uint256 expectedAmount1 = (liquidity * reserve1) / totalSupplyBefore;

        vm.prank(to);
        (uint256 amount0, uint256 amount1) = pair.burn(to);

        assertEq(amount0, expectedAmount0);
        assertEq(amount1, expectedAmount1);
        assertEq(token0.balanceOf(to), amount0);
        assertEq(token1.balanceOf(to), amount1);
        assertEq(pair.totalSupply(), totalSupplyBefore - liquidity);
        assertEq(pair.balanceOf(address(pair)), 0);
    }

    function test_burn_emitsBurn() public {
        uint256 liquidity = _mintInitialLiquidity(4e18, 9e18);

        vm.prank(to);
        pair.transfer(address(pair), liquidity);

        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        uint256 totalSupplyBefore = pair.totalSupply();
        uint256 expectedAmount0 = (liquidity * reserve0) / totalSupplyBefore;
        uint256 expectedAmount1 = (liquidity * reserve1) / totalSupplyBefore;

        vm.expectEmit(true, true, false, true, address(pair));
        emit NirmalaPair.Burn(to, expectedAmount0, expectedAmount1, to);
        vm.prank(to);
        pair.burn(to);
    }

    function test_burn_updatesReserves() public {
        uint256 liquidity = _mintInitialLiquidity(4e18, 9e18);

        vm.prank(to);
        pair.transfer(address(pair), liquidity);

        vm.prank(to);
        pair.burn(to);

        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        assertEq(reserve0, token0.balanceOf(address(pair)));
        assertEq(reserve1, token1.balanceOf(address(pair)));
    }

    function test_burn_revertsIfInsufficientLiquidityBurned() public {
        _mintInitialLiquidity(4e18, 9e18);

        // Send a single wei of LP token to the pair — proportional share floors to 0 for both tokens.
        vm.prank(to);
        pair.transfer(address(pair), 1);

        vm.expectRevert(NirmalaPair.NirmalaPair__InsufficientLiquidityBurned.selector);
        pair.burn(to);
    }

    function testFuzz_burn_matchesManualCalculation(uint256 amount0, uint256 amount1, uint256 burnFraction) public {
        amount0 = bound(amount0, 1e6, 1e30);
        amount1 = bound(amount1, 1e6, 1e30);
        vm.assume(Math.sqrt(amount0 * amount1) > pair.MINIMUM_LIQUIDITY());

        uint256 liquidity = _mintInitialLiquidity(amount0, amount1);
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        uint256 totalSupplyBefore = pair.totalSupply();

        burnFraction = bound(burnFraction, 1, liquidity);
        // burn() divides by totalSupply (not `liquidity`), so the filter must match that exactly.
        vm.assume(burnFraction * reserve0 / totalSupplyBefore > 0 && burnFraction * reserve1 / totalSupplyBefore > 0);

        vm.prank(to);
        pair.transfer(address(pair), burnFraction);

        uint256 expectedAmount0 = (burnFraction * reserve0) / totalSupplyBefore;
        uint256 expectedAmount1 = (burnFraction * reserve1) / totalSupplyBefore;

        vm.prank(to);
        (uint256 amount0Out, uint256 amount1Out) = pair.burn(to);

        assertEq(amount0Out, expectedAmount0);
        assertEq(amount1Out, expectedAmount1);
    }

    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) private pure returns (uint256) {
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        return numerator / denominator;
    }

    function test_swap_revertsIfBothAmountsZero() public {
        vm.expectRevert(NirmalaPair.NirmalaPair__InsufficientOutputAmount.selector);
        pair.swap(0, 0, to, "");
    }

    function test_swap_revertsIfInsufficientLiquidity() public {
        _mintInitialLiquidity(100e18, 100e18);
        vm.expectRevert(NirmalaPair.NirmalaPair__InsufficientLiquidity.selector);
        pair.swap(0, 100e18, to, "");
    }

    function test_swap_revertsIfToIsToken0OrToken1() public {
        _mintInitialLiquidity(100e18, 100e18);
        vm.expectRevert(NirmalaPair.NirmalaPair__InvalidTo.selector);
        pair.swap(1e18, 0, address(token0), "");
    }

    function test_swap_revertsIfInsufficientInputAmount() public {
        _mintInitialLiquidity(100e18, 100e18);
        // No token transferred in before calling swap.
        vm.expectRevert(NirmalaPair.NirmalaPair__InsufficientInputAmount.selector);
        pair.swap(0, 1e18, to, "");
    }

    function test_swap_revertsOnKViolation() public {
        _mintInitialLiquidity(100e18, 100e18);

        uint256 amountIn = 10e18;
        // No-fee amountOut is strictly larger than the fee-adjusted one the K check requires.
        uint256 amountOutNoFee = (amountIn * 100e18) / (100e18 + amountIn);

        token0.mint(address(this), amountIn);
        token0.transfer(address(pair), amountIn);

        vm.expectRevert(NirmalaPair.NirmalaPair__K.selector);
        pair.swap(0, amountOutNoFee, to, "");
    }

    function test_swap_token0ForToken1_succeedsWithCorrectFee() public {
        _mintInitialLiquidity(100e18, 100e18);

        uint256 amountIn = 10e18;
        uint256 expectedOut = _getAmountOut(amountIn, 100e18, 100e18);

        token0.mint(address(this), amountIn);
        token0.transfer(address(pair), amountIn);
        pair.swap(0, expectedOut, to, "");

        assertEq(token1.balanceOf(to), expectedOut);
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        assertEq(reserve0, 100e18 + amountIn);
        assertEq(reserve1, 100e18 - expectedOut);
    }

    function test_swap_emitsSwap() public {
        _mintInitialLiquidity(100e18, 100e18);

        uint256 amountIn = 10e18;
        uint256 expectedOut = _getAmountOut(amountIn, 100e18, 100e18);

        token0.mint(address(this), amountIn);
        token0.transfer(address(pair), amountIn);

        vm.expectEmit(true, true, false, true, address(pair));
        emit NirmalaPair.Swap(address(this), amountIn, 0, 0, expectedOut, to);
        pair.swap(0, expectedOut, to, "");
    }

    function test_swap_flashSwap_succeedsWhenCalleeRepaysEnough() public {
        _mintInitialLiquidity(100e18, 100e18);
        MockNirmalaCallee callee = new MockNirmalaCallee();

        uint256 amount0Out = 10e18;
        uint256 repay0 = 10.031e18; // > amount0Out * 1000 / 997, comfortably covers the 0.3% fee
        token0.mint(address(callee), repay0 - amount0Out);

        bytes memory data = abi.encode(address(token0), address(token1), repay0, uint256(0));
        pair.swap(amount0Out, 0, address(callee), data);

        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        assertEq(reserve0, 100e18 - amount0Out + repay0);
        assertEq(reserve1, 100e18);
    }

    function test_swap_flashSwap_revertsWhenCalleeDoesNotRepayEnough() public {
        _mintInitialLiquidity(100e18, 100e18);
        MockNirmalaCallee callee = new MockNirmalaCallee();

        uint256 amount0Out = 10e18;
        // Repays exactly what it borrowed, no fee — must fail the K check.
        bytes memory data = abi.encode(address(token0), address(token1), amount0Out, uint256(0));

        vm.expectRevert(NirmalaPair.NirmalaPair__K.selector);
        pair.swap(amount0Out, 0, address(callee), data);
    }

    function testFuzz_swap_kInvariantHolds(uint256 reserveAmount, uint256 amountIn) public {
        reserveAmount = bound(reserveAmount, 1e18, 1e24);
        amountIn = bound(amountIn, 1e6, reserveAmount);

        _mintInitialLiquidity(reserveAmount, reserveAmount);
        uint256 expectedOut = _getAmountOut(amountIn, reserveAmount, reserveAmount);
        vm.assume(expectedOut > 0);

        token0.mint(address(this), amountIn);
        token0.transfer(address(pair), amountIn);
        pair.swap(0, expectedOut, to, "");

        assertEq(token1.balanceOf(to), expectedOut);
    }

    function test_skim_transfersExcessBalanceToRecipient() public {
        _mintInitialLiquidity(100e18, 100e18);

        // Tokens sent directly to the pair, bypassing mint() — stray balance above recorded reserves.
        token0.mint(address(pair), 5e18);
        token1.mint(address(pair), 7e18);

        address skimRecipient = makeAddr("skimRecipient");
        pair.skim(skimRecipient);

        assertEq(token0.balanceOf(skimRecipient), 5e18);
        assertEq(token1.balanceOf(skimRecipient), 7e18);
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        assertEq(token0.balanceOf(address(pair)), reserve0);
        assertEq(token1.balanceOf(address(pair)), reserve1);
    }

    function test_skim_transfersNothingWhenBalanceMatchesReserves() public {
        _mintInitialLiquidity(100e18, 100e18);

        address skimRecipient = makeAddr("skimRecipient");
        pair.skim(skimRecipient);

        assertEq(token0.balanceOf(skimRecipient), 0);
        assertEq(token1.balanceOf(skimRecipient), 0);
    }

    function test_sync_updatesReservesToMatchBalances() public {
        _mintInitialLiquidity(100e18, 100e18);

        token0.mint(address(pair), 5e18);
        token1.mint(address(pair), 7e18);
        pair.sync();

        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        assertEq(reserve0, 105e18);
        assertEq(reserve1, 107e18);
    }

    function test_sync_emitsSync() public {
        _mintInitialLiquidity(100e18, 100e18);
        token0.mint(address(pair), 5e18);

        vm.expectEmit(false, false, false, true, address(pair));
        emit NirmalaPair.Sync(105e18, 100e18);
        pair.sync();
    }
}
