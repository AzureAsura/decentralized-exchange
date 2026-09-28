// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {Script} from "forge-std/Script.sol";
import {WETH9} from "../test/mocks/WETH9.sol";

contract HelperConfig is Script {
    error HelperConfig__UnsupportedChain();

    uint256 public constant BSC_TESTNET_CHAIN_ID = 97;
    uint256 public constant BASE_SEPOLIA_CHAIN_ID = 84532;
    uint256 public constant ANVIL_CHAIN_ID = 31337;

    address public constant BSC_TESTNET_WBNB = 0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd;
    address public constant BASE_SEPOLIA_WETH = 0x4200000000000000000000000000000000000006;

    struct NetworkConfig {
        address weth;
    }

    NetworkConfig public activeNetworkConfig;

    constructor() {
        if (block.chainid == BSC_TESTNET_CHAIN_ID) {
            activeNetworkConfig = NetworkConfig({weth: BSC_TESTNET_WBNB});
        } else if (block.chainid == BASE_SEPOLIA_CHAIN_ID) {
            activeNetworkConfig = NetworkConfig({weth: BASE_SEPOLIA_WETH});
        } else if (block.chainid == ANVIL_CHAIN_ID) {
            activeNetworkConfig = getOrCreateAnvilConfig();
        } else {
            revert HelperConfig__UnsupportedChain();
        }
    }

    function getOrCreateAnvilConfig() public returns (NetworkConfig memory) {
        if (activeNetworkConfig.weth != address(0)) return activeNetworkConfig;
        vm.startBroadcast();
        WETH9 weth = new WETH9();
        vm.stopBroadcast();
        return NetworkConfig({weth: address(weth)});
    }
}
