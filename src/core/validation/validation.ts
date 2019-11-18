import {NETWORK_PARAMS, APP_PARAMS} from './constants'
import {CUSTOM_VALIDATORS_NAMES} from './customValidators'
import {networkConfig} from '@/config/constants'
const {maxMosaicAtomicUnits} = networkConfig

const {
    MAX_MOSAIC_ATOMIC_UNITS,
    MAX_MOSAIC_DIVISIBILITY,
    MAX_MOSAIC_DURATION,
    GENERATION_HASH_LENGTH,
    MAX_MESSAGE_LENGTH,
    MIN_NAMESPACE_DURATION,
    MAX_NAMESPACE_DURATION,
    PRIVATE_KEY_LENGTH,
    NAMESPACE_MAX_LENGTH,
} = NETWORK_PARAMS

const { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH} = APP_PARAMS

export const validation = {
    address: 'required|address|addressNetworkType:currentAccount',
    accountPassword: 'required|confirmLock:accountPassword',
    addressOrAlias: `required|${CUSTOM_VALIDATORS_NAMES.addressOrAlias}|addressOrAliasNetworkType:currentAccount`,
    amount: 'decimal:6|min_value:0|otherField:selectedMosaic|amountDecimals:selectedMosaic|mosaicMaxAmount:selectedMosaic',
    confirmPassword: 'required|confirmPassword:newPassword',
    divisibility: `required|min_value:1|max_value:${MAX_MOSAIC_DIVISIBILITY}|integer`,
    duration: `required|min_value:0|max_value:${MAX_MOSAIC_DURATION}`,
    generationHash: `required|min:${GENERATION_HASH_LENGTH}|max:${GENERATION_HASH_LENGTH}`,
    invoiceAmount: `decimal:6|min_value:0|max_value:${maxMosaicAtomicUnits}`,
    mosaicId: 'required|mosaicId',
    message: `max:${MAX_MESSAGE_LENGTH}`,
    mosaicListLength: `min_value:1`,
    namespaceDuration: `required|min_value:${MIN_NAMESPACE_DURATION}|max_value:${MAX_NAMESPACE_DURATION}`,
    namespaceName: `^[a-z0-9-_]{1,${NAMESPACE_MAX_LENGTH}}$`,
    password: {
        required: true,
        min: MIN_PASSWORD_LENGTH,
        max: MAX_PASSWORD_LENGTH,
    },
    previousPassword: 'required|confirmLock:cipher',
    privateKey: `min:${PRIVATE_KEY_LENGTH}|max:${PRIVATE_KEY_LENGTH}|privateKey`,
    recipientPublicKey: 'required|publicKey',
    supply: `required|integer|min_value: 1|max_value:${MAX_MOSAIC_ATOMIC_UNITS}`,
    walletPassword: 'required|confirmWalletPassword:wallet',
    subNamespaceName: {
        required: true,
        regex: `^[a-z0-9-_.]{1,${NAMESPACE_MAX_LENGTH}}$`,
    },
}
