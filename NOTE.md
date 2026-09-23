# Development Notes

Rationale and design notes that don't belong as inline comments in the contracts. Organized by file.

## NirmalaPair.sol

All 8 functions from PRD bagian 8 are implemented: `getReserves`, `initialize`, `_update`, `mint`, `burn`, `swap`, `skim`, `sync`. Built incrementally, one function per session step, each verified with `forge build`/`forge test`/`forge fmt --check` before moving to the next.

Deviations from the Uniswap V2 reference (`UniswapV2Pair.sol`), all deliberate:
- `factory` is `immutable`, not a mutable state var — Uniswap V2 only used mutable because Solidity 0.5.16 had no `immutable` keyword, not because it needs to change.
- `initialize()` has an extra guard (`token0 == address(0)`) beyond the `msg.sender == factory` check, so a hypothetical double-call from a buggy future `NirmalaFactory` can't silently re-point an already-initialized pair.
- Reentrancy: OZ `ReentrancyGuard`/`nonReentrant`, not the custom `lock` modifier from the reference.
- Token transfers: OZ `SafeERC20.safeTransfer`, not a hand-rolled `_safeTransfer`.
- `_update()` is `internal`, not `private` — needed so `NirmalaPairHarness` (test-only, in `test/NirmalaPairTest.t.sol`) can exercise it directly before `mint`/`burn`/`swap`/`sync` existed to call it for real.
- No protocol fee at all (`_mintFee`/`kLast`/`feeTo` don't exist anywhere) — PRD bagian 5 locked this early; `mint()`/`burn()` are correspondingly simpler than the reference. `swap()` never touched fee-on logic in the reference either, so it needed no reduction.
- Custom errors throughout, using `require(condition, CustomError())` (Solidity 0.8.26+ sugar) rather than `if (bad) revert CustomError();` — user's explicit style preference, see `[[feedback_dex_require_custom_error_style]]`.

Lint suppressions:
- `unsafe-typecast` on `reserve0 = uint112(balance0)` / `reserve1 = uint112(balance1)` in `_update()` — safe because the `require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, NirmalaPair__Overflow())` a few lines above already bounds both values, so the cast can't silently truncate.

`swap()`'s two `{ }` scoping blocks are kept from the reference — not just style, they're needed to avoid "stack too deep" on the default (non-`viaIR`) compiler pipeline given how many locals the function has.

## test/NirmalaPairTest.t.sol

- Real bug found via fuzzing (in the test, not the contract): `testFuzz_burn_matchesManualCalculation`'s `vm.assume` filter divided by `liquidity` (the LP amount minted to the user, i.e. `totalSupply - MINIMUM_LIQUIDITY`) instead of `pair.totalSupply()` (what `burn()` itself divides by). For a tiny `burnFraction` and unequal `amount0`/`amount1`, this let through cases where the *real* formula's smaller-reserve side floors to 0 — a correct `NirmalaPair__InsufficientLiquidityBurned` revert that the test wasn't expecting. Fixed by reading `reserve0`/`reserve1`/`totalSupply()` first and using those (matching exactly what `burn()` computes) in the `vm.assume` check instead of the mint-time `amount0`/`amount1`/`liquidity`. Verified fixed by re-running the exact failing seed (`--fuzz-seed 0xdd772f...`) and then the full suite 3× at `--fuzz-runs 1000`.
- `MockERC20` (`test/mocks/MockERC20.sol`) and `MockNirmalaCallee` (`test/mocks/MockNirmalaCallee.sol`) are test-only doubles — a thin mintable OZ `ERC20` standing in for token0/token1, and a minimal `INirmalaCallee` implementation whose `data` payload (`abi.decode`d as `(token0, token1, repay0, repay1)`) lets tests control exactly how much a flash-swap borrower repays, to hit both the success and `NirmalaPair__K()` revert paths.
- All tests that call `mint`/`burn`/`swap` simulate the Router-side "transfer tokens to the pair, then call the function" pattern directly in the test body (no Router exists yet) — e.g. `token0.mint(address(this), amountIn); token0.transfer(address(pair), amountIn); pair.swap(...)`.

## Session state (stopped here — resume point)

As of this session: `NirmalaToken.sol`, `UQ112x112.sol`, `INirmalaCallee.sol`, and `NirmalaPair.sol` are fully implemented and tested. 61 tests total, all passing (`forge test --fuzz-runs 1000` ×3 clean), `forge fmt --check` clean.

Not started yet: `NirmalaFactory.sol`, `NirmalaRouter.sol`, `NirmalaLibrary.sol` (the `UniswapV2Library`-equivalent — `getAmountOut`/`getAmountIn`/`quote`/`sortTokens`/`pairFor`, needed by the Router). Still open in `PRD.md`: final chain (BNB testnet vs Base Sepolia) + matching `evm_version`, and whether fee-on-transfer tokens are supported.

Natural next step: `NirmalaFactory.sol` — creates pairs via `CREATE2` (no constructor args, matching the `initialize()`-after-deploy pattern already built into `NirmalaPair`), tracks `getPair`/`allPairs`.
