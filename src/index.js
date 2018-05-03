
import pdfview_muti from './pdfviewerbeta.vue'

export default pdfview_muti

if (typeof window !== 'undefined' && window.Vue) {
    window.Vue.component('pdfviewer', pdfview_muti)
}