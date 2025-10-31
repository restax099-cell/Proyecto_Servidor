
export function buildDynamicTable(data, theadId, tbodyId) {
  
  const thead = document.getElementById(theadId);
  const tbody = document.getElementById(tbodyId);

  if (!thead || !tbody) {
    console.error("Error: No se encontró <thead> o <tbody>.");
    return;
  }

  thead.innerHTML = '';
  tbody.innerHTML = '';

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr class="text-center p-3"><td colspan="100%">No se encontraron resultados.</td></tr>';
    return;
  }

  const columnas = [
    {key: 'id', titulo: 'ID'},
    { key: 'fecha', titulo: 'Fecha'},
    { key: 'emisor', titulo: 'Emisor' },
    { key: 'receptor', titulo: 'Receptor' },
    { key: 'importe', titulo: 'Importe' },
    { key: 'total', titulo: 'Totales' },
    { key: 'detalle_pago', titulo: 'Detalle Pago'},
    
  ];

  const headerRow = document.createElement('tr');
  columnas.forEach(col => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.className = 'py-3 px-3'; 
    th.textContent = col.titulo; 
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  data.forEach(item => {
    const row = document.createElement('tr');
    
    columnas.forEach(col => {
      const cell = document.createElement('td');
      cell.className = 'px-3';
  
      switch (col.key) {
        //? --- ID ---
        case 'id':
          cell.innerHTML = `
            <strong class="d-block">${item.id || 'N/A'}</strong>
            <small class="text-muted">${item.uuid || 'N/A'}</small>
          `;
          break;
        //? --- FECHA --
        case 'fecha': { // Usamos {} para crear un nuevo alcance
        let fechaFormateada = 'N/A';
        
        if (item.fecha) {
            const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            
            const fecha = new Date(item.fecha);
            
            const dia = fecha.getDate(); 
            const mesIndex = fecha.getMonth(); 
            const anio = fecha.getFullYear();

            fechaFormateada = `${dia}/${meses[mesIndex]}/${anio}`;
            //console.log(fechaFormateada);
        }

        cell.innerHTML = `
            <strong class="d-block text-nowrap">${fechaFormateada}</strong>
            
          `;
        break;
      }
        //? --- EMISOR ---
        case 'emisor':
          cell.innerHTML = `
            <strong class="d-block">${item.emisor || 'N/A'}</strong>
            <small class="text-muted">${item.rfc_emisor || 'N/A'}</small>
          `;
          break;
        /*  
        //? --- RECEPTOR ---
        case 'receptor':
          cell.innerHTML = `
            <strong class="d-block">${item.receptor || 'N/A'}</strong>
            <small class="text-muted d-block">${item.rfc_receptor || 'N/A'}</small>
            <small class="text-muted d-block">${item.uso_cfdi || 'N/A'}</small>
          `;
          break;
        */
        //? --- IMPORTE ---
        case 'importe':
          const importeFormateado = item.importe !== null 
              ? `$${parseFloat(item.importe).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}` 
              : 'N/A';
         
          cell.innerHTML = `
            <strong class="d-block">${importeFormateado || 'N/A'}</strong>
            <small class="text-muted">${item.moneda || 'N/A'}</small>
          `;
          break;

        //? --- TOTAL ---
        case 'total':
          const totalFormateado = item.total !== null 
              ? `$${parseFloat(item.total).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}` 
              : 'N/A';
          const subTotalFormateado = item.sub_total !== null 
              ? `$${parseFloat(item.sub_total).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}` 
              : 'N/A';
         
          cell.innerHTML = `
            <strong class="d-block">${totalFormateado || 'N/A'}</strong>
            <small class="text-muted">${subTotalFormateado || 'N/A'}</small>
          `;
          break;

        //? --- DETALLES ---
        case 'detalle_pago': { 
          let tipoNormalizado = 'N/A'; 
          const tipoOriginal = (item.tipo_comprobante || '').toLowerCase(); 

          if (tipoOriginal === 'i' || tipoOriginal === 'ingre' || tipoOriginal === 'ingreso') {
            tipoNormalizado = 'Ingreso';
          } else if (tipoOriginal === 'e' || tipoOriginal === 'egre' || tipoOriginal === 'egreso') {
            tipoNormalizado = 'Egreso';
          } else if (tipoOriginal) {
            tipoNormalizado = item.tipo_comprobante; 
          }
         
          let metodoNormalizado = 'No ID'; 
          const metodoOriginal = (item.metodo_pago || '').toLowerCase();
          if (metodoOriginal === 'pue') {
            metodoNormalizado = 'PUE';
          }else if (metodoOriginal === 'ppd') {
            metodoNormalizado = 'PPD';
          }else if (metodoOriginal === 'no id' || !item.metodo_pago) {
            metodoNormalizado = 'No Identificado';
          }
          
          let formaPagoTexto = 'N/A'; 
          const formaPagoOriginal = (item.forma_pago || '').toString().toLowerCase().trim();

          if (formaPagoOriginal === '3') {
              formaPagoTexto = 'Transferencia';
          } else if (formaPagoOriginal === '99') {
              formaPagoTexto = 'Por Definir';
          } else if (formaPagoOriginal === 'pago en una sola exhibicion') {
              formaPagoTexto = 'N/A (Dato PUE)';
          } else if (formaPagoOriginal === '01' || formaPagoOriginal === '1') {
              formaPagoTexto = 'Efectivo';
          } else if (!formaPagoOriginal || formaPagoOriginal === 'no id') {
              formaPagoTexto = 'No Identificado';
          } else if (item.forma_pago) { 
              formaPagoTexto = item.forma_pago; 
          }

          console.log(formaPagoOriginal);
          console.log(formaPagoTexto);

          cell.innerHTML = `
            <strong class="d-block">${tipoNormalizado}</strong>
            <small class="text-muted d-block">${metodoNormalizado}</small>
            <small class="text-muted d-block">${formaPagoTexto}</small>
          `;
          break;
        }
      


        /* ? --- Status ---
        case 'status':
          const statusText = item.status || 'Active'; 
          let statusClass = 'bg-success';
          if (statusText === 'Inactive') statusClass = 'bg-danger';
          if (statusText === 'Pending') statusClass = 'bg-warning';
          
          cell.innerHTML = `
            <span class="badge rounded-pill ${statusClass} fw-semibold">
                ${statusText}
            </span>
          `;
          break;
        */
       //? DEFAULT
        default:
          cell.textContent = item[col.key] || 'N/A';
      }
      
      row.appendChild(cell);
    });
    
    tbody.appendChild(row);
  });
}