import {MosaicId, Account} from 'nem2-sdk'
import {networkConfig} from '@/config/constants'
import {AppAccounts, ValidationObject, AppWallet} from "@/core/model"
import {validateAddress, validatePublicKey, validateAlias, validateMosaicId, validateNamespace} from './validators'
const {PUBLIC_KEY_LENGTH} = networkConfig

const getOtherFieldValue = (otherField, validator) => {
    const validatorFields = validator.Validator.$vee._validator.fields.items
    const field = validatorFields.find(field => field.name === otherField)
    if (field === undefined) throw new Error('The targeted confirmation field was not found')
    return field.value
}

export const CUSTOM_VALIDATORS_NAMES = {
    address: 'address',
    addressOrPublicKey: 'addressOrPublicKey',
    confirmPassword: 'confirmPassword',
    confirmLock: 'confirmLock',
    confirmWalletPassword: 'confirmWalletPassword',
    mosaicId: 'mosaicId',
    addressOrAlias: 'addressOrAlias',
    alias: 'alias',
    remoteAccountPrivateKey: 'remoteAccountPrivateKey',
    publicKey: 'publicKey',
    namespaceOrMosaicId: 'namespaceOrMosaicId',
}

const aliasValidator = (context): Promise<ValidationObject> => {
    return context.Validator.extend(
        CUSTOM_VALIDATORS_NAMES.alias,
        (alias) => new Promise((resolve) => {
            resolve(validateAlias(alias))
        }),
    )
}

const publicKeyValidator = (context): Promise<ValidationObject> => {
    return context.Validator.extend(
        CUSTOM_VALIDATORS_NAMES.publicKey,
        (publicKey) => new Promise((resolve) => {
            resolve(validatePublicKey(publicKey))
        }),
    )
}

const confirmLockValidator = (context): Promise<ValidationObject> => {
    return context.Validator.extend(
        CUSTOM_VALIDATORS_NAMES.confirmLock,
        (password, [otherField]) => new Promise((resolve) => {
            const passwordCipher = getOtherFieldValue(otherField, context)
            if (AppAccounts().decryptString(passwordCipher, password) !== password) resolve({valid: false})
            resolve({valid: true})
        }),
        {hasTarget: true},
    )
}

const remoteAccountPrivateKeyValidator = (context): Promise<ValidationObject> => {
    return context.Validator.extend(
        CUSTOM_VALIDATORS_NAMES.remoteAccountPrivateKey,
        (privateKey, [otherField]) => new Promise((resolve) => {
            const wallet: AppWallet = getOtherFieldValue(otherField, context)
            if (!(wallet instanceof AppWallet)) resolve({valid: false})

            try {
                const account = Account.createFromPrivateKey(privateKey, wallet.networkType)
                if (wallet.linkedAccountKey && wallet.linkedAccountKey !== account.publicKey) {
                    resolve({valid: false})
                }
                resolve({valid: true})
            } catch (error) {
                resolve({valid: false})
            }
        }),
        {hasTarget: true},
    )
}

const confirmPasswordValidator = (context): Promise<ValidationObject> => {
    return context.Validator.extend(
        CUSTOM_VALIDATORS_NAMES.confirmPassword,
        (password, [otherField]) => new Promise((resolve) => {
            const otherValue = getOtherFieldValue(otherField, context)
            if (otherValue !== password) resolve({valid: false})
            resolve({valid: password})
        }),
        {hasTarget: true},
    )
}

const confirmWalletPasswordValidator = (context): Promise<ValidationObject> => {
    return context.Validator.extend(
        CUSTOM_VALIDATORS_NAMES.confirmWalletPassword,
        (password, [otherField]) => new Promise((resolve) => {
            const wallet = getOtherFieldValue(otherField, context)
            if(!(wallet instanceof AppWallet)) resolve({valid: false})
            resolve({valid: wallet.checkPassword(password)})
        }),
        {hasTarget: true},
    )
}

const mosaicIdValidator = (context): Promise<ValidationObject> => {
    return context.Validator.extend(
        CUSTOM_VALIDATORS_NAMES.mosaicId,
        (mosaicId) => new Promise((resolve) => {
            try {
                new MosaicId(mosaicId)
                resolve({valid: mosaicId})
            } catch (error) {
                resolve({valid: false})
            }
        }),
    )
}

const namespaceOrMosaicIdValidator = (context): Promise<ValidationObject> => {
    return context.Validator.extend(
        CUSTOM_VALIDATORS_NAMES.namespaceOrMosaicId,
        (namespaceOrMosaicId) => new Promise((resolve) => {
            const isValidNamespace = validateMosaicId(namespaceOrMosaicId)
            const isValidMosaicId = validateNamespace(namespaceOrMosaicId)

            if (isValidNamespace.valid || isValidMosaicId.valid) {
                resolve({valid: namespaceOrMosaicId})
            } else {
                resolve({valid: false})
            }
        }),
    )
}

const addressOrAliasValidator = (context): Promise<ValidationObject> => {
    return context.Validator.extend(
        CUSTOM_VALIDATORS_NAMES.addressOrAlias,
        (addressOrAlias) => new Promise(async (resolve) => {
            const isValidAddress = validateAddress(addressOrAlias)
            const isValidAlias = validateAlias(addressOrAlias)

            if (isValidAddress.valid || isValidAlias.valid) {
                resolve({valid: addressOrAlias})
            } else {
                resolve({valid: false})
            }
        }),
    )
}


const addressValidator = (context): Promise<ValidationObject> => {
    return context.Validator.extend(
        CUSTOM_VALIDATORS_NAMES.address,
        (address) => new Promise(async (resolve) => {
                resolve(validateAddress(address))
        }),
    )
}

const addressOrPublicKeyValidator = (context): Promise<ValidationObject> => {
    return context.Validator.extend(
        CUSTOM_VALIDATORS_NAMES.addressOrPublicKey,
        (addressOrPublicKey) => new Promise(async (resolve) => {
            if (addressOrPublicKey.length === PUBLIC_KEY_LENGTH) {
                const r = validatePublicKey(addressOrPublicKey)
                resolve(r)
            }
            resolve(validateAddress(addressOrPublicKey))
        }),
    )
}

const customValidatorFactory = {
    [CUSTOM_VALIDATORS_NAMES.address]: addressValidator,
    [CUSTOM_VALIDATORS_NAMES.addressOrAlias]: addressOrAliasValidator,
    [CUSTOM_VALIDATORS_NAMES.addressOrPublicKey]: addressOrPublicKeyValidator,
    [CUSTOM_VALIDATORS_NAMES.alias]: aliasValidator,
    [CUSTOM_VALIDATORS_NAMES.confirmLock]: confirmLockValidator,
    [CUSTOM_VALIDATORS_NAMES.confirmPassword]: confirmPasswordValidator,
    [CUSTOM_VALIDATORS_NAMES.confirmWalletPassword]: confirmWalletPasswordValidator,
    [CUSTOM_VALIDATORS_NAMES.mosaicId]: mosaicIdValidator,
    [CUSTOM_VALIDATORS_NAMES.remoteAccountPrivateKey]: remoteAccountPrivateKeyValidator,
    [CUSTOM_VALIDATORS_NAMES.publicKey]: publicKeyValidator,
    [CUSTOM_VALIDATORS_NAMES.namespaceOrMosaicId]: namespaceOrMosaicIdValidator,
}

const CustomValidator = (name, Validator) => ({
    name,
    Validator,
    register() {
        return customValidatorFactory[this.name](this)
    },
})

export const registerCustomValidators = (Validator) => {
    Object.keys(CUSTOM_VALIDATORS_NAMES)
        .forEach(name => CustomValidator(name, Validator).register())
}
 