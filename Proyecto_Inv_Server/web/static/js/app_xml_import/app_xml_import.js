
const fileInput = document.getElementById('zip_input');
const fileNameDisplay = document.getElementById('file-name');
const uploadForm = document.querySelector('form');
const progressWrapper = document.getElementById('progress-wrapper');
const progressBar = document.getElementById('progress-bar');
const percentText = document.getElementById('percent-text');
const statusText = document.getElementById('status-text');
const btnImport = document.getElementById('btn-import'); 

fileInput.addEventListener('change', function() {
    if (this.files.length > 0) {
        fileNameDisplay.innerText = "Archivo listo: " + this.files[0].name;
        fileNameDisplay.classList.replace('text-secondary', 'text-primary');

        btnImport.disabled = false;
        
        btnImport.classList.remove('btn-secondary');
        btnImport.classList.add('btn-success'); 
    } else {
        btnImport.disabled = true;
        btnImport.classList.replace('btn-success', 'btn-primary');
    }
});

uploadForm.addEventListener('submit', function(e) {
    progressBar.style.width = '0%';
    percentText.innerText = '0%';
    statusText.innerText = 'Iniciando conexión...';
    e.preventDefault(); 

    const formData = new FormData(this);
    const xhr = new XMLHttpRequest();

    progressWrapper.style.display = 'block';
    uploadForm.querySelector('button').disabled = true; 

    xhr.upload.addEventListener('progress', function(e) {
        if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            progressBar.style.width = percent + '%';
            percentText.innerText = percent + '%';
            
            if (percent === 100) {
                statusText.innerText = "Procesando XMLs en el servidor...";
                progressBar.classList.add('bg-info');
            }
        }
    });

    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                statusText.innerText = "¡Importación Exitosa!";
                progressBar.classList.replace('bg-info', 'bg-success');
                progressBar.classList.remove('progress-bar-animated');
                setTimeout(() => { location.reload(); }, 3000);
            } else {
                statusText.innerText = "Error en la importación.";
                progressBar.classList.replace('bg-info', 'bg-danger');
                uploadForm.querySelector('button').disabled = false;
            }
        }
    };

    const progressInterval = setInterval(() => {
       fetch(`/api/get_import_progress/?t=${new Date().getTime()}`, {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        })
        .then(response => response.json())
        .then(data => {
            progressBar.style.width = data.progress + '%';
            statusText.innerText = `Insertando: ${data.current} de ${data.total} XMLs...`;
            if (data.progress >= 100) clearInterval(progressInterval);
        });
    }, 1000);

    xhr.open('POST', this.action, true);
    xhr.send(formData);
});

