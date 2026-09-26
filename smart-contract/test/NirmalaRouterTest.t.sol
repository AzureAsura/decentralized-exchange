// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {Test} from "forge-std/Test.sol";
import {NirmalaRouter} from "../src/NirmalaRouter.sol";
import {NirmalaFactory} from "../src/NirmalaFactory.sol";
import {NirmalaPair} from "../src/NirmalaPair.sol";
import {NirmalaLibrary} from "../src/libraries/NirmalaLibrary.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {WETH9} from "./mocks/WETH9.sol";
import {FalseTransferWETH} from "./mocks/FalseTransferWETH.sol";

contract NirmalaRouterTest is Test {
    bytes32 private constant PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    NirmalaFactory private factory;
    WETH9 private weth;
    NirmalaRouter private router;
    MockERC20 private tokenA;
    MockERC20 private tokenB;
    MockERC20 private tokenC;

    uint256 private constant ALICE_PK = 0xA11CE;
    address private alice;

    receive() external payable {}

    function setUp() public {
        vm.warp(1_700_000_000);
        factory = new NirmalaFactory();
        weth = new WETH9();
        router = new NirmalaRouter(address(factory), address(weth));
        tokenA = new MockERC20("TokenA", "TKA");
        tokenB = new MockERC20("TokenB", "TKB");
        tokenC = new MockERC20("TokenC", "TKC");
        alice = vm.addr(ALICE_PK);
        vm.deal(address(this), 100 ether);
        vm.deal(alice, 100 ether);
    }

    function _seedPool(MockERC20 x, MockERC20 y, uint256 amountX, uint256 amountY)
        private
        returns (address pairAddr, uint256 liquidity)
    {
        x.mint(address(this), amountX);
        y.mint(address(this), amountY);
        x.approve(address(router), amountX);
        y.approve(address(router), amountY);
        (,, liquidity) =
            router.addLiquidity(address(x), address(y), amountX, amountY, 0, 0, address(this), block.timestamp);
        pairAddr = factory.getPair(address(x), address(y));
    }

    function _signPermit(NirmalaPair pair, uint256 pk, address spender, uint256 value, uint256 deadline)
        private
        view
        returns (uint8 v, bytes32 r, bytes32 s)
    {
        address owner = vm.addr(pk);
        bytes32 structHash = keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, pair.nonces(owner), deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", pair.DOMAIN_SEPARATOR(), structHash));
        (v, r, s) = vm.sign(pk, digest);
    }

    function _seedETHPool(MockERC20 token, uint256 amountToken, uint256 amountETH) private {
        token.mint(address(this), amountToken);
        token.approve(address(router), amountToken);
        router.addLiquidityETH{value: amountETH}(address(token), amountToken, 0, 0, address(this), block.timestamp);
    }

    // ---------------------------------------------------------------------
    // deadline / receive guards
    // ---------------------------------------------------------------------

    function test_addLiquidity_revertsIfDeadlineExpired() public {
        vm.expectRevert(NirmalaRouter.NirmalaRouter__Expired.selector);
        router.addLiquidity(address(tokenA), address(tokenB), 1e18, 1e18, 0, 0, address(this), block.timestamp - 1);
    }

    function test_receive_revertsIfNotFromWETH() public {
        vm.expectRevert(NirmalaRouter.NirmalaRouter__OnlyWETH.selector);
        (bool success,) = address(router).call{value: 1 ether}("");
        success;
    }

    // ---------------------------------------------------------------------
    // addLiquidity
    // ---------------------------------------------------------------------

    function test_addLiquidity_firstDeposit_usesDesiredAmounts() public {
        tokenA.mint(address(this), 1000e18);
        tokenB.mint(address(this), 1000e18);
        tokenA.approve(address(router), type(uint256).max);
        tokenB.approve(address(router), type(uint256).max);

        (uint256 amountA, uint256 amountB, uint256 liquidity) =
            router.addLiquidity(address(tokenA), address(tokenB), 100e18, 200e18, 0, 0, address(this), block.timestamp);

        assertEq(amountA, 100e18);
        assertEq(amountB, 200e18);
        assertGt(liquidity, 0);
        assertEq(tokenA.balanceOf(address(router)), 0);
        assertEq(tokenB.balanceOf(address(router)), 0);
    }

    function test_addLiquidity_subsequentDeposit_usesOptimalBWhenBoundByA() public {
        _seedPool(tokenA, tokenB, 1000e18, 2000e18);

        tokenA.mint(address(this), 100e18);
        tokenB.mint(address(this), 1000e18);
        tokenA.approve(address(router), 100e18);
        tokenB.approve(address(router), 1000e18);

        (uint256 amountA, uint256 amountB,) =
            router.addLiquidity(address(tokenA), address(tokenB), 100e18, 1000e18, 0, 0, address(this), block.timestamp);

        assertEq(amountA, 100e18);
        assertEq(amountB, 200e18);
    }

    function test_addLiquidity_subsequentDeposit_usesOptimalAWhenBoundByB() public {
        _seedPool(tokenA, tokenB, 1000e18, 2000e18);

        tokenA.mint(address(this), 1000e18);
        tokenB.mint(address(this), 50e18);
        tokenA.approve(address(router), 1000e18);
        tokenB.approve(address(router), 50e18);

        (uint256 amountA, uint256 amountB,) =
            router.addLiquidity(address(tokenA), address(tokenB), 1000e18, 50e18, 0, 0, address(this), block.timestamp);

        assertEq(amountB, 50e18);
        assertEq(amountA, 25e18);
    }

    function test_addLiquidity_revertsIfBAmountBelowMin() public {
        _seedPool(tokenA, tokenB, 1000e18, 2000e18);

        tokenA.mint(address(this), 100e18);
        tokenB.mint(address(this), 1000e18);
        tokenA.approve(address(router), 100e18);
        tokenB.approve(address(router), 1000e18);

        vm.expectRevert(NirmalaRouter.NirmalaRouter__InsufficientBAmount.selector);
        router.addLiquidity(
            address(tokenA), address(tokenB), 100e18, 1000e18, 0, 300e18, address(this), block.timestamp
        );
    }

    function test_addLiquidity_revertsIfAAmountBelowMin() public {
        _seedPool(tokenA, tokenB, 1000e18, 2000e18);

        tokenA.mint(address(this), 1000e18);
        tokenB.mint(address(this), 50e18);
        tokenA.approve(address(router), 1000e18);
        tokenB.approve(address(router), 50e18);

        vm.expectRevert(NirmalaRouter.NirmalaRouter__InsufficientAAmount.selector);
        router.addLiquidity(address(tokenA), address(tokenB), 1000e18, 50e18, 30e18, 0, address(this), block.timestamp);
    }

    // ---------------------------------------------------------------------
    // addLiquidityETH
    // ---------------------------------------------------------------------

    function test_addLiquidityETH_firstDeposit_usesFullMsgValue() public {
        tokenA.mint(address(this), 1000e18);
        tokenA.approve(address(router), type(uint256).max);

        uint256 balanceBefore = address(this).balance;
        (uint256 amountToken, uint256 amountETH, uint256 liquidity) =
            router.addLiquidityETH{value: 10 ether}(address(tokenA), 100e18, 0, 0, address(this), block.timestamp);

        assertEq(amountToken, 100e18);
        assertEq(amountETH, 10 ether);
        assertGt(liquidity, 0);
        assertEq(balanceBefore - address(this).balance, 10 ether);
        assertEq(address(router).balance, 0);
    }

    function test_addLiquidityETH_refundsUnusedETH() public {
        tokenA.mint(address(this), 2000e18);
        tokenA.approve(address(router), type(uint256).max);
        router.addLiquidityETH{value: 10 ether}(address(tokenA), 1000e18, 0, 0, address(this), block.timestamp);

        uint256 balanceBefore = address(this).balance;
        (uint256 amountToken, uint256 amountETH,) =
            router.addLiquidityETH{value: 5 ether}(address(tokenA), 100e18, 0, 0, address(this), block.timestamp);

        assertEq(amountToken, 100e18);
        assertEq(amountETH, 1 ether);
        assertEq(balanceBefore - address(this).balance, 1 ether);
        assertEq(address(router).balance, 0);
    }

    function test_addLiquidityETH_revertsIfWETHTransferReturnsFalse() public {
        FalseTransferWETH badWeth = new FalseTransferWETH();
        NirmalaRouter badRouter = new NirmalaRouter(address(factory), address(badWeth));

        tokenA.mint(address(this), 1000e18);
        tokenA.approve(address(badRouter), type(uint256).max);

        vm.expectRevert(NirmalaRouter.NirmalaRouter__WETHTransferFailed.selector);
        badRouter.addLiquidityETH{value: 1 ether}(address(tokenA), 100e18, 0, 0, address(this), block.timestamp);
    }

    // ---------------------------------------------------------------------
    // removeLiquidity
    // ---------------------------------------------------------------------

    function test_removeLiquidity_returnsTokensInInputAndReversedOrder() public {
        (address pairAddr, uint256 liquidity) = _seedPool(tokenA, tokenB, 1000e18, 2000e18);
        NirmalaPair pair = NirmalaPair(pairAddr);
        pair.approve(address(router), liquidity);

        uint256 half = liquidity / 2;
        uint256 totalSupply = pair.totalSupply();
        uint256 balA = tokenA.balanceOf(pairAddr);
        uint256 balB = tokenB.balanceOf(pairAddr);
        uint256 expectedA1 = (half * balA) / totalSupply;
        uint256 expectedB1 = (half * balB) / totalSupply;

        (uint256 amountA1, uint256 amountB1) =
            router.removeLiquidity(address(tokenA), address(tokenB), half, 0, 0, address(this), block.timestamp);
        assertEq(amountA1, expectedA1);
        assertEq(amountB1, expectedB1);

        uint256 remaining = liquidity - half;
        totalSupply = pair.totalSupply();
        balA = tokenA.balanceOf(pairAddr);
        balB = tokenB.balanceOf(pairAddr);
        uint256 expectedB2 = (remaining * balB) / totalSupply;
        uint256 expectedA2 = (remaining * balA) / totalSupply;

        (uint256 amountB2, uint256 amountA2) =
            router.removeLiquidity(address(tokenB), address(tokenA), remaining, 0, 0, address(this), block.timestamp);
        assertEq(amountA2, expectedA2);
        assertEq(amountB2, expectedB2);
    }

    function test_removeLiquidity_revertsIfAAmountBelowMin() public {
        (address pairAddr, uint256 liquidity) = _seedPool(tokenA, tokenB, 1000e18, 2000e18);
        NirmalaPair(pairAddr).approve(address(router), liquidity);

        vm.expectRevert(NirmalaRouter.NirmalaRouter__InsufficientAAmount.selector);
        router.removeLiquidity(
            address(tokenA), address(tokenB), liquidity, type(uint256).max, 0, address(this), block.timestamp
        );
    }

    function test_removeLiquidity_revertsIfBAmountBelowMin() public {
        (address pairAddr, uint256 liquidity) = _seedPool(tokenA, tokenB, 1000e18, 2000e18);
        NirmalaPair(pairAddr).approve(address(router), liquidity);

        vm.expectRevert(NirmalaRouter.NirmalaRouter__InsufficientBAmount.selector);
        router.removeLiquidity(
            address(tokenA), address(tokenB), liquidity, 0, type(uint256).max, address(this), block.timestamp
        );
    }

    // ---------------------------------------------------------------------
    // removeLiquidityETH
    // ---------------------------------------------------------------------

    function test_removeLiquidityETH_returnsTokenAndETH() public {
        tokenA.mint(address(this), 1000e18);
        tokenA.approve(address(router), type(uint256).max);
        (,, uint256 liquidity) =
            router.addLiquidityETH{value: 10 ether}(address(tokenA), 1000e18, 0, 0, address(this), block.timestamp);

        address pairAddr = factory.getPair(address(tokenA), address(weth));
        NirmalaPair(pairAddr).approve(address(router), liquidity);

        uint256 tokenBefore = tokenA.balanceOf(address(this));
        uint256 ethBefore = address(this).balance;

        (uint256 amountToken, uint256 amountETH) =
            router.removeLiquidityETH(address(tokenA), liquidity, 0, 0, address(this), block.timestamp);

        assertEq(tokenA.balanceOf(address(this)), tokenBefore + amountToken);
        assertEq(address(this).balance, ethBefore + amountETH);
        assertEq(address(router).balance, 0);
        assertEq(weth.balanceOf(address(router)), 0);
        assertEq(tokenA.balanceOf(address(router)), 0);
    }

    // ---------------------------------------------------------------------
    // removeLiquidityWithPermit / removeLiquidityETHWithPermit
    // ---------------------------------------------------------------------

    function test_removeLiquidityWithPermit_succeedsWithValidSignature() public {
        vm.startPrank(alice);
        tokenA.mint(alice, 1000e18);
        tokenB.mint(alice, 2000e18);
        tokenA.approve(address(router), 1000e18);
        tokenB.approve(address(router), 2000e18);
        (,, uint256 liquidity) =
            router.addLiquidity(address(tokenA), address(tokenB), 1000e18, 2000e18, 0, 0, alice, block.timestamp);
        vm.stopPrank();

        NirmalaPair pair = NirmalaPair(factory.getPair(address(tokenA), address(tokenB)));
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(pair, ALICE_PK, address(router), liquidity, deadline);

        vm.prank(alice);
        (uint256 amountA, uint256 amountB) = router.removeLiquidityWithPermit(
            address(tokenA), address(tokenB), liquidity, 0, 0, alice, deadline, false, v, r, s
        );

        assertGt(amountA, 0);
        assertGt(amountB, 0);
        assertEq(pair.allowance(alice, address(router)), 0);
    }

    function test_removeLiquidityWithPermit_approveMaxLeavesUnlimitedAllowance() public {
        vm.startPrank(alice);
        tokenA.mint(alice, 1000e18);
        tokenB.mint(alice, 2000e18);
        tokenA.approve(address(router), 1000e18);
        tokenB.approve(address(router), 2000e18);
        (,, uint256 liquidity) =
            router.addLiquidity(address(tokenA), address(tokenB), 1000e18, 2000e18, 0, 0, alice, block.timestamp);
        vm.stopPrank();

        NirmalaPair pair = NirmalaPair(factory.getPair(address(tokenA), address(tokenB)));
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(pair, ALICE_PK, address(router), type(uint256).max, deadline);

        vm.prank(alice);
        router.removeLiquidityWithPermit(
            address(tokenA), address(tokenB), liquidity, 0, 0, alice, deadline, true, v, r, s
        );

        assertEq(pair.allowance(alice, address(router)), type(uint256).max);
    }

    function test_removeLiquidityWithPermit_succeedsEvenIfPermitFrontRun() public {
        vm.startPrank(alice);
        tokenA.mint(alice, 1000e18);
        tokenB.mint(alice, 2000e18);
        tokenA.approve(address(router), 1000e18);
        tokenB.approve(address(router), 2000e18);
        (,, uint256 liquidity) =
            router.addLiquidity(address(tokenA), address(tokenB), 1000e18, 2000e18, 0, 0, alice, block.timestamp);
        vm.stopPrank();

        NirmalaPair pair = NirmalaPair(factory.getPair(address(tokenA), address(tokenB)));
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(pair, ALICE_PK, address(router), liquidity, deadline);

        // Front-run: someone else submits alice's exact signature directly to the pair first,
        // consuming her nonce before the router's own tx runs.
        pair.permit(alice, address(router), liquidity, deadline, v, r, s);
        assertEq(pair.allowance(alice, address(router)), liquidity);

        vm.prank(alice);
        (uint256 amountA, uint256 amountB) = router.removeLiquidityWithPermit(
            address(tokenA), address(tokenB), liquidity, 0, 0, alice, deadline, false, v, r, s
        );

        assertGt(amountA, 0);
        assertGt(amountB, 0);
    }

    function test_removeLiquidityWithPermit_revertsIfSignatureInvalidAndNoAllowance() public {
        vm.startPrank(alice);
        tokenA.mint(alice, 1000e18);
        tokenB.mint(alice, 2000e18);
        tokenA.approve(address(router), 1000e18);
        tokenB.approve(address(router), 2000e18);
        (,, uint256 liquidity) =
            router.addLiquidity(address(tokenA), address(tokenB), 1000e18, 2000e18, 0, 0, alice, block.timestamp);
        vm.stopPrank();

        NirmalaPair pair = NirmalaPair(factory.getPair(address(tokenA), address(tokenB)));
        uint256 deadline = block.timestamp + 1 hours;
        uint256 wrongPk = 0xB0B;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(pair, wrongPk, address(router), liquidity, deadline);

        vm.prank(alice);
        vm.expectRevert(NirmalaRouter.NirmalaRouter__InsufficientAllowance.selector);
        router.removeLiquidityWithPermit(
            address(tokenA), address(tokenB), liquidity, 0, 0, alice, deadline, false, v, r, s
        );
    }

    function test_removeLiquidityETHWithPermit_succeedsWithValidSignature() public {
        vm.startPrank(alice);
        tokenA.mint(alice, 1000e18);
        tokenA.approve(address(router), 1000e18);
        (,, uint256 liquidity) =
            router.addLiquidityETH{value: 10 ether}(address(tokenA), 1000e18, 0, 0, alice, block.timestamp);
        vm.stopPrank();

        NirmalaPair pair = NirmalaPair(factory.getPair(address(tokenA), address(weth)));
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(pair, ALICE_PK, address(router), liquidity, deadline);

        uint256 ethBefore = alice.balance;
        vm.prank(alice);
        (uint256 amountToken, uint256 amountETH) =
            router.removeLiquidityETHWithPermit(address(tokenA), liquidity, 0, 0, alice, deadline, false, v, r, s);

        assertGt(amountToken, 0);
        assertGt(amountETH, 0);
        assertEq(alice.balance, ethBefore + amountETH);
    }

    // ---------------------------------------------------------------------
    // swapExactTokensForTokens / swapTokensForExactTokens
    // ---------------------------------------------------------------------

    function test_swapExactTokensForTokens_singleHop_matchesGetAmountsOut() public {
        _seedPool(tokenA, tokenB, 1000e18, 2000e18);

        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);

        uint256 amountIn = 10e18;
        uint256[] memory expected = router.getAmountsOut(amountIn, path);

        tokenA.mint(address(this), amountIn);
        tokenA.approve(address(router), amountIn);

        uint256[] memory amounts =
            router.swapExactTokensForTokens(amountIn, expected[1], path, address(this), block.timestamp);

        assertEq(amounts[1], expected[1]);
        assertEq(tokenB.balanceOf(address(this)), expected[1]);
        assertEq(tokenA.balanceOf(address(router)), 0);
        assertEq(tokenB.balanceOf(address(router)), 0);
    }

    function test_swapExactTokensForTokens_multiHop_routerHoldsNothingBetweenHops() public {
        _seedPool(tokenA, tokenB, 1000e18, 1000e18);
        _seedPool(tokenB, tokenC, 1000e18, 1000e18);

        address[] memory path = new address[](3);
        path[0] = address(tokenA);
        path[1] = address(tokenB);
        path[2] = address(tokenC);

        uint256 amountIn = 10e18;
        uint256[] memory expected = router.getAmountsOut(amountIn, path);

        tokenA.mint(address(this), amountIn);
        tokenA.approve(address(router), amountIn);

        uint256[] memory amounts =
            router.swapExactTokensForTokens(amountIn, expected[2], path, address(this), block.timestamp);

        assertEq(amounts[2], expected[2]);
        assertEq(tokenC.balanceOf(address(this)), expected[2]);
        assertEq(tokenA.balanceOf(address(router)), 0);
        assertEq(tokenB.balanceOf(address(router)), 0);
        assertEq(tokenC.balanceOf(address(router)), 0);
    }

    function test_swapExactTokensForTokens_revertsIfOutputBelowMin() public {
        _seedPool(tokenA, tokenB, 1000e18, 2000e18);
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);
        uint256 amountIn = 10e18;
        uint256[] memory expected = router.getAmountsOut(amountIn, path);

        tokenA.mint(address(this), amountIn);
        tokenA.approve(address(router), amountIn);

        vm.expectRevert(NirmalaRouter.NirmalaRouter__InsufficientOutputAmount.selector);
        router.swapExactTokensForTokens(amountIn, expected[1] + 1, path, address(this), block.timestamp);
    }

    function test_swapExactTokensForTokens_revertsIfDeadlineExpired() public {
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);

        vm.expectRevert(NirmalaRouter.NirmalaRouter__Expired.selector);
        router.swapExactTokensForTokens(1e18, 0, path, address(this), block.timestamp - 1);
    }

    function test_swapExactTokensForTokens_revertsIfPairDoesNotExist() public {
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenC);

        tokenA.mint(address(this), 1e18);
        tokenA.approve(address(router), 1e18);

        vm.expectRevert();
        router.swapExactTokensForTokens(1e18, 0, path, address(this), block.timestamp);
    }

    function test_swapTokensForExactTokens_matchesGetAmountsIn() public {
        _seedPool(tokenA, tokenB, 1000e18, 2000e18);

        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);

        uint256 amountOut = 10e18;
        uint256[] memory expected = router.getAmountsIn(amountOut, path);

        tokenA.mint(address(this), expected[0]);
        tokenA.approve(address(router), expected[0]);

        uint256 balanceABefore = tokenA.balanceOf(address(this));
        uint256[] memory amounts =
            router.swapTokensForExactTokens(amountOut, expected[0], path, address(this), block.timestamp);

        assertEq(amounts[0], expected[0]);
        assertEq(tokenB.balanceOf(address(this)), amountOut);
        assertEq(tokenA.balanceOf(address(this)), balanceABefore - expected[0]);
        assertEq(tokenA.balanceOf(address(router)), 0);
    }

    function test_swapTokensForExactTokens_revertsIfInputAboveMax() public {
        _seedPool(tokenA, tokenB, 1000e18, 2000e18);
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);
        uint256 amountOut = 10e18;
        uint256[] memory expected = router.getAmountsIn(amountOut, path);

        tokenA.mint(address(this), expected[0]);
        tokenA.approve(address(router), expected[0]);

        vm.expectRevert(NirmalaRouter.NirmalaRouter__ExcessiveInputAmount.selector);
        router.swapTokensForExactTokens(amountOut, expected[0] - 1, path, address(this), block.timestamp);
    }

    // ---------------------------------------------------------------------
    // ETH swap variants
    // ---------------------------------------------------------------------

    function test_swapExactETHForTokens_matchesGetAmountsOut() public {
        _seedETHPool(tokenA, 1000e18, 10 ether);

        address[] memory path = new address[](2);
        path[0] = address(weth);
        path[1] = address(tokenA);

        uint256 amountIn = 1 ether;
        uint256[] memory expected = router.getAmountsOut(amountIn, path);

        uint256[] memory amounts =
            router.swapExactETHForTokens{value: amountIn}(expected[1], path, address(this), block.timestamp);

        assertEq(amounts[1], expected[1]);
        assertEq(tokenA.balanceOf(address(this)), expected[1]);
        assertEq(address(router).balance, 0);
        assertEq(weth.balanceOf(address(router)), 0);
    }

    function test_swapExactETHForTokens_revertsIfPathDoesNotStartWithWETH() public {
        _seedPool(tokenA, tokenB, 1000e18, 1000e18);
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);

        vm.expectRevert(NirmalaRouter.NirmalaRouter__InvalidPath.selector);
        router.swapExactETHForTokens{value: 1 ether}(0, path, address(this), block.timestamp);
    }

    function test_swapExactETHForTokens_revertsIfOutputBelowMin() public {
        _seedETHPool(tokenA, 1000e18, 10 ether);

        address[] memory path = new address[](2);
        path[0] = address(weth);
        path[1] = address(tokenA);

        uint256 amountIn = 1 ether;
        uint256[] memory expected = router.getAmountsOut(amountIn, path);

        vm.expectRevert(NirmalaRouter.NirmalaRouter__InsufficientOutputAmount.selector);
        router.swapExactETHForTokens{value: amountIn}(expected[1] + 1, path, address(this), block.timestamp);
    }

    function test_swapExactETHForTokens_revertsIfWETHTransferReturnsFalse() public {
        FalseTransferWETH badWeth = new FalseTransferWETH();
        NirmalaRouter badRouter = new NirmalaRouter(address(factory), address(badWeth));

        address pairAddr = factory.createPair(address(tokenA), address(badWeth));
        tokenA.mint(pairAddr, 1000e18);
        deal(address(badWeth), pairAddr, 10 ether);
        NirmalaPair(pairAddr).sync();

        address[] memory path = new address[](2);
        path[0] = address(badWeth);
        path[1] = address(tokenA);

        vm.expectRevert(NirmalaRouter.NirmalaRouter__WETHTransferFailed.selector);
        badRouter.swapExactETHForTokens{value: 1 ether}(0, path, address(this), block.timestamp);
    }

    function test_swapTokensForExactETH_matchesGetAmountsIn() public {
        _seedETHPool(tokenA, 1000e18, 10 ether);

        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(weth);

        uint256 amountOut = 1 ether;
        uint256[] memory expected = router.getAmountsIn(amountOut, path);

        tokenA.mint(address(this), expected[0]);
        tokenA.approve(address(router), expected[0]);

        uint256 ethBefore = address(this).balance;
        uint256[] memory amounts =
            router.swapTokensForExactETH(amountOut, expected[0], path, address(this), block.timestamp);

        assertEq(amounts[0], expected[0]);
        assertEq(address(this).balance, ethBefore + amountOut);
        assertEq(address(router).balance, 0);
        assertEq(weth.balanceOf(address(router)), 0);
    }

    function test_swapTokensForExactETH_revertsIfInputAboveMax() public {
        _seedETHPool(tokenA, 1000e18, 10 ether);

        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(weth);

        uint256 amountOut = 1 ether;
        uint256[] memory expected = router.getAmountsIn(amountOut, path);

        tokenA.mint(address(this), expected[0]);
        tokenA.approve(address(router), expected[0]);

        vm.expectRevert(NirmalaRouter.NirmalaRouter__ExcessiveInputAmount.selector);
        router.swapTokensForExactETH(amountOut, expected[0] - 1, path, address(this), block.timestamp);
    }

    function test_swapTokensForExactETH_revertsIfPathDoesNotEndWithWETH() public {
        _seedPool(tokenA, tokenB, 1000e18, 1000e18);
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);

        vm.expectRevert(NirmalaRouter.NirmalaRouter__InvalidPath.selector);
        router.swapTokensForExactETH(1e17, type(uint256).max, path, address(this), block.timestamp);
    }

    function test_swapExactTokensForETH_matchesGetAmountsOut() public {
        _seedETHPool(tokenA, 1000e18, 10 ether);

        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(weth);

        uint256 amountIn = 10e18;
        uint256[] memory expected = router.getAmountsOut(amountIn, path);

        tokenA.mint(address(this), amountIn);
        tokenA.approve(address(router), amountIn);

        uint256 ethBefore = address(this).balance;
        uint256[] memory amounts =
            router.swapExactTokensForETH(amountIn, expected[1], path, address(this), block.timestamp);

        assertEq(amounts[1], expected[1]);
        assertEq(address(this).balance, ethBefore + expected[1]);
        assertEq(address(router).balance, 0);
    }

    function test_swapExactTokensForETH_revertsIfOutputBelowMin() public {
        _seedETHPool(tokenA, 1000e18, 10 ether);

        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(weth);

        uint256 amountIn = 10e18;
        uint256[] memory expected = router.getAmountsOut(amountIn, path);

        tokenA.mint(address(this), amountIn);
        tokenA.approve(address(router), amountIn);

        vm.expectRevert(NirmalaRouter.NirmalaRouter__InsufficientOutputAmount.selector);
        router.swapExactTokensForETH(amountIn, expected[1] + 1, path, address(this), block.timestamp);
    }

    function test_swapExactTokensForETH_revertsIfPathDoesNotEndWithWETH() public {
        _seedPool(tokenA, tokenB, 1000e18, 1000e18);
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);

        vm.expectRevert(NirmalaRouter.NirmalaRouter__InvalidPath.selector);
        router.swapExactTokensForETH(1e18, 0, path, address(this), block.timestamp);
    }

    function test_swapETHForExactTokens_refundsUnusedETH() public {
        _seedETHPool(tokenA, 1000e18, 10 ether);

        address[] memory path = new address[](2);
        path[0] = address(weth);
        path[1] = address(tokenA);

        uint256 amountOut = 1e18;
        uint256[] memory expected = router.getAmountsIn(amountOut, path);

        uint256 ethBefore = address(this).balance;
        uint256[] memory amounts =
            router.swapETHForExactTokens{value: expected[0] + 1 ether}(amountOut, path, address(this), block.timestamp);

        assertEq(amounts[0], expected[0]);
        assertEq(tokenA.balanceOf(address(this)), amountOut);
        assertEq(address(this).balance, ethBefore - expected[0]);
        assertEq(address(router).balance, 0);
    }

    function test_swapETHForExactTokens_revertsIfExceedsMsgValue() public {
        _seedETHPool(tokenA, 1000e18, 10 ether);
        address[] memory path = new address[](2);
        path[0] = address(weth);
        path[1] = address(tokenA);
        uint256 amountOut = 1e18;
        uint256[] memory expected = router.getAmountsIn(amountOut, path);

        vm.expectRevert(NirmalaRouter.NirmalaRouter__ExcessiveInputAmount.selector);
        router.swapETHForExactTokens{value: expected[0] - 1}(amountOut, path, address(this), block.timestamp);
    }

    function test_swapETHForExactTokens_revertsIfPathDoesNotStartWithWETH() public {
        _seedPool(tokenA, tokenB, 1000e18, 1000e18);
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);

        vm.expectRevert(NirmalaRouter.NirmalaRouter__InvalidPath.selector);
        router.swapETHForExactTokens{value: 1 ether}(1e17, path, address(this), block.timestamp);
    }

    function test_swapETHForExactTokens_revertsIfWETHTransferReturnsFalse() public {
        FalseTransferWETH badWeth = new FalseTransferWETH();
        NirmalaRouter badRouter = new NirmalaRouter(address(factory), address(badWeth));

        address pairAddr = factory.createPair(address(tokenA), address(badWeth));
        tokenA.mint(pairAddr, 1000e18);
        deal(address(badWeth), pairAddr, 10 ether);
        NirmalaPair(pairAddr).sync();

        address[] memory path = new address[](2);
        path[0] = address(badWeth);
        path[1] = address(tokenA);

        vm.expectRevert(NirmalaRouter.NirmalaRouter__WETHTransferFailed.selector);
        badRouter.swapETHForExactTokens{value: 1 ether}(1e17, path, address(this), block.timestamp);
    }

    // ---------------------------------------------------------------------
    // view helpers (delegate to NirmalaLibrary)
    // ---------------------------------------------------------------------

    function test_quote_matchesLibrary() public view {
        assertEq(router.quote(100e18, 1000e18, 2000e18), NirmalaLibrary.quote(100e18, 1000e18, 2000e18));
    }

    function test_getAmountOut_matchesLibrary() public view {
        assertEq(router.getAmountOut(10e18, 1000e18, 2000e18), NirmalaLibrary.getAmountOut(10e18, 1000e18, 2000e18));
    }

    function test_getAmountIn_matchesLibrary() public view {
        assertEq(router.getAmountIn(10e18, 1000e18, 2000e18), NirmalaLibrary.getAmountIn(10e18, 1000e18, 2000e18));
    }

    function test_getAmountsOut_matchesLibrary() public {
        _seedPool(tokenA, tokenB, 1000e18, 2000e18);
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);

        uint256[] memory routerAmounts = router.getAmountsOut(10e18, path);
        uint256[] memory libAmounts = NirmalaLibrary.getAmountsOut(address(factory), 10e18, path);
        assertEq(routerAmounts[1], libAmounts[1]);
    }

    function test_getAmountsIn_matchesLibrary() public {
        _seedPool(tokenA, tokenB, 1000e18, 2000e18);
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);

        uint256[] memory routerAmounts = router.getAmountsIn(10e18, path);
        uint256[] memory libAmounts = NirmalaLibrary.getAmountsIn(address(factory), 10e18, path);
        assertEq(routerAmounts[0], libAmounts[0]);
    }

    // ---------------------------------------------------------------------
    // Fuzz
    // ---------------------------------------------------------------------

    function testFuzz_swapExactTokensForTokens_neverBelowMinAndRouterHoldsNothing(uint256 amountIn) public {
        _seedPool(tokenA, tokenB, 1_000_000e18, 2_000_000e18);
        amountIn = bound(amountIn, 1e6, 500_000e18);

        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);
        uint256[] memory expected = router.getAmountsOut(amountIn, path);

        tokenA.mint(address(this), amountIn);
        tokenA.approve(address(router), amountIn);

        uint256[] memory amounts =
            router.swapExactTokensForTokens(amountIn, expected[1], path, address(this), block.timestamp);

        assertGe(amounts[1], expected[1]);
        assertEq(tokenA.balanceOf(address(router)), 0);
        assertEq(tokenB.balanceOf(address(router)), 0);
    }

    function testFuzz_swapTokensForExactTokens_neverExceedsMaxAndRouterHoldsNothing(uint256 amountOut) public {
        _seedPool(tokenA, tokenB, 1_000_000e18, 2_000_000e18);
        amountOut = bound(amountOut, 1e6, 900_000e18);

        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);
        uint256[] memory expected = router.getAmountsIn(amountOut, path);

        tokenA.mint(address(this), expected[0]);
        tokenA.approve(address(router), expected[0]);

        uint256[] memory amounts =
            router.swapTokensForExactTokens(amountOut, expected[0], path, address(this), block.timestamp);

        assertLe(amounts[0], expected[0]);
        assertEq(tokenB.balanceOf(address(this)), amountOut);
        assertEq(tokenA.balanceOf(address(router)), 0);
        assertEq(tokenB.balanceOf(address(router)), 0);
    }

    function testFuzz_addLiquidity_neverExceedsDesiredAndUsesOneSideFully(
        uint256 amountADesired,
        uint256 amountBDesired
    ) public {
        _seedPool(tokenA, tokenB, 1000e18, 2000e18);

        amountADesired = bound(amountADesired, 1e6, 1_000_000e18);
        amountBDesired = bound(amountBDesired, 1e6, 1_000_000e18);

        tokenA.mint(address(this), amountADesired);
        tokenB.mint(address(this), amountBDesired);
        tokenA.approve(address(router), amountADesired);
        tokenB.approve(address(router), amountBDesired);

        (uint256 amountA, uint256 amountB,) = router.addLiquidity(
            address(tokenA), address(tokenB), amountADesired, amountBDesired, 0, 0, address(this), block.timestamp
        );

        assertLe(amountA, amountADesired);
        assertLe(amountB, amountBDesired);
        assertTrue(amountA == amountADesired || amountB == amountBDesired);
    }

    function testFuzz_addThenRemoveLiquidity_neverReturnsMoreThanDeposited(
        uint256 amountADesired,
        uint256 amountBDesired
    ) public {
        _seedPool(tokenA, tokenB, 1000e18, 2000e18);

        amountADesired = bound(amountADesired, 1e6, 1_000_000e18);
        amountBDesired = bound(amountBDesired, 1e6, 1_000_000e18);

        tokenA.mint(address(this), amountADesired);
        tokenB.mint(address(this), amountBDesired);
        tokenA.approve(address(router), amountADesired);
        tokenB.approve(address(router), amountBDesired);

        (uint256 amountA, uint256 amountB, uint256 liquidity) = router.addLiquidity(
            address(tokenA), address(tokenB), amountADesired, amountBDesired, 0, 0, address(this), block.timestamp
        );

        address pairAddr = factory.getPair(address(tokenA), address(tokenB));
        NirmalaPair(pairAddr).approve(address(router), liquidity);

        (uint256 returnedA, uint256 returnedB) =
            router.removeLiquidity(address(tokenA), address(tokenB), liquidity, 0, 0, address(this), block.timestamp);

        assertLe(returnedA, amountA);
        assertLe(returnedB, amountB);
    }
}
