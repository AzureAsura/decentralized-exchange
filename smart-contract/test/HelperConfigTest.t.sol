// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {Test} from "forge-std/Test.sol";
import {HelperConfig} from "../script/HelperConfig.s.sol";

contract HelperConfigTest is Test {
    function test_constructor_bscTestnet_usesBscTestnetWbnb() public {
        vm.chainId(97);
        HelperConfig helperConfig = new HelperConfig();
        (address weth) = helperConfig.activeNetworkConfig();
        assertEq(weth, helperConfig.BSC_TESTNET_WBNB());
    }

    function test_constructor_baseSepolia_usesBaseSepoliaWeth() public {
        vm.chainId(84532);
        HelperConfig helperConfig = new HelperConfig();
        (address weth) = helperConfig.activeNetworkConfig();
        assertEq(weth, helperConfig.BASE_SEPOLIA_WETH());
    }

    function test_constructor_anvil_deploysRealWeth9() public {
        vm.chainId(31337);
        HelperConfig helperConfig = new HelperConfig();
        (address weth) = helperConfig.activeNetworkConfig();

        assertGt(weth.code.length, 0);
        vm.deal(address(this), 1 ether);
        (bool success,) = weth.call{value: 1 ether}(abi.encodeWithSignature("deposit()"));
        assertTrue(success);
    }

    function test_constructor_revertsOnUnsupportedChain() public {
        vm.chainId(1);
        vm.expectRevert(HelperConfig.HelperConfig__UnsupportedChain.selector);
        new HelperConfig();
    }

    function test_getOrCreateAnvilConfig_reusesExistingConfigOnSecondCall() public {
        vm.chainId(31337);
        HelperConfig helperConfig = new HelperConfig();
        (address wethFromConstructor) = helperConfig.activeNetworkConfig();

        HelperConfig.NetworkConfig memory config = helperConfig.getOrCreateAnvilConfig();
        assertEq(config.weth, wethFromConstructor);
    }
}
