import Vue from 'vue'
import iView from 'iview'
import Router from 'vue-router'
import { veeValidateConfig } from '@/core/validation';
import App from '@/App.vue'
import i18n from '@/language/index.ts'
import store from '@/store/index.ts'
import router from '@/router/index.ts'
import 'iview/dist/styles/iview.css'
// import {resetFontSize} from '@/core/utils/electron'
import htmlRem from '@/core/utils/rem.ts'
import VeeValidate from 'vee-validate';

Vue.use(Router)
//Introduced the global
Vue.use(iView)
Vue.use(VeeValidate, veeValidateConfig)
htmlRem()
// resetFontSize()

Vue.config.productionTip = false

export default new Vue({
    el: '#app',
    router,
    store,
    i18n,
    render: h => h(App)
})
