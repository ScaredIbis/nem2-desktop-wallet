import {zh_CN} from '@/language/zh-CN.ts';
import {en_US} from '@/language/en-US.ts';
import VueI18n from 'vue-i18n';
import Vue from 'vue';
import zh from 'iview/dist/locale/zh-CN';
import en from 'iview/dist/locale/en-US';

Vue.use(VueI18n);
// @ts-ignore
Vue.use({
    i18n: (key, value) => i18n.t(key, value)
});

const navLang = navigator.language;
const localLang = (navLang === 'zh-CN' || navLang === 'en-US') ? navLang : false;
let lang = window.localStorage.getItem('locale') || localLang || 'en-US';
window.localStorage.setItem('locale', lang);


const messages = {
    'zh-CN': zh_CN,
    'en-US': en_US
};
const i18n = new VueI18n({
    locale: lang,
    messages
});

export default i18n;

