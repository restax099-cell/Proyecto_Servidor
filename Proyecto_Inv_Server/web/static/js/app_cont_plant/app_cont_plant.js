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
        responsables: ''
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

    // --- 4. ALERTAS ---
    alerta: {
        tipo: 'warning',
        titulo: '',
        mensaje: '',
        textoBoton: 'Aceptar',
        onConfirm: null 
    },


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

    //* GET
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

    //* Setter
    // --- 6. MÉTODO DE GUARDADO (POST) ---
    async guardarPlantilla() {
        // --- 1. VALIDACIÓN AMARILLA (WARNING): Validar ABSOLUTAMENTE TODOS los campos obligatorios ---

        // A. Datos Generales, Horarios y Vigencia
        if (!this.formulario.nombre || !this.formulario.store || !this.formulario.user_id || 
            !this.formulario.hora_apertura || !this.formulario.hora_limite || !this.formulario.vigencia) {
            this.mostrarAlerta({
                tipo: 'warning',
                titulo: 'Campos obligatorios incompletos',
                mensaje: 'Hay espacios vacíos esenciales. Por favor, completa el Nombre, Almacén, Responsable, Horarios de apertura/límite y la Vigencia.',
                textoBoton: 'Entendido'
            });
            return;
        }

        // B. Frecuencia y sus reglas específicas
        if (!this.formulario.frecuencia) {
            this.mostrarAlerta({
                tipo: 'warning',
                titulo: 'Frecuencia no seleccionada',
                mensaje: 'Por favor, selecciona la frecuencia de ejecución (Diario, Semanal, Mensual o Trimestral).',
                textoBoton: 'Entendido'
            });
            return;
        }

        // Si la frecuencia es Semanal, debe seleccionar al menos un día de la semana
        if (this.formulario.frecuencia === 'Semanal' || this.formulario.frecuencia === 'semanal') {
            const dias = Array.isArray(this.formulario.dias_semana) 
                        ? this.formulario.dias_semana 
                        : (this.formulario.dias_semana ? this.formulario.dias_semana.split(',') : []);
                        
            if (dias.length === 0) {
                this.mostrarAlerta({
                    tipo: 'warning',
                    titulo: 'Día de la semana requerido',
                    mensaje: 'Para la frecuencia semanal, debes seleccionar el día de la semana en que se ejecutará.',
                    textoBoton: 'Entendido'
                });
                return;
            }
        }

        // Si es Mensual o Trimestral, debe haber ingresado el día del mes
        if ((this.formulario.frecuencia === 'Mensual' || this.formulario.frecuencia === 'Trimestral' || 
            this.formulario.frecuencia === 'mensual' || this.formulario.frecuencia === 'trimestral') && !this.formulario.dia_mes) {
                this.mostrarAlerta({
                    tipo: 'warning',
                    titulo: 'Día del mes requerido',
                    mensaje: 'Por favor, especifica el día del mes en que se debe realizar el conteo.',
                    textoBoton: 'Entendido'
                });
            return;
        }

        // C. Límite de Captura
        if (this.formulario.dia_limite === null || this.formulario.dia_limite === undefined || this.formulario.dia_limite === '') {
            this.mostrarAlerta({
                tipo: 'warning',
                titulo: 'Límite de captura requerido',
                mensaje: 'Debes seleccionar el límite de captura para la plantilla.',
                textoBoton: 'Entendido'
            });
            return;
        }

        // D. Catálogos Seleccionados
        if (!this.catalogosSeleccionados || this.catalogosSeleccionados.length === 0) {
            this.mostrarAlerta({
                tipo: 'warning',
                titulo: 'Catálogos requeridos',
                mensaje: 'Debes agregar al menos un catálogo a la lista antes de guardar la plantilla.',
                textoBoton: 'Entendido'
            });
            return;
        }

        // --- FIN DE VALIDACIONES: SI PASA TODO, PROCEDE A GUARDAR ---

        this.isLoading = true; 
        
        try {
            const valorDiaLimite = this.formulario.dia_limite;
            const offsetDiaLimite = (valorDiaLimite !== null && valorDiaLimite !== undefined && valorDiaLimite !== '') 
                                    ? parseInt(valorDiaLimite, 10) 
                                    : 0; 

            const payload = {
                ...this.formulario,
                dias_semana: Array.isArray(this.formulario.dias_semana) 
                            ? this.formulario.dias_semana.join(',') 
                            : this.formulario.dias_semana,
                dia_limite: offsetDiaLimite, 
                catalogos: this.catalogosSeleccionados.map(c => ({
                    id: c.id,
                    orden: c.orden 
                }))
            };

            console.log("Datos a guardar validados:", payload);

            const response = await savePlantillaConteo(payload, null);
            
            if (response && response.status === 'success') {
                this.mostrarAlerta({
                    tipo: 'success',
                    titulo: '¡Guardado exitoso!',
                    mensaje: 'La plantilla de conteo se ha guardado correctamente.',
                    textoBoton: 'Aceptar',
                    onConfirm: async () => {
                        await this.cargarLista(); 
                        this.mostrarPanel = false;
                    }
                });
            } else {
                this.mostrarAlerta({
                    tipo: 'danger',
                    titulo: 'Error al guardar',
                    mensaje: 'No se pudo guardar la plantilla: ' + (response.message || 'Error desconocido'),
                    textoBoton: 'Cerrar'
                });
            }

        } catch (error) {
            console.error("Error crítico al guardar:", error);
            this.mostrarAlerta({
                tipo: 'danger',
                titulo: 'Error de conexión',
                mensaje: 'Ocurrió un error al conectar con el servidor. Por favor, intenta de nuevo.',
                textoBoton: 'Cerrar'
            });
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
        if (!this.formulario.nombre || !this.formulario.store || !this.formulario.user_id) {
            this.mostrarAlerta({
                tipo: 'warning',
                titulo: 'Campos obligatorios incompletos',
                mensaje: 'No puedes dejar espacios vacíos en los campos obligatorios (Nombre de la plantilla y Almacén). Por favor, complétalos para poder avanzar.',
                textoBoton: 'Entendido'
            });
            return; 
        }
        
        const modalElement = document.getElementById('modalNuevaPlantilla');
        if (modalElement && typeof bootstrap !== 'undefined') {
            const modalInstance = bootstrap.Modal.getInstance(modalElement) || bootstrap.Modal.getOrCreateInstance(modalElement);
            if (modalInstance) {
                modalInstance.hide();
            }
        }

        this.mostrarPanel = true; 
    },

    // --- UTILIDADES ---
    // 1. FUNCIÓN PARA CALCULAR EL PRÓXIMO CÓDIGO
    generarSiguienteCodigo() {
        if (!this.listaPlantillas || this.listaPlantillas.length === 0) {
            return 'PC-01'; 
        }

        let maxNum = 0;

        // Recorremos todas las plantillas para encontrar el número más alto existente
        this.listaPlantillas.forEach(plantilla => {
            const codigo = plantilla.codigo;
            if (codigo) {
                const codigoLimpio = codigo.replace(/\s+/g, '').toUpperCase();
                
                if (codigoLimpio.startsWith('PC-')) {
                    const numeroActual = parseInt(codigoLimpio.split('-')[1], 10);
                    
                    if (!isNaN(numeroActual) && numeroActual > maxNum) {
                        maxNum = numeroActual;
                    }
                }
            }
        });

        // Si ya existen PC-01 y PC-02, maxNum será 2, por lo tanto el siguiente será PC-03
        const nextNum = maxNum + 1;
        return `PC-${String(nextNum).padStart(2, '0')}`;
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
        // Verificamos si dias_semana existe y es un arreglo antes de usar .join()
        let diasFormateados = '';
        if (item.dias_semana) {
            if (Array.isArray(item.dias_semana)) {
                diasFormateados = item.dias_semana.join(', ');
            } else if (typeof item.dias_semana === 'string') {
                diasFormateados = item.dias_semana.split(',').join(', ');
            }
        }

        // Retornas tu estructura de texto combinada con los días ya seguros
        return `1 · ${item.frecuencia || 'Sin frecuencia'} · límite ${item.hora_limite || 'N/A'} ${diasFormateados ? '· ' + diasFormateados : ''}`;
    },


    // Método para cambiar la frecuencia y ajustar los campos automáticamente
    cambiarFrecuencia(frecuencia) {
        this.formulario.frecuencia = frecuencia;
        
        if (frecuencia === 'Diario') {
            this.formulario.dias_semana = ['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D'];
            this.formulario.dia_mes = '';
        } else if (frecuencia === 'Semanal') {
            this.formulario.dias_semana = ['S'];
            this.formulario.dia_mes = '';
        } else if (frecuencia === 'Mensual' || frecuencia === 'Trimestral') {
            this.formulario.dias_semana = [];
            this.formulario.dia_mes = '1'; 
        }
    },

    toggleDia(dia) {
        if (this.formulario.frecuencia === 'Mensual' || this.formulario.frecuencia === 'Trimestral') return;

        if (this.formulario.frecuencia === 'Semanal') {
            this.formulario.dias_semana = [dia];
        } else {
            if (this.formulario.dias_semana.includes(dia)) {
                this.formulario.dias_semana = this.formulario.dias_semana.filter(d => d !== dia);
            } else {
                this.formulario.dias_semana.push(dia);
            }
        }
    },

    // Métodos de Alertas
    mostrarAlerta({ tipo = 'warning', titulo = '', mensaje = '', textoBoton = 'Aceptar', onConfirm = null }) {
        this.alerta = { tipo, titulo, mensaje, textoBoton, onConfirm };
        
        const modalElement = document.getElementById('modalAlertaGeneral');
        if (modalElement && typeof bootstrap !== 'undefined') {
            const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
            modalInstance.show();
        }
    },

    confirmarAccion() {
        if (typeof this.alerta.onConfirm === 'function') {
            this.alerta.onConfirm();
        }
        const modalElement = document.getElementById('modalAlertaGeneral');
        if (modalElement && typeof bootstrap !== 'undefined') {
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) modalInstance.hide();
        }
    },

    cerrarAlertaUnica() {
        const modalElement = document.getElementById('modalAlertaGeneral');
        if (modalElement && typeof bootstrap !== 'undefined') {
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.hide();
            }
        }
    },

    
}));

window.Alpine = Alpine;
Alpine.start();