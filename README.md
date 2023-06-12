# Promethios

Promethios (code name uFragments) is a decentralized elastic supply protocol. It maintains a stable unit price by adjusting supply directly to and from wallet holders. You can read the orginal [Ampleforth whitepaper](https://www.ampleforth.org/paper/) for a complete description of the original protocol before Promethios' fork.

This repository is a collection of that implement the Promethios protocol on the Ethereum blockchain.

## Table of Contents

- [Install](#install)
- [Testing](#testing)
- [Testnets](#testnets)
- [Contribute](#contribute)
- [License](#license)

## Install

```bash
# Install project dependencies
yarn
```

## Testing

```bash
# Run all unit tests (compatible with node v12+)
yarn test
```

## Deploy

```
npx hardhat deploy:fireforce:testnet --network goerli --verify --admin "0x..." --manager "0x..."

npx hardhat deploy:wfire --network goerli --fire "" --name "Wrapped Fire" --symbol "WFIRE"

npx hardhat deploy:multicall --network goerli

npx hardhat deploy:airdrop-helper --network goerli --fire "0x0" --wfire "0x0"

npx hardhat deploy:airdrop-reward --network goerli --fire "0x0" --wfire "0x0" --airdrop "0x0" --multiplier "100..00" --start "" --end ""

npx hardhat deploy:rebase-helper --network goerli --policy "0x" --owner "0x0"

npx hardhat deploy:farming --network goerli --token "0x0" --reward "123123" --start "234234" --treasury "0xabc" --owner "0xabc"
```

## Testnets

There is a testnet deployment on Goerli. It rebases hourly using real market data.

- ProxyAdmin: [0xade4fbd14b15a1793e221eb0f4573bce5085d0d2](https://goerli.etherscan.io/address/0xade4fbd14b15a1793e221eb0f4573bce5085d0d2)
- ERC-20 Token: [0x4e9417eABbb17a5A4a0A97c040C02423Eb5A0173](https://goerli.etherscan.io/token/0x4e9417eABbb17a5A4a0A97c040C02423Eb5A0173)
- ufragments: [0x4A5F08F674b442264623e5717AA00f16299aaBB4]
- Supply Policy: [0x7377ab2aEB7e5824B76652644a0F84D6DE4793Fb](https://goerli.etherscan.io/address/0x7377ab2aEB7e5824B76652644a0F84D6DE4793Fb)
- Market Oracle: [0xae398c769e0108d727cA2bF59Db1Ed7951528A80](https://goerli.etherscan.io/address/0xae398c769e0108d727cA2bF59Db1Ed7951528A80)
- OperatorManager: [0xE2b7FBC7646498bF80b40CE80d0aC91F20404098](https://goerli.etherscan.io/address/0xE2b7FBC7646498bF80b40CE80d0aC91F20404098)
- Admin: [0x3a3eA8B1CcE4641dF9A40859818E091C33015b55](https://app.safe.global/home?safe=gor:0x3a3eA8B1CcE4641dF9A40859818E091C33015b55)
- WFIRE: [0x4a6c5cB223Fd2a3C994A86ce381c535fb8D8125B](https://goerli.etherscan.io/address/0x4a6c5cB223Fd2a3C994A86ce381c535fb8D8125B)
- Test USDT: [0x966289b2c448e189664EC3268766335da7079b6b](https://goerli.etherscan.io/address/0x966289b2c448e189664EC3268766335da7079b6b)
- FIRE-USDT on Uniswap V2: [0x1bb6e7eac8f833e7dcf8907b90a550f1907fa559](https://goerli.etherscan.io/address/0x1bb6e7eac8f833e7dcf8907b90a550f1907fa559)
- Farming: [0xB06a277340E031297821D66f26a1972Cf8627E39](https://goerli.etherscan.io/address/0xB06a277340E031297821D66f26a1972Cf8627E39)

## Contract Structure

<img width="643" alt="image" src="https://github.com/Promethios-Fire/promethios-fire-main/assets/98800297/243db8a3-70aa-4006-b2ba-ded203dff1e4">

## Mainnets

There is a deployment on Mainnet.

- ProxyAdmin: [0xa4b02a5e307bf982cd3a290005877ba45a96decf](https://etherscan.io/address/0xa4b02a5e307bf982cd3a290005877ba45a96decf)
- Airdrop Signal: [0xc53de7b2248fc2cb3ee0aa1c2fe6ebb80a78c6b8](https://etherscan.io/address/0xc53de7b2248fc2cb3ee0aa1c2fe6ebb80a78c6b8)
- ERC-20 Token: [0xB25EA095997F5bBaa6cEa962c4fBf3bfc3C09776](https://etherscan.io/token/0xB25EA095997F5bBaa6cEa962c4fBf3bfc3C09776)
- Supply Policy: [0xbd8CFC67B9A2A46224C8CB619911EE2414BC652D](https://etherscan.io/address/0xbd8CFC67B9A2A46224C8CB619911EE2414BC652D)
- Market Oracle: [0xFf4b92eF7C42e8c561Ee9BcFdD45355cC4840327](https://etherscan.io/address/0xFf4b92eF7C42e8c561Ee9BcFdD45355cC4840327)
- OperatorManager: [0xAE1812462D39EbcF2b1bAa3D55F1aE5781b91b50](https://etherscan.io/address/0xAE1812462D39EbcF2b1bAa3D55F1aE5781b91b50)
- WFIRE: [0x1A7383700eE220C5efC0Ffe5772Fbd490c8614B7](https://etherscan.io/address/0x1A7383700eE220C5efC0Ffe5772Fbd490c8614B7)
- Multicall: [0xaa3bbc3c4F3F8E78b910dBC8C00B14b66F0E4429](https://etherscan.io/address/0xaa3bbc3c4F3F8E78b910dBC8C00B14b66F0E4429)
- RebaseHelper: [0x6c6Bc8190f7d3F2A8ad01860EB93781A853051E0](https://etherscan.io/address/0x6c6Bc8190f7d3F2A8ad01860EB93781A853051E0)
- AirdropHelper: [0x08C68b4E09A063E13E974d1055238C3D53Ca8b90](https://etherscan.io/address/0x08C68b4E09A063E13E974d1055238C3D53Ca8b90)
- AirdropReward: [0x7B195EF8d0F1D244f4bFf52339F95DCED670cDB1](https://etherscan.io/address/0x7B195EF8d0F1D244f4bFf52339F95DCED670cDB1)
- FIRE-USDC on UniV2: [0x62f700c1f14e3a1acd52d9c3f62e446ee67e7900](https://etherscan.io/address/0x62f700c1f14e3a1acd52d9c3f62e446ee67e7900)

**Multsigs**

- Local Treasury [0x51f9fAEe8A316e5Cb7E669623Da1B19e84c20590](https://app.safe.global/home?safe=eth:0x51f9fAEe8A316e5Cb7E669623Da1B19e84c20590)
- Strategic Reserve [eth:0x6E26532DBB9565ed0c285941bfbAC8AB6954b2cb](eth:0x6E26532DBB9565ed0c285941bfbAC8AB6954b2cb)
- Token Upgrade [eth:0x1Ed92f0ab199c216e45B60Cd7651aBDE524473A3](https://app.safe.global/home?safe=eth:0x1Ed92f0ab199c216e45B60Cd7651aBDE524473A3)
- Token Admin [eth:0xE5fFa2243128B78B00051F656795b6597CE6A2DA](https://app.safe.global/home?safe=eth:0xE5fFa2243128B78B00051F656795b6597CE6A2DA)
- Operator Manager [eth:0x43bd7DE28465db36294BD062b1187a0191c6a2f8](https://app.safe.global/home?safe=eth:0x43bd7DE28465db36294BD062b1187a0191c6a2f8)

## Arbitrum

- ProxyAdmin: [0xa4b02a5e307bf982cd3a290005877ba45a96decf](https://arbiscan.io/address/0xa4b02a5e307bf982cd3a290005877ba45a96decf)
- ERC-20 Token: [0xB25EA095997F5bBaa6cEa962c4fBf3bfc3C09776](https://arbiscan.io/token/0xB25EA095997F5bBaa6cEa962c4fBf3bfc3C09776)
- Supply Policy: [0xbd8cfc67b9a2a46224c8cb619911ee2414bc652d](https://arbiscan.io/address/0xbd8cfc67b9a2a46224c8cb619911ee2414bc652d)
- Market Oracle: [0xFf4b92eF7C42e8c561Ee9BcFdD45355cC4840327](https://arbiscan.io/address/0xFf4b92eF7C42e8c561Ee9BcFdD45355cC4840327)
- OperatorManager: [0xAE1812462D39EbcF2b1bAa3D55F1aE5781b91b50](https://arbiscan.io/address/0xAE1812462D39EbcF2b1bAa3D55F1aE5781b91b50)
- WFIRE: [0x1A7383700eE220C5efC0Ffe5772Fbd490c8614B7](https://arbiscan.io/address/0x1A7383700eE220C5efC0Ffe5772Fbd490c8614B7)
- Multicall: [0xaa3bbc3c4F3F8E78b910dBC8C00B14b66F0E4429](https://arbiscan.io/address/0xaa3bbc3c4F3F8E78b910dBC8C00B14b66F0E4429)
- RebaseHelper: [0x6c6Bc8190f7d3F2A8ad01860EB93781A853051E0](https://arbiscan.io/address/0x6c6Bc8190f7d3F2A8ad01860EB93781A853051E0)
- AirdropHelper: [0x08C68b4E09A063E13E974d1055238C3D53Ca8b90](https://arbiscan.io/address/0x08C68b4E09A063E13E974d1055238C3D53Ca8b90)
- AirdropReward: [0x7B195EF8d0F1D244f4bFf52339F95DCED670cDB1](https://arbiscan.io/address/0x7B195EF8d0F1D244f4bFf52339F95DCED670cDB1)
- FIRE-USDC on Sushi: [0x38d3f9f8539ee300575108d072c9bff7fa009cdf](https://arbiscan.io/address/0x38d3f9f8539ee300575108d072c9bff7fa009cdf)

**Multsigs**

- Local Treasury [arb1:0xEa7f6502ACCF87E8bCC46A37fD7a9f03E33329A5](https://app.safe.global/home?safe=arb1:0xEa7f6502ACCF87E8bCC46A37fD7a9f03E33329A5)
- Strategic Reserve [arb1:0x592Fe2777ce176379c61f8099475333D4591567a](arb1:0x592Fe2777ce176379c61f8099475333D4591567a)
- Token Upgrade [arb1:0xec0FFc027c1279296C336FFD5702C39fA34e743d](https://app.safe.global/home?safe=arb1:0xec0FFc027c1279296C336FFD5702C39fA34e743d)
- Token Admin [arb1:0x4BEC4bD16E76de5a1cc43da81bdDE7675ED21f7f](https://app.safe.global/home?safe=arb1:0x4BEC4bD16E76de5a1cc43da81bdDE7675ED21f7f)
- Operator Manager [arb1:0x37b3CfD6B71D77f3492342d50034159972bb46B4](https://app.safe.global/home?safe=arb1:0x37b3CfD6B71D77f3492342d50034159972bb46B4)

## Optimism

- ProxyAdmin: [0xa4b02a5e307bf982cd3a290005877ba45a96decf](https://optimistic.etherscan.io/address/0xa4b02a5e307bf982cd3a290005877ba45a96decf)
- ERC-20 Token: [0xB25EA095997F5bBaa6cEa962c4fBf3bfc3C09776](https://optimistic.etherscan.io/token/0xB25EA095997F5bBaa6cEa962c4fBf3bfc3C09776)
- Supply Policy: [0xbd8CFC67B9A2A46224C8CB619911EE2414BC652D](https://optimistic.etherscan.io/address/0xbd8CFC67B9A2A46224C8CB619911EE2414BC652D)
- Market Oracle: [0xFf4b92eF7C42e8c561Ee9BcFdD45355cC4840327](https://optimistic.etherscan.io/address/0xFf4b92eF7C42e8c561Ee9BcFdD45355cC4840327)
- OperatorManager: [0xAE1812462D39EbcF2b1bAa3D55F1aE5781b91b50](https://optimistic.etherscan.io/address/0xAE1812462D39EbcF2b1bAa3D55F1aE5781b91b50)
- WFIRE: [0x1A7383700eE220C5efC0Ffe5772Fbd490c8614B7](https://optimistic.etherscan.io/address/0x1A7383700eE220C5efC0Ffe5772Fbd490c8614B7)
- Multicall: [0xaa3bbc3c4F3F8E78b910dBC8C00B14b66F0E4429](https://optimistic.etherscan.io/address/0xaa3bbc3c4F3F8E78b910dBC8C00B14b66F0E4429)
- RebaseHelper: [0x6c6Bc8190f7d3F2A8ad01860EB93781A853051E0](https://optimistic.etherscan.io/address/0x6c6Bc8190f7d3F2A8ad01860EB93781A853051E0)
- AirdropHelper: [0x08C68b4E09A063E13E974d1055238C3D53Ca8b90](https://optimistic.etherscan.io/address/0x08C68b4E09A063E13E974d1055238C3D53Ca8b90)
- AirdropReward: [0x7B195EF8d0F1D244f4bFf52339F95DCED670cDB1](https://optimistic.etherscan.io/address/0x7B195EF8d0F1D244f4bFf52339F95DCED670cDB1)
- FIRE-USDC on VolatileAMMv1: [0x9251514625f4fd4aec6c0bce89c95ec247e9e6f0](https://optimistic.etherscan.io/address/0x9251514625f4fd4aec6c0bce89c95ec247e9e6f0)

**Multsigs**

- Local Treasury [oeth:0xf10c45d1D995c75EdfEFCA04f0f8bf28A76fE3F0](https://app.safe.global/home?safe=oeth:0xf10c45d1D995c75EdfEFCA04f0f8bf28A76fE3F0)
- Strategic Reserve [oeth:0x79c5833658c840B9d23967944AeCE2B7108ff31c](oeth:0x79c5833658c840B9d23967944AeCE2B7108ff31c)
- Token Upgrade [oeth:0xc9968873071948A43BE8e30119aa4cc99cb0B7fb](https://app.safe.global/home?safe=oeth:0xc9968873071948A43BE8e30119aa4cc99cb0B7fb)
- Token Admin [oeth:0xCFc7eD181912c26614E5aFBD105bEd288fc6908D](https://app.safe.global/home?safe=oeth:0xCFc7eD181912c26614E5aFBD105bEd288fc6908D)
- Operator Manager [oeth:0x8226D0bdA102BbBa73603864D50cFe76fe15f068](https://app.safe.global/home?safe=oeth:0x8226D0bdA102BbBa73603864D50cFe76fe15f068)

## Contribute

To report bugs within this package, create an issue in this repository.
For security issues, please contact dev-support@ampleforth.org.
When submitting code ensure that it is free of lint errors and has 100% test coverage.

```bash
# Lint code
yarn lint

# Format code
yarn format

# Run solidity coverage report (compatible with node v12)
yarn coverage

# Run solidity gas usage report
yarn profile
```

## License

[GNU General Public License v3.0 (c) 2018 Fragments, Inc.](./LICENSE)
