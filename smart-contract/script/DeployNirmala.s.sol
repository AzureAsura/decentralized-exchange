// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {Script} from "forge-std/Script.sol";
import {NirmalaFactory} from "../src/NirmalaFactory.sol";
import {NirmalaRouter} from "../src/NirmalaRouter.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

contract DeployNirmala is Script {
    function run() external returns (NirmalaFactory factory, NirmalaRouter router, HelperConfig helperConfig) {
        helperConfig = new HelperConfig();
        (address weth) = helperConfig.activeNetworkConfig();

        vm.startBroadcast();
        factory = new NirmalaFactory();
        router = new NirmalaRouter(address(factory), weth);
        vm.stopBroadcast();
    }
}
