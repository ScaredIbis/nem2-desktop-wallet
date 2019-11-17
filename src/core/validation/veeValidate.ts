import i18n from '@/language'
import VeeValidate from 'vee-validate'
import en from 'vee-validate/dist/locale/en'
import zhCN from 'vee-validate/dist/locale/zh_CN'
import {registerCustomValidators, CUSTOM_VALIDATORS_NAMES} from '.'
import {Message} from '@/config/constants'

const customMessagesEn = {
    [CUSTOM_VALIDATORS_NAMES.address]: () => Message.ADDRESS_INVALID,
    [CUSTOM_VALIDATORS_NAMES.addressNetworkType]: () => Message.NETWORK_TYPE_INVALID,
    [CUSTOM_VALIDATORS_NAMES.addressOrAliasNetworkType]: () => Message.NETWORK_TYPE_INVALID,
    [CUSTOM_VALIDATORS_NAMES.amountDecimals]: () => Message.DIVISIBILITY_INVALID,
    [CUSTOM_VALIDATORS_NAMES.confirmLock]: () => Message.WRONG_PASSWORD_ERROR,
    [CUSTOM_VALIDATORS_NAMES.confirmPassword]: () => Message.PASSWORDS_NOT_MATCHING,
    [CUSTOM_VALIDATORS_NAMES.confirmWalletPassword]: () => Message.WRONG_PASSWORD_ERROR,
    [CUSTOM_VALIDATORS_NAMES.mosaicMaxAmount]: () => Message.VALUE_TOO_BIG,
    [CUSTOM_VALIDATORS_NAMES.namespaceOrMosaicId]: () => Message.INVALID_NAMESPACE_OR_MOSAIC_ID,
    [CUSTOM_VALIDATORS_NAMES.otherField]: () => Message.MOSAIC_NOT_SET,
    [CUSTOM_VALIDATORS_NAMES.privateKey]: () => Message.PRIVATE_KEY_INVALID_ERROR,
    [CUSTOM_VALIDATORS_NAMES.publicKey]: () => Message.PUBLIC_KEY_INVALID,
    [CUSTOM_VALIDATORS_NAMES.remoteAccountPrivateKey]: () => Message.PRIVATE_KEY_INVALID_ERROR,
}

const custom = {
    mosaicListLength: {min_value: () => Message.EMPTY_MOSAIC_LIST,}
}


export const veeValidateConfig = {
    i18n,
    fieldsBagName: 'fieldBags',
    dictionary: {
        'en-US': {
            messages: {...en.messages, ...customMessagesEn},
            custom,
        },
        'zh-CN': {
            messages: {...zhCN.messages},
        },
    },
    inject: {
        $validator: '$validator',
    },
}

registerCustomValidators(VeeValidate.Validator)
