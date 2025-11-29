
function formatCurrency(value) {
  const number = parseFloat(value);
  
  if (isNaN(number) || number === 0) {
    return '$0.00';
  }

  return number.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN' 
  });
}









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
    { key: 'uso_cfdi', titulo: 'Uso CFDI' },
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
    row.style.cursor = 'pointer';
    row.dataset.href = `/emitidos-panel/conceptos/${item.uuid}/`;
    row.dataset.uuid = item.uuid;

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
      
        //? --- RECEPTOR ---
        case 'receptor':
          cell.innerHTML = `
            <strong class="d-block">${item.receptor || 'N/A'}</strong>
            <small class="text-muted d-block">${item.rfc_receptor || 'N/A'}</small>
            <small class="text-muted d-block">${item.uso_cfdi || 'N/A'}</small>
          `;
          break;
      

        //? USO CFDI
        case 'uso_cfdi':
          cell.innerHTML =`
          <strong class="text-muted d-block">${item.uso_cfdi || 'N/A'}</strong>
          
          `;
          break;
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
            tipoNormalizado = 'Ingresos';
          } else if (tipoOriginal === 'e' || tipoOriginal === 'egre' || tipoOriginal === 'egreso') {
            tipoNormalizado = 'Gastos';
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

          //console.log(formaPagoOriginal);
          //console.log(formaPagoTexto);

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

export function buildDynamicTableGastos(data, theadId, tbodyId) {

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
    
    { key: 'uso_cfdi', titulo: 'Uso CFDI' },
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
    row.style.cursor = 'pointer';
    row.dataset.href = `/recibidos-panel/conceptos/${item.uuid}/`;
    row.dataset.uuid = item.uuid;

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

        
        //? --- RECEPTOR ---
        case 'receptor':
          cell.innerHTML = `
            <strong class="d-block">${item.receptor || 'N/A'}</strong>
            <small class="text-muted d-block">${item.rfc_receptor || 'N/A'}</small>
            <small class="text-muted d-block">${item.uso_cfdi || 'N/A'}</small>
          `;
          break;
        

        //? USO CFDI
        case 'uso_cfdi':
          cell.innerHTML =`
          <strong class="text-muted d-block">${item.uso_cfdi || 'N/A'}</strong>
          
          `;
          break;
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
            tipoNormalizado = 'Ingresos';
          } else if (tipoOriginal === 'e' || tipoOriginal === 'egre' || tipoOriginal === 'egreso') {
            tipoNormalizado = 'Gastos';
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

          //console.log(formaPagoOriginal);
          //console.log(formaPagoTexto);

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



//* Tablas dinamicas del modal (ventana emergente) de conceptos *//
export function buildConceptosTable(data, theadId, tbodyId) {
  const thead = document.getElementById(theadId);
  const tbody = document.getElementById(tbodyId);

  if (!thead || !tbody) {
    console.error("Error: No se encontraron <thead> o <tbody> para el modal.");
    return;
  }

  // 1. Limpiar
  thead.innerHTML = '';
  tbody.innerHTML = '';

  // 2. Manejar si no hay datos
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr class="text-center p-3"><td colspan="12">Este CFDI no tiene conceptos.</td></tr>';
    return;
  }

  // 3. Definimos TODAS las columnas que queremos, en orden
  const columnas = [
    { key: 'descripcion', titulo: 'Descripción', type: 'text' },
    { key: 'clave_prod_serv', titulo: 'Clave SAT', type: 'text' },
    { key: 'clave_unidad', titulo: 'Clave Unidad', type: 'text' },
    { key: 'cantidad', titulo: 'Cantidad', type: 'number' },
    { key: 'valor_unitario', titulo: 'Valor Unitario', type: 'currency' },
    { key: 'descuento', titulo: 'Descuento', type: 'currency' },
    { key: 'tasa_cuota', titulo: 'Tasa', type: 'percent' },
    { key: 'importe', titulo: 'Importe', type: 'currency' },
  ];
  
  // 4. Construir Head
  const headerRow = document.createElement('tr');
  const thNum = document.createElement('th');
  thNum.scope = 'col';
  thNum.className = 'py-3 px-3';
  thNum.textContent = '#';
  headerRow.appendChild(thNum);


  columnas.forEach(col => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.className = 'py-3 px-3';
    th.textContent = col.titulo;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  // 5. Construir Body (con toda la lógica de formato)
  data.forEach((item,index) => {
    const row = document.createElement('tr');
    
    const cellNum = document.createElement('td');
    cellNum.className = 'px-3';
    cellNum.textContent = index + 1; 
    row.appendChild(cellNum);

    columnas.forEach(col => {
      const cell = document.createElement('td');
      cell.className = 'px-3';
      
      let valor = item[col.key]; 

  
      if (col.key === 'importe') {
          const importeNumerico = parseFloat(valor);
          if (isNaN(importeNumerico) || valor === null) {
              valor = item.valor_unitario; 
          }
      }
      
      let valorFormateado;
      
      // Aplicamos el formato según el TIPO
      switch (col.type) {
        
        case 'currency':
          if ((col.key === 'importe_imp' || col.key === 'descuento') && (parseFloat(valor) === 0 || isNaN(parseFloat(valor)))) {
              valorFormateado = 'N/A';
          } else {
              valorFormateado = formatCurrency(valor); // Llama a la función de arriba
          }
          break;
          
        case 'text':
          if (col.key === 'impuesto') {
              const valorNum = parseFloat(valor);
              if (valorNum === 2) valorFormateado = 'IVA (002)';
              else if (valorNum === 1) valorFormateado = 'ISR (001)';
              else valorFormateado = 'Exento / N/A';
          } else {
              valorFormateado = valor || 'no definido';
          }
          break;
          
        case 'percent':
          const tasaNum = parseFloat(valor);
          if (isNaN(tasaNum) || tasaNum === 0) {
              valorFormateado = '0%';
          } else {
              valorFormateado = `${(tasaNum * 100).toFixed(2)}%`;
          }
          break;
          
        case 'number':
          valorFormateado = valor || 0;
          break;
          
        default:
          valorFormateado = valor || 'no definido';
      }
      
      cell.textContent = valorFormateado;
      row.appendChild(cell);
    });
    
    tbody.appendChild(row);
  });
}