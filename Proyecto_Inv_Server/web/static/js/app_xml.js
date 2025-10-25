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