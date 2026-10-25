import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';


import { 
    fetchPlantillasConteo,
    fetchStores 
} from './api_conteo.js'; 


Alpine.data('conteoApp', () => ({
    busqueda: '',
    plantillaSeleccionada: null,
    plantillasSeleccionadas: [],
    plantillas: [],
    fechaConteo: '',
    isLoading: true,
    filtroEstado: 'todos',

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
            
        let plantillasMapeadas = this.mapearPlantillas(rawData, storesData);

        // 1. Ordenamos: Vigentes primero (del más próximo al más lejano), Vencidos al final
        plantillasMapeadas.sort((a, b) => {
            if (a.estaVencida && !b.estaVencida) return 1;
            if (!a.estaVencida && b.estaVencida) return -1;
            if (a.fechaLimiteObjeto && b.fechaLimiteObjeto) {
                return a.fechaLimiteObjeto - b.fechaLimiteObjeto;
            }
            return 0;
        });

        // 2. Asignar la clase de color basada en el orden y estado
        // Dentro de tu init() o mapeo:
        let encontradoPrimerVigente = false;
        plantillasMapeadas.forEach(item => {
            if (item.estaVencida) {
                item.claseColor = 'text-danger';
                item.estadoFiltro = 'vencidos';
            } else if (!encontradoPrimerVigente) {
                item.claseColor = 'text-warning fw-bold';
                item.estadoFiltro = 'proximos';
                encontradoPrimerVigente = true;
            } else {
                item.claseColor = 'text-dark';
                item.estadoFiltro = 'pendientes';
            }
        });

        this.plantillas = plantillasMapeadas;
        this.isLoading = false;
    },

    mapearPlantillas(datosApi, storesData) {
        return datosApi.map(item => {
            
            // -- Buscar el nombre del almacén por su ID --
            const almacenEncontrado = storesData.find(s => s.id === item.store);
            const nombreAlmacen = almacenEncontrado ? almacenEncontrado.store : `Almacén ID: ${item.store}`;

            // -- A. Formatear la descripción --
            let descripcion = 'Sin catálogos';
            let totalItems = 0;
            
            if (item.catalogos_json && item.catalogos_json.length > 0) {
                const categorias = item.catalogos_json.map(c => this.capitalizar(c.categoria)).join(', ');
                totalItems = item.catalogos_json.reduce((sum, c) => sum + (c.items || 0), 0);
                descripcion = `${categorias} · ${totalItems} items`;
            }

            // -- B. Formatear la frecuencia y días/info adicional --
            let frecuenciaTexto = this.capitalizar(item.frecuencia);
            let diasArray = []; 
            let infoAdicional = '';

            const freqLower = (item.frecuencia || '').toLowerCase();

            if (freqLower.includes('diario') && item.dias_semana) {
                // Para diario conservamos las abreviaturas (L, Ma, Mi, etc.)
                diasArray = item.dias_semana.split(',').map(d => d.trim());
            } else if (freqLower.includes('semanal') && item.dias_semana) {
                // Para semanal convertimos a nombre completo
                const mapaDiasCompletos = { 
                    'L': 'Lunes', 'Ma': 'Martes', 'Mi': 'Miércoles', 
                    'J': 'Jueves', 'V': 'Viernes', 'S': 'Sábado', 'D': 'Domingo' 
                };
                diasArray = item.dias_semana.split(',').map(d => mapaDiasCompletos[d.trim()] || d.trim());
            } else if (freqLower.includes('mensual') && item.dia_mes !== null && item.dia_mes !== undefined) {
                infoAdicional = `Día ${item.dia_mes} del mes`;
            } else if (freqLower.includes('trimestral') && item.dia_mes !== null && item.dia_mes !== undefined) {
                infoAdicional = `Día ${item.dia_mes} (Trimestral)`;
            }

            // -- C. Obtener cálculo de vigencia, alertas y la fecha objeto --
            const { limiteObj, esAlertaRoja, estaVencida, fechaLimiteObjeto } = this.calcularVigenciaCaptura(item);
            const estaBloqueada = estaVencida && (parseInt(item.bloquear_vencer_limite, 10) === 1);
            return {
                id: item.id,
                status: item.status,
                nombre: item.nombre,
                descripcion: descripcion,
                almacen: nombreAlmacen, 
                frecuencia: frecuenciaTexto,
                frecuenciaRaw: item.frecuencia,
                diasFrecuencia: diasArray,
                infoAdicional: infoAdicional,
                limiteCaptura: limiteObj,
                alertaRoja: esAlertaRoja,
                estaVencida: estaVencida,
                bloqueada: estaBloqueada,
                fechaLimiteObjeto: fechaLimiteObjeto, // <--- Aquí se incluye correctamente
                inactiva: item.status === 0
            };
        });
    },

    //* Filtro de Limites de Captura
    calcularVigenciaCaptura(item) {
        if (!item.hora_limite || item.dia_limite === null || item.dia_limite === undefined) {
            return { limiteObj: null, esAlertaRoja: false, estaVencida: false, fechaLimiteObjeto: null };
        }

        const ahora = new Date();
        const offsetDias = parseInt(item.dia_limite, 10) || 0; 

        let fechaBaseConteo = new Date();

        if ((item.frecuencia === 'Semanal' || item.frecuencia === 'semanal') && item.dias_semana) {
            const mapaDias = { 'D': 0, 'L': 1, 'Ma': 2, 'Mi': 3, 'J': 4, 'V': 5, 'S': 6 };
            const diasProgramados = item.dias_semana.split(',').map(d => mapaDias[d.trim()]).filter(d => d !== undefined);
            
            if (diasProgramados.length > 0) {
                const diaHoy = ahora.getDay();
                let diferenciaDias = 0;
                if (!diasProgramados.includes(diaHoy)) {
                    const proximoDia = diasProgramados.find(d => d >= diaHoy) ?? diasProgramados[0];
                    diferenciaDias = (proximoDia - diaHoy + 7) % 7;
                }
                fechaBaseConteo.setDate(ahora.getDate() + diferenciaDias);
            }
        } else if ((item.frecuencia === 'Mensual' || item.frecuencia === 'mensual' || item.frecuencia === 'Trimestral' || item.frecuencia === 'trimestral') && item.dia_mes) {
            fechaBaseConteo.setDate(parseInt(item.dia_mes, 10));
        }

        const fechaLimiteCalculada = new Date(fechaBaseConteo);
        fechaLimiteCalculada.setDate(fechaBaseConteo.getDate() + offsetDias);

        const [horas, minutos] = item.hora_limite.split(':');
        fechaLimiteCalculada.setHours(parseInt(horas, 10), parseInt(minutos, 10), 0, 0);

        const estaVencida = fechaLimiteCalculada < ahora;

        let textoFecha = '';
        const hoyStr = ahora.toDateString();
        const manana = new Date(ahora);
        manana.setDate(ahora.getDate() + 1);

        if (fechaLimiteCalculada.toDateString() === hoyStr) {
            textoFecha = 'Hoy';
        } else if (fechaLimiteCalculada.toDateString() === manana.toDateString()) {
            textoFecha = 'Mañana';
        } else {
            const diaStr = String(fechaLimiteCalculada.getDate()).padStart(2, '0');
            const mesStr = String(fechaLimiteCalculada.getMonth() + 1).padStart(2, '0');
            const anoStr = fechaLimiteCalculada.getFullYear();
            textoFecha = `${diaStr}/${mesStr}/${anoStr}`;
        }

        const horaLimpia = item.hora_limite.substring(0, 5);

        // --- CÁLCULO DEL TIEMPO RESTANTE SEGÚN FRECUENCIA Y PLAZO ---
        let tiempoRestante = '';
        if (!estaVencida) {
            const diffMs = fechaLimiteCalculada - ahora;
            const diffSegundos = Math.floor(diffMs / 1000);
            const diffMinutos = Math.floor(diffSegundos / 60);
            const diffHoras = Math.floor(diffMinutos / 60);
            const diffDias = Math.floor(diffHoras / 24);

            const freqLower = (item.frecuencia || '').toLowerCase();

            // REGLA GENERAL: Si los días son 0 (o menos de 1 día), NUNCA muestres 0 días, muestra horas/minutos
            if (diffDias === 0) {
                if (diffHoras >= 1) {
                    const h = String(diffHoras).padStart(2, '0');
                    const m = String(diffMinutos % 60).padStart(2, '0');
                    tiempoRestante = `${h}:${m} Horas restantes`;
                } else {
                    const m = String(diffMinutos).padStart(2, '0');
                    const s = String(diffSegundos % 60).padStart(2, '0');
                    tiempoRestante = `${m}:${s} min restantes`;
                }
            } else {
                // Si faltan 1 o más días, aplicamos el formato según su frecuencia
                if (freqLower.includes('semanal')) {
                    tiempoRestante = `${diffDias} Día/s restantes`;
                } else if (freqLower.includes('mensual')) {
                    const diffSemanas = Math.max(1, Math.floor(diffDias / 7));
                    tiempoRestante = `${diffSemanas} Semana/s restantes`;
                } else if (freqLower.includes('trimestral')) {
                    const diffMeses = Math.max(1, Math.floor(diffDias / 30));
                    tiempoRestante = `${diffMeses} Mese/s restantes`;
                } else {
                    // Diario u otros
                    tiempoRestante = `${diffDias} día/s restante`;
                }
            }
        }

        const limiteObj = {
            fecha: textoFecha,
            hora: horaLimpia,
            tiempoRestante: tiempoRestante
        };
        
        const esAlertaRoja = item.bloquear_vencer_limite === 1 || estaVencida;

        return {
            limiteObj,
            esAlertaRoja,
            estaVencida,
            fechaLimiteObjeto: fechaLimiteCalculada
        };
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
        if (!this.plantillaSeleccionada) return '';
        //console.log(this.plantillaSeleccionada)
        // Accedemos directamente al objeto de la plantilla seleccionada
        const plan = this.plantillaSeleccionada;
        
        if (plan && !plan.inactiva) {
            return `${plan.almacen} · ${plan.frecuencia}`;
        }
        return '';
    },

    seleccionarPlantilla(plantilla) {
        if (plantilla.bloqueada) {
            return;
        }
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
    },

    calcularTiempoRestante(fechaVigencia, horaLimite) {
        const ahora = new Date();
        // Construimos la fecha/hora límite combinando la vigencia y la hora
        const [horas, minutos] = horaLimite.split(':');
        const limite = new Date(fechaVigencia);
        limite.setHours(parseInt(horas, 10), parseInt(minutos, 10), 0);

        const diferenciaMs = limite - ahora;

        if (diferenciaMs < 0) {
            return "Vencido";
        }

        const segundosTotales = Math.floor(diferenciaMs / 1000);
        const dias = Math.floor(segundosTotales / (3600 * 24));
        const horasRestantes = Math.floor((segundosTotales % (3600 * 24)) / 3600);
        const minutosRestantes = Math.floor((segundosTotales % 3600) / 60);

        // LA REGLA QUE PEDISTE: Si los días son 0, no los muestres y enseña las horas
        if (dias === 0) {
            if (horasRestantes === 0) {
                return `${minutosRestantes} Minutos restantes`;
            }
            return `${horasRestantes}:${minutosRestantes < 10 ? '0' : ''}${minutosRestantes} Horas restantes`;
            // O si prefieres texto limpio tipo "11:02 Horas restantes" como en tu segundo ejemplo:
        }

        return `${dias} Día/s restantes`;
    },

    formatearTiempoRestante(diferenciaMs) {
        if (diferenciaMs <= 0) return "Vencido";

        const segundosTotales = Math.floor(diferenciaMs / 1000);
        const dias = Math.floor(segundosTotales / (3600 * 24));
        const horas = Math.floor((segundosTotales % (3600 * 24)) / 3600);
        const minutos = Math.floor((segundosTotales % 3600) / 60);

        // Si los días son mayores a 0, mostramos los días
        if (dias > 0) {
            return `${dias} Día/s restantes`;
        }
        
        // Si los días son 0, omitimos los días y mostramos estrictamente las horas y minutos restantes
        if (horas > 0) {
            const minutosStr = minutos < 10 ? '0' + minutos : minutos;
            return `${horas}:${minutosStr} Horas restantes`;
        }

        // Si queda menos de una hora
        return `${minutos} Minutos restantes`;
    },

    iniciarConteo() {

        if (!this.plantillaSeleccionada) return;
        window.location.href = `/cont-panel-detalle/${this.plantillaSeleccionada.id}/`;
    }
}));

window.Alpine = Alpine;
Alpine.start();