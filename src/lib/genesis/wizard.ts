import {
  createAndRegisterLaunch,
  registerLaunch,
  GenesisApiConfig,
  safeFetchGenesisAccountV2,
} from '@metaplex-foundation/genesis'
import { Umi, Signer, publicKey } from '@metaplex-foundation/umi'
import { confirm } from '@inquirer/prompts'
import ora from 'ora'

import { generateExplorerUrl, ExplorerType } from '../../explorers.js'
import { txSignatureToString, RpcChain } from '../util.js'
import {
  promptGenesisCreate,
  promptBucketChoice,
  promptLaunchPoolBucket,
  promptPresaleBucket,
  promptUnlockedBucket,
  promptLaunchWizard,
  promptRegisterLaunch,
} from './createGenesisWizardPrompt.js'
import {
  createGenesisAccount,
  addLaunchPoolBucket,
  addPresaleBucket,
  addUnlockedBucket,
  finalizeGenesis,
} from './operations.js'
import { buildLaunchInput } from './launchApi.js'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface WizardContext {
  umi: Umi
  identity: Signer
  payer: Signer | undefined
  chain: RpcChain
  commitment: string
  explorer: ExplorerType
  apiUrl: string
}

export interface WizardLogger {
  log: (msg: string) => void
  logSuccess: (msg: string) => void
  warn: (msg: string) => void
  logJson: (obj: unknown) => void
}

export interface ApiWizardResult {
  genesisAccount: string
  mintAddress: string
  launchId: string
  launchLink: string
  signatures: string[]
}

export interface ManualWizardResult {
  genesisAccount: string
  baseMint: string
  quoteMint: string
  name: string
  symbol: string
  totalSupply: string
  decimals: number
  fundingMode: string
  buckets: number
  finalized: boolean
  registration?: {
    launchId: string
    launchLink: string
  }
}

/* ------------------------------------------------------------------ */
/*  API Wizard                                                         */
/* ------------------------------------------------------------------ */

export async function runApiWizard(
  ctx: WizardContext,
  logger: WizardLogger,
): Promise<ApiWizardResult> {
  const wizardResult = await promptLaunchWizard()

  const launchInput = buildLaunchInput(
    ctx.identity.publicKey.toString(),
    ctx.chain,
    {
      launchType: wizardResult.launchType,
      token: {
        name: wizardResult.name,
        symbol: wizardResult.symbol,
        image: wizardResult.image,
        ...(wizardResult.description && { description: wizardResult.description }),
      },
      socials: {
        ...(wizardResult.website && { website: wizardResult.website }),
        ...(wizardResult.twitter && { twitter: wizardResult.twitter }),
        ...(wizardResult.telegram && { telegram: wizardResult.telegram }),
      },
      quoteMint: wizardResult.quoteMint,
      depositStartTime: wizardResult.depositStartTime,
      tokenAllocation: wizardResult.tokenAllocation,
      raiseGoal: wizardResult.raiseGoal,
      raydiumLiquidityBps: wizardResult.raydiumLiquidityBps,
      fundsRecipient: wizardResult.fundsRecipient,
      creatorFeeWallet: wizardResult.creatorFeeWallet,
      firstBuyAmount: wizardResult.firstBuyAmount,
      agent: wizardResult.agentAsset ? {
        mint: wizardResult.agentAsset,
        setToken: wizardResult.agentSetToken ?? false,
      } : undefined,
    },
  )

  const spinner = ora('Creating and registering launch via Genesis API...').start()

  try {
    const apiConfig: GenesisApiConfig = {
      baseUrl: ctx.apiUrl,
    }

    const allowedCommitments = ['processed', 'confirmed', 'finalized'] as const
    const commitment = allowedCommitments.includes(ctx.commitment as typeof allowedCommitments[number])
      ? (ctx.commitment as typeof allowedCommitments[number])
      : 'confirmed'

    const result = await createAndRegisterLaunch(
      ctx.umi,
      apiConfig,
      launchInput,
      { commitment },
    )

    spinner.succeed('Token launch created and registered successfully!')

    logger.log('')
    logger.logSuccess(`Genesis Account: ${result.genesisAccount}`)
    logger.log(`Mint Address: ${result.mintAddress}`)
    logger.log(`Launch ID: ${result.launch.id}`)
    logger.log(`Launch Link: ${result.launch.link}`)
    logger.log(`Token ID: ${result.token.id}`)
    logger.log('')
    logger.log('Transactions:')
    for (const sig of result.signatures) {
      const sigStr = txSignatureToString(sig)
      logger.log(`  ${sigStr}`)
      logger.log(
        `  ${generateExplorerUrl(
          ctx.explorer,
          ctx.chain,
          sigStr,
          'transaction',
        )}`,
      )
    }

    logger.log('')
    logger.log('Your token launch is live! Share the launch link with your community.')

    return {
      genesisAccount: result.genesisAccount,
      mintAddress: result.mintAddress,
      launchId: result.launch.id,
      launchLink: result.launch.link,
      signatures: result.signatures.map((sig: Uint8Array) => txSignatureToString(sig)),
    }
  } catch (error) {
    spinner.fail('Failed to create token launch')
    if (error && typeof error === 'object' && 'responseBody' in error) {
      logger.logJson((error as { responseBody: unknown }).responseBody)
    }
    throw error
  }
}

/* ------------------------------------------------------------------ */
/*  Manual Wizard                                                      */
/* ------------------------------------------------------------------ */

export async function runManualWizard(
  ctx: WizardContext,
  logger: WizardLogger,
): Promise<ManualWizardResult> {
  // Step 1: Create the genesis account
  logger.log('')
  logger.log('--- Step 1: Create Genesis Account ---')
  const createResult = await promptGenesisCreate()

  const spinner = ora('Creating Genesis account...').start()
  let genesisAccountPda: string
  let baseMintPubkey: string
  let quoteMintPubkey: string

  try {
    const result = await createGenesisAccount(
      ctx.umi,
      ctx.identity,
      ctx.payer,
      createResult,
    )

    genesisAccountPda = String(result.genesisAccountPda)
    baseMintPubkey = String(result.baseMintPubkey)
    quoteMintPubkey = String(result.quoteMintPubkey)

    spinner.succeed('Genesis account created!')
    logger.log(`  Genesis Account: ${genesisAccountPda}`)
    logger.log(`  Base Mint: ${baseMintPubkey}`)
    logger.log(`  Signature: ${result.signature}`)
    logger.log('')
  } catch (error) {
    spinner.fail('Failed to create Genesis account')
    throw error
  }

  // Step 2: Add buckets in a loop
  logger.log('--- Step 2: Add Buckets ---')
  const bucketCounts = { launchPool: 0, presale: 0, unlocked: 0 }
  let totalBuckets = 0
  const bucketSummary: string[] = []

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const choice = await promptBucketChoice()

    if (choice === 'done') break

    const bucketSpinner = ora()

    try {
      if (choice === 'launch-pool') {
        const params = await promptLaunchPoolBucket(bucketCounts.launchPool)
        bucketSpinner.start('Adding launch pool bucket...')
        const result = await addLaunchPoolBucket(
          ctx.umi,
          ctx.identity,
          ctx.payer,
          publicKey(genesisAccountPda),
          publicKey(baseMintPubkey),
          publicKey(quoteMintPubkey),
          params,
        )
        bucketSpinner.succeed(`Launch pool bucket added: ${result.bucketPda}`)
        bucketCounts.launchPool++
        totalBuckets++
        bucketSummary.push(`  Launch Pool #${params.bucketIndex}: ${result.bucketPda}`)
      } else if (choice === 'presale') {
        const params = await promptPresaleBucket(bucketCounts.presale)
        bucketSpinner.start('Adding presale bucket...')
        const result = await addPresaleBucket(
          ctx.umi,
          ctx.identity,
          ctx.payer,
          publicKey(genesisAccountPda),
          publicKey(baseMintPubkey),
          publicKey(quoteMintPubkey),
          params,
        )
        bucketSpinner.succeed(`Presale bucket added: ${result.bucketPda}`)
        bucketCounts.presale++
        totalBuckets++
        bucketSummary.push(`  Presale #${params.bucketIndex}: ${result.bucketPda}`)
      } else if (choice === 'unlocked') {
        const params = await promptUnlockedBucket(bucketCounts.unlocked)
        bucketSpinner.start('Adding unlocked bucket...')
        const result = await addUnlockedBucket(
          ctx.umi,
          ctx.identity,
          ctx.payer,
          publicKey(genesisAccountPda),
          publicKey(baseMintPubkey),
          publicKey(quoteMintPubkey),
          params,
        )
        bucketSpinner.succeed(`Unlocked bucket added: ${result.bucketPda}`)
        bucketCounts.unlocked++
        totalBuckets++
        bucketSummary.push(`  Unlocked #${params.bucketIndex}: ${result.bucketPda}`)
      }
    } catch (error) {
      bucketSpinner.fail(`Failed to add ${choice} bucket`)
      logger.warn(`Error: ${error instanceof Error ? error.message : String(error)}`)
      logger.log('You can try adding another bucket or select "Done".')
    }

    logger.log('')
  }

  // Step 3: Optional finalize
  logger.log('')
  logger.log('--- Step 3: Finalize ---')
  let finalizeSignature: string | undefined

  if (totalBuckets > 0) {
    const shouldFinalize = await confirm({ message: 'Finalize the Genesis account now?', default: true })
    if (shouldFinalize) {
      const finalizeSpinner = ora('Finalizing Genesis account...').start()
      try {
        // Fetch the genesis account to get the bucket count
        const genesisAccount = await safeFetchGenesisAccountV2(ctx.umi, publicKey(genesisAccountPda))
        if (!genesisAccount) {
          throw new Error('Genesis account not found')
        }

        finalizeSignature = await finalizeGenesis(
          ctx.umi,
          ctx.identity,
          publicKey(genesisAccountPda),
          publicKey(baseMintPubkey),
          genesisAccount.bucketCount,
        )
        finalizeSpinner.succeed('Genesis account finalized!')
      } catch (error) {
        finalizeSpinner.fail('Failed to finalize Genesis account')
        logger.warn(`Error: ${error instanceof Error ? error.message : String(error)}`)
        logger.log('You can finalize later with: mplx genesis finalize ' + genesisAccountPda)
      }
    }
  } else {
    logger.log('No buckets added. Skipping finalize.')
    logger.log('Add buckets later with: mplx genesis bucket add-launch-pool ' + genesisAccountPda)
  }

  // Step 4: Optional register on platform
  logger.log('')
  logger.log('--- Step 4: Register on Platform (Optional) ---')
  const shouldRegister = await confirm({
    message: 'Register this launch on the Metaplex platform?',
    default: false,
  })

  let registrationResult: { launchId: string; launchLink: string } | undefined
  if (shouldRegister) {
    const registerSpinner = ora('Registering on platform...')
    try {
      const registerData = await promptRegisterLaunch()

      const launchInput = buildLaunchInput(
        ctx.identity.publicKey.toString(),
        ctx.chain,
        {
          launchType: 'launchpool',
          token: {
            name: createResult.name,
            symbol: createResult.symbol,
            image: registerData.image,
            ...(registerData.description && { description: registerData.description }),
          },
          socials: {
            ...(registerData.website && { website: registerData.website }),
            ...(registerData.twitter && { twitter: registerData.twitter }),
            ...(registerData.telegram && { telegram: registerData.telegram }),
          },
          quoteMint: registerData.quoteMint,
          depositStartTime: registerData.depositStartTime,
          tokenAllocation: registerData.tokenAllocation,
          raiseGoal: registerData.raiseGoal,
          raydiumLiquidityBps: registerData.raydiumLiquidityBps,
          fundsRecipient: registerData.fundsRecipient,
        },
      )

      const apiConfig: GenesisApiConfig = {
        baseUrl: ctx.apiUrl,
      }

      registerSpinner.start()
      const result = await registerLaunch(ctx.umi, apiConfig, {
        genesisAccount: genesisAccountPda,
        createLaunchInput: launchInput,
      })

      registerSpinner.succeed('Registered on Metaplex platform!')
      logger.log(`  Launch ID: ${result.launch.id}`)
      logger.log(`  Launch Link: ${result.launch.link}`)

      registrationResult = {
        launchId: result.launch.id,
        launchLink: result.launch.link,
      }
    } catch (error) {
      registerSpinner.fail('Registration failed')
      logger.warn(`Registration failed: ${error instanceof Error ? error.message : String(error)}`)
      if (error && typeof error === 'object' && 'responseBody' in error) {
        logger.logJson((error as { responseBody: unknown }).responseBody)
      }
      logger.log('You can register later with: mplx genesis launch register ' + genesisAccountPda)
    }
  }

  // Summary
  logger.log('')
  logger.log('============================================')
  logger.log('  Genesis Launch Summary')
  logger.log('============================================')
  logger.log('')
  logger.logSuccess(`Genesis Account: ${genesisAccountPda}`)
  logger.log(`Base Mint: ${baseMintPubkey}`)
  logger.log(`Quote Mint: ${quoteMintPubkey}`)
  logger.log(`Token: ${createResult.name} (${createResult.symbol})`)
  logger.log(`Total Supply: ${createResult.totalSupply}`)
  logger.log(`Decimals: ${createResult.decimals}`)
  logger.log(`Funding Mode: ${createResult.fundingMode}`)
  logger.log('')
  if (bucketSummary.length > 0) {
    logger.log('Buckets:')
    for (const line of bucketSummary) {
      logger.log(line)
    }
    logger.log('')
  }
  if (finalizeSignature) {
    logger.log(`Finalized: Yes (${finalizeSignature})`)
  } else {
    logger.log('Finalized: No')
  }

  return {
    genesisAccount: genesisAccountPda,
    baseMint: baseMintPubkey,
    quoteMint: quoteMintPubkey,
    name: createResult.name,
    symbol: createResult.symbol,
    totalSupply: createResult.totalSupply,
    decimals: createResult.decimals,
    fundingMode: createResult.fundingMode,
    buckets: totalBuckets,
    finalized: !!finalizeSignature,
    ...(registrationResult ? { registration: registrationResult } : {}),
  }
}
