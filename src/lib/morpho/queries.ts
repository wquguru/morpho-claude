import { gql } from "@apollo/client";

export const GET_USDC_VAULTS = gql`
  query GetUSDCVaults($chainIds: [Int!]!, $usdcAddresses: [String!]!) {
    vaultV2s(
      first: 100
      where: { chainId_in: $chainIds, asset: { address_in: $usdcAddresses } }
    ) {
      items {
        address
        name
        symbol
        chain {
          id
          network
        }
        asset {
          address
          symbol
          decimals
        }
        state {
          apy
          totalAssets
          totalSupply
          fee
        }
        rewards {
          asset {
            address
            symbol
          }
          supplyApr
        }
      }
    }
  }
`;

export const GET_USER_POSITIONS = gql`
  query GetUserPositions($userAddress: String!, $chainId: Int!) {
    userByAddress(address: $userAddress, chainId: $chainId) {
      address
      vaultV2Positions {
        vault {
          address
          name
          symbol
        }
        assets
        assetsUsd
        shares
        pnl
        pnlUsd
        roe
      }
    }
  }
`;

export const GET_VAULT_ALLOCATIONS = gql`
  query GetVaultAllocations($vaultAddress: String!, $chainId: Int!) {
    vaultV2ByAddress(address: $vaultAddress, chainId: $chainId) {
      address
      name
      state {
        allocation {
          market {
            uniqueKey
            loanAsset {
              symbol
            }
            collateralAsset {
              symbol
            }
            state {
              supplyApy
              utilization
              borrowAssets
              supplyAssets
            }
          }
          supplyAssets
          supplyAssetsUsd
          supplyShares
        }
      }
    }
  }
`;
