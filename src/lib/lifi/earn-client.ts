const EARN_API = "https://earn.li.fi";
const COMPOSER_API = "https://li.quest";

export interface EarnVault {
  address: string;
  name: string;
  chainId: number;
  network: string;
  protocol: { name: string; url: string };
  analytics: {
    apy: { base: number | null; reward: number | null; total: number | null };
    tvl: { usd: string };
  };
  isTransactional: boolean;
  underlyingTokens: {
    address: string;
    symbol: string;
    decimals: number;
  }[];
}

export async function fetchAllVaults(
  chains: string = "eth,base",
  tokens: string = "USDC"
): Promise<EarnVault[]> {
  const allVaults: EarnVault[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL(`${EARN_API}/v1/earn/vaults`);
    url.searchParams.set("chains", chains);
    url.searchParams.set("protocols", "morpho");
    url.searchParams.set("tokens", tokens);
    url.searchParams.set("sort", "apy");
    url.searchParams.set("order", "desc");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString());
    const data = await res.json();

    allVaults.push(...(data.data ?? []));
    cursor = data.nextCursor ?? undefined;
  } while (cursor);

  return allVaults;
}

export async function getDepositQuote(
  fromChain: string,
  toChain: string,
  fromToken: string,
  vaultAddress: string,
  fromAmount: string,
  userAddress: string
) {
  // IMPORTANT: /v1/quote is a GET request, not POST
  const url = new URL(`${COMPOSER_API}/v1/quote`);
  url.searchParams.set("fromChain", fromChain);
  url.searchParams.set("toChain", toChain);
  url.searchParams.set("fromToken", fromToken);
  url.searchParams.set("toToken", vaultAddress); // vault address = toToken
  url.searchParams.set("fromAmount", fromAmount);
  url.searchParams.set("fromAddress", userAddress);

  const res = await fetch(url.toString(), {
    headers: {
      "x-lifi-api-key": process.env.LIFI_API_KEY!,
    },
  });

  return res.json();
}

export async function getUserPositions(
  userAddress: string,
  chains: string = "eth,base"
) {
  // IMPORTANT: endpoint is /v1/earn/portfolio/{addr}/positions
  const url = new URL(
    `${EARN_API}/v1/earn/portfolio/${userAddress}/positions`
  );
  url.searchParams.set("chains", chains);
  url.searchParams.set("protocols", "morpho");

  const res = await fetch(url.toString());
  return res.json();
}
