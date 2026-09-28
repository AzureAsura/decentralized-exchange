// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {Test} from "forge-std/Test.sol";
import {DeployNirmala} from "../script/DeployNirmala.s.sol";
import {NirmalaFactory} from "../src/NirmalaFactory.sol";
import {NirmalaRouter} from "../src/NirmalaRouter.sol";
import {HelperConfig} from "../script/HelperConfig.s.sol";

contract DeployNirmalaTest is Test {
    function test_run_deploysFactoryAndRouterWiredCorrectly() public {
        DeployNirmala deployer = new DeployNirmala();
        (NirmalaFactory factory, NirmalaRouter router, HelperConfig helperConfig) = deployer.run();

        assertEq(router.factory(), address(factory));
        (address weth) = helperConfig.activeNetworkConfig();
        assertEq(router.WETH(), weth);
        assertEq(factory.allPairsLength(), 0);
    }
}
