import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';
import { 
    fetchListaCatalogos, 
    savePlantillaConteo, 
    fetchPlantillasConteo, 
    fetchUsuarios,
    fetchStores,
} from './api_cont_plant.js'; 

Alpine.data('plantillasApp', () => ({
    // --- VARIABLES DE LA BARRA LATERAL ---

    plantillaActiva: null, // Inicia sin nada seleccionado
    mostrarPanel: false,
    
    listaPlantillas: [],

    // --- 1. ESTADO DEL FORMULARIO ---
    formulario: {
        codigo: 'PC-01', 
        nombre: '',
        store: '',
        user_id: '',
        status: 1, 
        frecuencia: 'Diario',
        dias_semana: ['L', 'Ma', 'Mi', 'J', 'V', 'S'],
        dia_mes: null,
        vigencia: '', 
        hora_apertura: '', 
        hora_limite: '',
        dia_limite: '', 
        bloquear_vencer_limite: 1,
        permitir_buscar_fuera_catalogo: 1,
        mostrar_existencia_teorica: 0,
        responsables: '' // Lo dejamos como string vacío porque el select ya no es "multiple"
    },

    // --- 2. ESTADO DE LOS CATÁLOGOS ---
    catalogosSeleccionados: [], 
    catalogosDisponibles: [],  
    searchCatalogo: '', 
    textoBusqueda: '',    
    usuarios:[],  
    stores: [], 
    
    // --- 3. ESTADO DE LA UI ---
    isModalOpen: false,
    isLoading: false,


    init() {
        this.cargarLista();
    },

    // --- 4. MÉTODOS LOCALES ---
    toggleDia(dia) {
        if (this.formulario.dias_semana.includes(dia)) {
            this.formulario.dias_semana = this.formulario.dias_semana.filter(d => d !== dia);
        } else {
            this.formulario.dias_semana.push(dia);
        }
    },

    removerCatalogo(idCatalogo) {
        this.catalogosSeleccionados = this.catalogosSeleccionados.filter(c => c.id !== idCatalogo);
        this.catalogosSeleccionados.forEach((c, index) => c.orden = index + 1);
    },

    isCatalogoAgregado(idCategoria) {
        // Valida si el ID del catálogo ya existe en la lista de seleccionados
        return this.catalogosSeleccionados.some(c => c.id === idCategoria);
    },

    // --- 5. MÉTODOS DE API (GET) ---
    async cargarLista() {
        this.listaPlantillas = await fetchPlantillasConteo(this.textoBusqueda);
        
        this.usuarios = await fetchUsuarios();
        this.stores = await fetchStores();
        console.log("Usuarios cargados:", this.usuarios);
    },

    seleccionarPlantilla(item) {
        this.plantillaActiva = item.id;
        
        let diasLimpios = [];
        if (Array.isArray(item.dias_semana)) {
            diasLimpios = item.dias_semana.map(d => d.trim());
        } else if (typeof item.dias_semana === 'string' && item.dias_semana.trim() !== '') {
            diasLimpios = item.dias_semana.split(',').map(d => d.trim());
        }
        
        this.formulario = {
            codigo: item.codigo || '',
            nombre: item.nombre || '',
            store: item.store || '',
            status: (item.status === 1 || item.status === true || item.status === '1') ? '1' : '0',
            frecuencia: item.frecuencia || 'Diario',
            dias_semana: diasLimpios, 
            dia_mes: item.dia_mes || '',
            vigencia: item.vigencia || '',
            hora_apertura: item.hora_apertura ? item.hora_apertura.substring(0, 5) : '',
            hora_limite: item.hora_limite ? item.hora_limite.substring(0, 5) : '',
            dia_limite: item.dia_limite !== null ? String(item.dia_limite) : '',
            bloquear_vencer_limite: Boolean(item.bloquear_vencer_limite),
            permitir_buscar_fuera_catalogo: Boolean(item.permitir_buscar_fuera_catalogo),
            mostrar_existencia_teorica: Boolean(item.mostrar_existencia_teorica),
            
            user_id: item.user_id || '' 
        };

        this.catalogosSeleccionados = Array.isArray(item.catalogos_json) ? [...item.catalogos_json] : [];
        this.mostrarPanel = true;
    },


    async btnAddCatalogos() {
        this.isModalOpen = true;
        this.searchCatalogo = ''; // Limpia el buscador para mostrar todos al abrir
        await this.buscarCatalogos(); 
    },

    async buscarCatalogos() {
        try {
            const response = await fetchListaCatalogos(this.searchCatalogo, null);
            this.catalogosDisponibles = response;
        } catch (error) {
            console.error("Error al obtener catálogos:", error);
        }
    },

    agregarCatalogo(catalogo) {
        const existe = this.catalogosSeleccionados.find(c => c.id === catalogo.categoria_id);
        if (!existe) {
            this.catalogosSeleccionados.push({
                id: catalogo.categoria_id,     
                codigo: catalogo.catalogo,     
                categoria: catalogo.categoria, 
                items: catalogo.cant_items,    
                orden: this.catalogosSeleccionados.length + 1 
            });
        }
    },

    // --- 6. MÉTODO DE GUARDADO (POST) ---
    async guardarPlantilla() {
        if (!this.formulario.nombre || !this.formulario.store) {
            alert("Por favor, ingresa el nombre de la plantilla y selecciona un almacén.");
            return;
        }
        
        if (this.catalogosSeleccionados.length === 0) {
            alert("Debes agregar al menos un catálogo a la lista antes de guardar.");
            return;
        }

        this.isLoading = true; 
        
        try {
            // 1. Calcular la fecha límite basada en la opción seleccionada ("mismo" o "siguiente")
            let fechaLimiteCalculada = null;
            const hoy = new Date(); // Fecha actual del sistema

            if (this.formulario.dia_limite === '0') {
                fechaLimiteCalculada = hoy.toISOString().split('T')[0];
            } else if (this.formulario.dia_limite === '1') {
                hoy.setDate(hoy.getDate() + 1);
                fechaLimiteCalculada = hoy.toISOString().split('T')[0];
            }

            // 2. Preparar el payload integrado
            const payload = {
                ...this.formulario,
                
                // Sobrescribimos o ajustamos los campos que necesitan parseo para la BD
                dias_semana: Array.isArray(this.formulario.dias_semana) 
                             ? this.formulario.dias_semana.join(',') 
                             : this.formulario.dias_semana,
                             
                dia_limite: fechaLimiteCalculada, // Envía la fecha calculada en formato YYYY-MM-DD
                
                catalogos: this.catalogosSeleccionados.map(c => ({
                    id: c.id,
                    orden: c.orden 
                }))
            };

            console.log("Datos a guardar:", payload);

            const response = await savePlantillaConteo(payload, null);
            
            if (response && response.status === 'success') {
                alert("Plantilla guardada con éxito.");
           
            } else {
                alert("No se pudo guardar la plantilla: " + (response.message || "Error desconocido"));
            }

        } catch (error) {
            console.error("Error crítico al guardar:", error);
            alert("Error de conexión con el servidor. Revisa la consola.");
        } finally {
            this.isLoading = false; 
        }
    },
    
    // --- 7. MÉTODOS DE LA UI PRINCIPAL ---
    async btnNuevaPlantilla() {
        // 1. Llamamos a tu API ya corregida usando el nombre exacto de tu función
        const plantillasActuales = await fetchPlantillasConteo();
        
        // Guardamos la lista fresca
        this.listaPlantillas = plantillasActuales; 

        // 2. Calculamos el código siguiente a prueba de errores
        this.formulario.codigo = this.generarSiguienteCodigo(); 
        
        // Reiniciamos el resto del formulario
        this.formulario.nombre = '';
        this.formulario.store = '';
        this.formulario.responsables = '';
        this.catalogosSeleccionados = [];
        
        this.plantillaActiva = null; 
        this.mostrarPanel = false; 

        // Abrimos el modal
        const modalElement = document.getElementById('modalNuevaPlantilla');
        if (modalElement && typeof bootstrap !== 'undefined') {
            const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
            modalInstance.show();
        }
    },

    iniciarEdicionNueva() {
        if (!this.formulario.nombre || !this.formulario.store) {
            console.warn("Faltan campos obligatorios");
        }
        this.mostrarPanel = true; 
    },

    // --- UTILIDADES ---
    // 1. FUNCIÓN PARA CALCULAR EL PRÓXIMO CÓDIGO
    generarSiguienteCodigo() {
        if (!this.listaPlantillas || this.listaPlantillas.length === 0) {
            return 'PC-01'; 
        }

        const ultimoRegistro = this.listaPlantillas[0];
        const ultimoCodigo = ultimoRegistro.codigo; 

        if (ultimoCodigo) {
            const codigoLimpio = ultimoCodigo.replace(/\s+/g, '').toUpperCase();
            
            if (codigoLimpio.startsWith('PC-')) {
                const numeroActual = parseInt(codigoLimpio.split('-')[1], 10);
                
                if (!isNaN(numeroActual)) {
                    const nextNum = numeroActual + 1;
                    return `PC-${String(nextNum).padStart(2, '0')}`; 
                }
            }
        }

        return 'PC-01';
    },

    prepararNuevaPlantilla() {
        this.formulario = {
            codigo: this.generarSiguienteCodigo(), 
            nombre: '',
            store: '',
            status: 1,
            frecuencia: 'Diario',
            dias_semana: [],
            dia_mes: 'No aplica',
            vigencia: '', 
            hora_apertura: '',
            hora_limite: '',
            dia_limite: '', 
            bloquear_vencer_limite: true,
            permitir_buscar_fuera_catalogo: true,
            mostrar_existencia_teorica: false
        };

        this.catalogosSeleccionados = [];
        
        // Aquí cambias tu variable de estado para mostrar el panel derecho si lo controlas con un x-show
        // this.plantillaSeleccionada = true; 
    },


    formatearDetalle(item) {
        if (item.status === 0 || item.status === false || item.status === '0') {
            return 'Inactiva';
        }

        const almacen = item.store || 'Sin almacén';
        let frecuenciaTexto = '';

        if (item.frecuencia === 'Diario') {
            frecuenciaTexto = 'diario';
        } else if (item.frecuencia === 'Semanal') {
            frecuenciaTexto = (item.dias_semana && item.dias_semana.length > 0) 
                ? item.dias_semana.join(', ').toLowerCase() 
                : 'semanal';
        } else if (item.frecuencia === 'Mensual') {
            frecuenciaTexto = item.dia_mes ? `día ${item.dia_mes}` : 'mensual';
        } else {
            frecuenciaTexto = item.frecuencia ? item.frecuencia.toLowerCase() : '';
        }

        const horaLimite = item.hora_limite ? item.hora_limite.substring(0, 5) : '--:--';
        return `${almacen} · ${frecuenciaTexto} · límite ${horaLimite}`;
    },

    
}));

window.Alpine = Alpine;
Alpine.start();