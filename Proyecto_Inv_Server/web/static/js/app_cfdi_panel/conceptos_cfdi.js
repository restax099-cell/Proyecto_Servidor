import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';
import { fetchXmlData } from './api_cfdi.js'




Alpine.data('conceptosApp', () => ({
    conceptos: [],
    isLoading: true,
    uuid: '',
    abortController: null,

    async init() {
        const infoDiv = document.getElementById('info-conceptos');
        if (infoDiv && infoDiv.dataset.uuid) {
            this.uuid = infoDiv.dataset.uuid;
            await this.loadConceptos();
        } else {
            console.error('No se pudo encontrar el UUID en la página.');
            this.isLoading = false;
        }
    },

    async loadConceptos() {
        if (this.abortController) this.abortController.abort();
        this.abortController = new AbortController();

        this.isLoading = true;
        try {
            const data = await fetchXmlData(this.uuid, this.abortController.signal);

            if (data && Array.isArray(data)) {
                this.conceptos = data.map(item => {
                    let importe = parseFloat(item.importe);
                    if (isNaN(importe) || item.importe === null) {
                        importe = parseFloat(item.valor_unitario) || 0;
                    }

                    const tasaCuota = parseFloat(item.tasa_cuota) || 0;
                    let iva = 0;
                    if (tasaCuota >= 0) {
                        iva = tasaCuota * importe;
                    }

                    const total = importe + iva;

                    return {
                        ...item,
                        importeCalculado: importe,
                        ivaCalculado: iva,
                        totalCalculado: total
                    };
                });
            } else {
                this.conceptos = [];
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error("Error al cargar los conceptos:", error);
                this.conceptos = [];
            }
        } finally {
            this.isLoading = false;
        }
    },

    formatMoney(val) {
        let num = parseFloat(val);
        if (isNaN(num)) num = 0;
        return `$${num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
    },

    formatPercent(val) {
        const tasa = parseFloat(val);
        if (isNaN(tasa) || tasa === 0) return '0%';
        return `${(tasa * 100).toFixed(2)}%`;
    }
}));

window.Alpine = Alpine;
Alpine.start();