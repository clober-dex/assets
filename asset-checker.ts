import fs from 'fs'
import path from 'path'

import { Chain, monadTestnet } from 'viem/chains'
import { createPublicClient, erc20Abi, getAddress, http } from 'viem'

const CHAINS = [monadTestnet]

type CurrencyEntry = {
  address: `0x${string}`
  name: string
  symbol: string
  decimals: number
  icon?: string
}

type ERC20Metadata = {
  name: string
  symbol: string
  decimals: number
}

const checkIndentation = (
  filePath: string,
  expectedIndent: number,
): boolean => {
  const original = fs.readFileSync(filePath, 'utf8')
  const parsed = JSON.parse(original)
  const reserialized = JSON.stringify(parsed, null, expectedIndent)

  const isValid = original === reserialized
  console.log(
    `${isValid ? '✅' : '❌'} ${filePath} ${
      isValid ? 'has correct' : `has invalid`
    } indentation`,
  )
  return isValid
}

const checkAddressFormat = (addresses: `0x${string}`[]): boolean => {
  for (const address of addresses) {
    if (getAddress(address) !== address) {
      console.error(`❌ Invalid address format: ${address}`)
      return false
    }
  }
  return true
}

const fetchERC20Metadata = async (
  chain: Chain,
  addresses: `0x${string}`[],
): Promise<Record<string, ERC20Metadata>> => {
  const publicClient = createPublicClient({ chain, transport: http() })

  const calls = addresses.flatMap((address) => [
    { address, abi: erc20Abi, functionName: 'decimals' },
    { address, abi: erc20Abi, functionName: 'name' },
    { address, abi: erc20Abi, functionName: 'symbol' },
  ])

  const results = await publicClient.multicall({
    contracts: calls,
    allowFailure: true,
  })

  const metadata: Record<string, ERC20Metadata> = {}

  for (let i = 0; i < results.length; i += 3) {
    const address = getAddress(calls[i].address)
    const [decimalsRes, nameRes, symbolRes] = results.slice(i, i + 3)

    if (
      decimalsRes.status !== 'success' ||
      nameRes.status !== 'success' ||
      symbolRes.status !== 'success'
    ) {
      throw new Error(
        `❌ Failed to fetch metadata for ${address} on ${chain.name}`,
      )
    }

    metadata[address] = {
      decimals: decimalsRes.result as number,
      name: nameRes.result as string,
      symbol: symbolRes.result as string,
    }
  }

  return metadata
}

const validateERC20Metadata = (
  address: string,
  chain: Chain,
  expected: ERC20Metadata,
  actual: ERC20Metadata,
): boolean => {
  const match =
    expected.name === actual.name &&
    expected.symbol === actual.symbol &&
    expected.decimals === actual.decimals

  if (!match) {
    console.error(
      `❌ Metadata mismatch for ${address} on ${chain.name}\n  expected: ${JSON.stringify(
        expected,
      )}\n  actual:   ${JSON.stringify(actual)}\n`,
    )
  } else {
    console.log(`✅ Metadata for ${address} on ${chain.name} is valid`)
  }

  return match
}

const findAndCheckAllAssets = async () => {
  const dirs = fs.readdirSync('.')
  let allValid = true

  for (const dir of dirs) {
    const chain = CHAINS.find((c) => c.id.toString() === dir)
    if (!chain) {
      continue
    }

    const filePath = path.join(dir, 'assets.json')
    if (!fs.existsSync(filePath)) {
      continue
    }

    const isIndented = checkIndentation(filePath, 2)
    if (!isIndented) {
      allValid = false
    }

    const currencies = JSON.parse(
      fs.readFileSync(filePath, 'utf8'),
    ) as CurrencyEntry[]

    if (!checkAddressFormat(currencies.map((c) => c.address))) {
      allValid = false
      continue
    }

    try {
      const onchainMetadata = await fetchERC20Metadata(
        chain,
        currencies.map((c) => c.address),
      )

      for (const { address, icon,...expected } of currencies) {
        const checksummed = getAddress(address)
        const actual = onchainMetadata[checksummed]

        if (!actual) {
          console.error(
            `❌ Missing metadata for ${checksummed} on ${chain.name}`,
          )
          allValid = false
        } else {
          const ok = validateERC20Metadata(checksummed, chain, expected, actual)
          if (!ok) {
            allValid = false
          }

          // validate icon path if present
          if (icon) {
            const iconPath = path.join(dir, 'icons', icon)
            if (!fs.existsSync(iconPath)) {
              console.error(`❌ Icon file not found: ${iconPath}`)
              allValid = false
            }
          }
        }
      }
    } catch (err) {
      console.error(`❌ Error fetching metadata for ${dir}:`, err)
      allValid = false
    }
  }

  if (!allValid) {
    process.exit(1)
  }
}

findAndCheckAllAssets()
