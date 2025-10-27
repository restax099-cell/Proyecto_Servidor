import { fetchData } from '../../utils/get_api.js';
import { buildDynamicTable } from './dynamic_tables.js';

// 1. Constantes
const URL_CONSULTA = 'http://3.139.90.118/api/cfdi-consultas/?limit=5&offset=0';

// IDs del HTML
const ID_THEAD = 'thead-panel';
const ID_TBODY = 'tbody-panel';

(async () => {
  console.log('Iniciando carga de tabla...');
  const data = await fetchData(URL_CONSULTA);

  if (data) {
    console.log('Datos recibidos, construyendo tabla...');
    
    // Llamamos a la nueva función con los IDs
    buildDynamicTable(data,ID_THEAD, ID_TBODY);

  } else {
    console.error('No se pudieron cargar los datos para la tabla.');
  }

})();













document.addEventListener('DOMContentLoaded', function() {
    const radiosFecha = document.querySelectorAll('input[name="filtroFechaTipo"]');
    const fieldsetFecha = document.getElementById('camposFechaPersonalizada');

    if (fieldsetFecha) {
        radiosFecha.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.value === 'personalizado') {
                    fieldsetFecha.disabled = false;
                } else {
                    fieldsetFecha.disabled = true;

                }
            });
        });
    }


    const radiosImporte = document.querySelectorAll('input[name="filtroImporteTipo"]');
    const fieldsetImporte = document.getElementById('camposImportePersonalizado');

    if (fieldsetImporte) {
        radiosImporte.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.value === 'personalizado') {
                    fieldsetImporte.disabled = false;
                } else {
                    fieldsetImporte.disabled = true;

                }
            });
        });
    }


    const formFiltros = document.getElementById('formFiltros');
    if (formFiltros) {
        formFiltros.addEventListener('reset', function() {

            if (fieldsetFecha) fieldsetFecha.disabled = true;
            if (fieldsetImporte) fieldsetImporte.disabled = true;

        });
    }

});