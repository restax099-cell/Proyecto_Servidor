let codeReaderControls = null;

window.iniciarEscaner = async function(onSuccessCallback) {
    const overlay = document.createElement('div');
    overlay.id = 'barcode-scanner-overlay';
    Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.9)', zIndex: '9999',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
    });

    const videoWrapper = document.createElement('div');
    Object.assign(videoWrapper.style, {
        position: 'relative', width: '100%', maxWidth: '400px', 
        borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000'
    });

    const videoPreview = document.createElement('video');
    videoPreview.id = 'video-preview';
    Object.assign(videoPreview.style, {
        width: '100%', display: 'block'
    });

    const guideBox = document.createElement('div');
    Object.assign(guideBox.style, {
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '85%', height: '120px',
        border: '3px solid #00ff00',
        boxShadow: '0 0 0 4000px rgba(0,0,0,0.65)', 
        borderRadius: '10px',
        pointerEvents: 'none', 
        boxSizing: 'border-box'
    });

    const laserLine = document.createElement('div');
    Object.assign(laserLine.style, {
        position: 'absolute', top: '50%', left: '0',
        width: '100%', height: '2px', backgroundColor: 'red',
        boxShadow: '0 0 6px red', transform: 'translateY(-50%)'
    });
    guideBox.appendChild(laserLine);

    videoWrapper.appendChild(videoPreview);
    videoWrapper.appendChild(guideBox);

    const btnCancelar = document.createElement('button');
    btnCancelar.innerText = 'Cancelar Escáner';
    btnCancelar.className = 'btn btn-danger mt-4'; 
    btnCancelar.onclick = window.cerrarEscaner; 

    overlay.appendChild(videoWrapper);
    overlay.appendChild(btnCancelar);
    document.body.appendChild(overlay);

    try {
        const codeReader = new ZXingBrowser.BrowserMultiFormatReader();
        
        const videoConstraints = {
            video: { facingMode: 'environment' }
        };

        codeReaderControls = await codeReader.decodeFromConstraints(
            videoConstraints, 
            videoPreview, 
            (result, error) => {
                if (result) {
                    window.cerrarEscaner();
                    onSuccessCallback(result.getText());
                }
            }
        );
    } catch (err) {
        console.error("Error iniciando ZXing:", err);
        alert("No se pudo iniciar la cámara.");
        window.cerrarEscaner();
    }
};

window.cerrarEscaner = function() {
    if (codeReaderControls) {
        codeReaderControls.stop();
        codeReaderControls = null;
    }
    const overlay = document.getElementById('barcode-scanner-overlay');
    if (overlay) overlay.remove();
};