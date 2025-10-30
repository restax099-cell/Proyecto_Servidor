
const formFiltros = document.getElementById('formFiltros');
const radiosFecha = document.querySelectorAll('input[name="filtroFechaTipo"]');
const fieldsetFecha = document.getElementById('camposFechaPersonalizada');
const radiosImporte = document.querySelectorAll('input[name="filtroImporteTipo"]');
const fieldsetImporte = document.getElementById('camposImportePersonalizado');
const fechaInicioInput = document.getElementById('fechaInicio');
const fechaFinInput = document.getElementById('fechaFin');
const importeMinInput = document.getElementById('importeMinimo');
const importeMaxInput = document.getElementById('importeMaximo');


function formatDate(date) {
    return date.toISOString().split('T')[0];
}


function procesarFormularioDeFiltros() {
    const filtros = {};
    const formData = new FormData(formFiltros);

    const tipoFecha = formData.get('filtroFechaTipo');
    const hoy = new Date();
    let fechaDesde = new Date();

    switch (tipoFecha) {
        case 'semana':
            fechaDesde.setDate(hoy.getDate() - 7);
            filtros.fecha_desde = formatDate(fechaDesde);
            filtros.fecha_hasta = formatDate(hoy);
            break;
        case 'mes':
            fechaDesde.setMonth(hoy.getMonth() - 1);
            filtros.fecha_desde = formatDate(fechaDesde);
            filtros.fecha_hasta = formatDate(hoy);
            break;
        case 'anio':
            fechaDesde.setFullYear(hoy.getFullYear() - 1);
            filtros.fecha_desde = formatDate(fechaDesde);
            filtros.fecha_hasta = formatDate(hoy);
            break;
        case 'personalizado':
            if (fechaInicioInput.value) filtros.fecha_desde = fechaInicioInput.value;
            if (fechaFinInput.value) filtros.fecha_hasta = fechaFinInput.value;
            break;
    }

    const tipoImporte = formData.get('filtroImporteTipo');
    switch (tipoImporte) {
        case 'rango1':
            filtros.importe_min = '0';
            filtros.importe_max = '1000';
            break;
        case 'rango2':
            filtros.importe_min = '1001';
            filtros.importe_max = '5000';
            break;
        case 'rango3':
            filtros.importe_min = '5001';
            filtros.importe_max = '10000';
            break;
        case 'personalizado':
            if (importeMinInput.value) filtros.importe_min = importeMinInput.value;
            if (importeMaxInput.value) filtros.importe_max = importeMaxInput.value;
            break;
    }



    return filtros;
}


export function inicializarFiltros(onFiltrosAplicados) {
    if (!formFiltros) {
        console.warn('No se encontró el formulario de filtros.');
        return;
    }

    if (fieldsetFecha) {
        radiosFecha.forEach(radio => {
            radio.addEventListener('change', function() {
                fieldsetFecha.disabled = (this.value !== 'personalizado');
            });
        });
    }
    if (fieldsetImporte) {
        radiosImporte.forEach(radio => {
            radio.addEventListener('change', function() {
                fieldsetImporte.disabled = (this.value !== 'personalizado');
            });
        });
    }

    formFiltros.addEventListener('submit', function(event) {
        event.preventDefault(); 
        
        console.log('Aplicando filtros...');
        const filtrosCalculados = procesarFormularioDeFiltros();

        if (onFiltrosAplicados) {
            onFiltrosAplicados(filtrosCalculados); 
        }

    });

    formFiltros.addEventListener('reset', function() {
        console.log('Borrando filtros...');
        if (fieldsetFecha) fieldsetFecha.disabled = true;
        if (fieldsetImporte) fieldsetImporte.disabled = true;
        
        if (onFiltrosAplicados) {
            onFiltrosAplicados({}); 
        }
    });
}