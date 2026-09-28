# Nirmala Exchange

A Uniswap V2 style constant product AMM DEX, built from scratch with Foundry and deployed live on BNB Smart Chain Testnet. Full stack: Solidity contracts plus a Next.js frontend.

Live app: swap, add and remove liquidity, and track pools, all wired to real on chain data. No mock data anywhere in the frontend.

## Live deployment (BNB Smart Chain Testnet, chain id 97)

| Contract | Address |
|---|---|
| NirmalaFactory | `0x38776F00e11F4903dc0eC717b87e418CD7Aa6De0` |
| NirmalaRouter | `0x7bE8ec3CBD3c80BbF0Df4C57adF1858642953B53` |

Demo tokens for testing:

| Token | Symbol | Address |
|---|---|---|
| Sukuna Token | RST | `0x613cacc0f192CAdC3486a8E53CAa87416d814b9A` |
| Gojo Token | GST | `0xa768B9D0A48E7D5Be388Eb1F8739eb02a3eB3861` |

Note: this is a testnet deployment only. Nothing here should ever be pointed at mainnet or used with real funds.

## Features

**Smart contracts**
- Constant product AMM (`x * y = k`), permissionless pair creation via `CREATE2`
- No protocol fee, no admin, no owner: the factory and pair contracts have zero privileged roles
- Fixed 0.30% swap fee routed entirely to liquidity providers
- Flash swaps (optional callback in `NirmalaPair.swap()`)
- TWAP price oracle accumulators
- LP tokens support EIP-2612 `permit`, so removing liquidity can be a single signature instead of an approve plus a transaction

**Frontend**
- Wallet connect, network detection and switching
- Swap with live on chain quotes, slippage and deadline settings, and price impact
- Multi hop swap routing: if there is no direct pair between two tokens, the app finds a path through whatever pairs actually exist on chain (graph search, not a hardcoded bridge token)
- Add liquidity (new pool or existing pool, with live quote preview) and remove liquidity (permit first, falls back to approve plus remove if the signature is rejected)
- Custom token import by address, with on chain validation and a CoinGecko backed logo lookup
- Pool table with search and an "your positions" filter

## Repository layout

```
dex/
├── smart-contract/   Foundry project: contracts, tests, deploy scripts
└── frontend/         Next.js app (App Router), wagmi + viem
```

See `PRD.md` for the full product and protocol design writeup, `PLAN.md` for the frontend build roadmap, and `NOTE.md` for detailed engineering notes and decisions made along the way.

## Smart contract stack

- Solidity 0.8.29, pinned in `foundry.toml` and every `pragma`
- OpenZeppelin Contracts v5.7.0 (ERC20, ERC20Permit, ReentrancyGuard, SafeERC20)
- Foundry (forge, cast, anvil) for building, testing and deployment

### Running the contracts locally

```bash
cd smart-contract
forge install
forge build
forge test
```

## Frontend stack

- Next.js (App Router), TypeScript
- wagmi and viem for wallet connection and on chain reads/writes
- TanStack Query for data fetching and caching
- Tailwind CSS, framer-motion for animation

### Running the frontend locally

```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:3000`. You will need a `.env` file with:

```
COINGECKO_API=your_coingecko_demo_api_key
NEXT_PUBLIC_BSC_TESTNET_RPC_URL=your_bsc_testnet_rpc_url
```

`COINGECKO_API` stays server side (no `NEXT_PUBLIC_` prefix) and is only used by the internal API routes that look up token logos.

## Deploying your own instance

The frontend can be deployed to Vercel directly. Point the project root at `frontend/` and add the two environment variables above. The contract addresses used by the frontend are hardcoded in `frontend/lib/contracts.ts`, so redeploying the frontend does not redeploy the contracts.

To deploy a fresh set of contracts yourself, see `smart-contract/script/DeployNirmala.s.sol` and `smart-contract/script/HelperConfig.s.sol`, which read the WETH/WBNB address for the target chain automatically.
