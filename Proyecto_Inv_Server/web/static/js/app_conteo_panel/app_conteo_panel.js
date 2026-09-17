import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';


import { 
    fetchPlantillasConteo,
    fetchStores 
} from './api_conteo.js'; 


Alpine.data('conteoApp', () => ({
    busqueda: '',
    plantillaSeleccionada: null,
    plantillas: [],
    fechaConteo: '',
    isLoading: true,

    async init() {
        const hoy = new Date();
        const dia = String(hoy.getDate()).padStart(2, '0');
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const anio = hoy.getFullYear();
        this.fechaConteo = `${dia}/${mes}/${anio}`;
        
        this.isLoading = true;
        
        const [rawData, storesData] = await Promise.all([
            fetchPlantillasConteo(),
            fetchStores()
        ]);
            
        this.plantillas = this.mapearPlantillas(rawData, storesData);
       
        
        this.isLoading = false;
    },

    mapearPlantillas(datosApi, storesData) {
        return datosApi.map(item => {
            
            // -- Buscar el nombre del almacén por su ID --
            // Comparamos el ID del almacén (s.id) con el ID que trae la plantilla (item.store)
            const almacenEncontrado = storesData.find(s => s.id === item.store);
            
            // Si lo encuentra, usamos el nombre (s.store), si no, dejamos un texto de respaldo
            const nombreAlmacen = almacenEncontrado ? almacenEncontrado.store : `Almacén ID: ${item.store}`;

            // -- A. Formatear la descripción --
            let descripcion = 'Sin catálogos';
            let totalItems = 0;
            
            if (item.catalogos_json && item.catalogos_json.length > 0) {
                const categorias = item.catalogos_json.map(c => this.capitalizar(c.categoria)).join(', ');
                totalItems = item.catalogos_json.reduce((sum, c) => sum + (c.items || 0), 0);
                descripcion = `${categorias} · ${totalItems} items`;
            }

            // -- B. Formatear la frecuencia --
            let frecuenciaTexto = this.capitalizar(item.frecuencia);
            let diasArray = []; 

            if (item.frecuencia === 'Diario' && item.dias_semana) {
                diasArray = item.dias_semana.split(','); // Convertimos "L,Ma,Mi..." a ['L', 'Ma', 'Mi'...]
            } else if (item.frecuencia === 'Mensual' && item.dia_mes) {
                frecuenciaTexto += ` · día ${item.dia_mes}`;
            }

            // -- C. Formatear Límite de Captura y Alertas --
            let limiteObj = null;
            let esAlertaRoja = false;
            let estaVencida = false;

            if (item.dia_limite && item.hora_limite) {
                // 1. Separar y formatear la fecha
                const [year, month, day] = item.dia_limite.split('-');
                const fechaLatina = `${day}/${month}/${year}`;
                const horaLimpia = item.hora_limite.substring(0, 5); // Ej. "11:00"

                // 2. Comprobar si ya venció (comparamos la fecha/hora límite vs AHORA)
                const limiteDateTime = new Date(`${item.dia_limite}T${item.hora_limite}`);
                const ahora = new Date();
                
                if (limiteDateTime < ahora) {
                    estaVencida = true; // ¡El tiempo ya expiró!
                }

                // 3. Determinar si es "Hoy"
                const hoyStr = ahora.getFullYear() + '-' + 
                            String(ahora.getMonth() + 1).padStart(2, '0') + '-' + 
                            String(ahora.getDate()).padStart(2, '0');
                const textoFecha = (item.dia_limite === hoyStr) ? 'Hoy' : fechaLatina;

                limiteObj = {
                    fecha: textoFecha,
                    hora: horaLimpia
                };
                
                // Si bloquear_vencer_limite es 1 o si ya venció, encendemos la alerta visual
                esAlertaRoja = item.bloquear_vencer_limite === 1 || estaVencida; 
            }




            return {
                id: item.id,
                nombre: item.nombre,
                descripcion: descripcion,
                almacen: nombreAlmacen, 
                frecuencia: frecuenciaTexto,
                diasFrecuencia: diasArray,
                limiteCaptura: limiteObj,
                alertaRoja: esAlertaRoja,
                estaVencida: estaVencida,
                inactiva: item.status === 0
            };
        });
    },

    // Helper para poner en mayúscula la primera letra (ej. "CARNES" -> "Carnes")
    capitalizar(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    // --- Funciones Computadas / Métodos Originales ---
    get plantillasFiltradas() {
        if (this.busqueda === '') {
            return this.plantillas;
        }
        const b = this.busqueda.toLowerCase();
        return this.plantillas.filter(p => 
            p.nombre.toLowerCase().includes(b) || 
            p.almacen.toLowerCase().includes(b)
        );
    },

    get textoAlmacenSeleccionado() {
        if(!this.plantillaSeleccionada) return '';
        const plan = this.plantillas.find(p => p.id === this.plantillaSeleccionada);
        if(plan && !plan.inactiva) {
            return `${plan.almacen} · definido por la plantilla`;
        }
        return '';
    },

    seleccionarPlantilla(plantilla) {
        if (!plantilla.inactiva) {
            // Si hacemos clic en la plantilla que ya está seleccionada, la des-seleccionamos
            if (this.plantillaSeleccionada === plantilla.id) {
                this.plantillaSeleccionada = null;
            } else {
                // Si es una diferente, la seleccionamos normalmente
                this.plantillaSeleccionada = plantilla.id;
            }
        }
    },

    obtenerClaseLimite(plantilla) {
        if (plantilla.inactiva) return 'text-muted';
        if (plantilla.alertaRoja) return 'text-danger fw-semibold'; // Clases de Bootstrap
        return '';
    }
}));

window.Alpine = Alpine;
Alpine.start();