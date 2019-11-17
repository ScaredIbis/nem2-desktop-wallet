import i18n from '@/language'
import VeeValidate from 'vee-validate'
import en from 'vee-validate/dist/locale/en'
import ja from 'vee-validate/dist/locale/ja'
import zhCN from 'vee-validate/dist/locale/zh_CN'
import {registerCustomValidators, customMessages, customFieldMessages} from '.'

export const veeValidateConfig = {
    i18n,
    fieldsBagName: 'fieldBags',
    dictionary: {
        'en-US': {
            messages: {...en.messages, customMessages},
            custom: customFieldMessages,
        },
        'zh-CN': {
            messages: {...zhCN.messages},
        },
        'ja-JP': {
            messages: {...ja.messages},
        }
    },
    inject: {
        $validator: '$validator',
    },
}

registerCustomValidators(VeeValidate.Validator)
