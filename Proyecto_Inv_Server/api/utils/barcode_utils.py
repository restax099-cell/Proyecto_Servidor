import cv2
import numpy as np
import zxingcpp


def decode_barcodes(image_bytes, ignore_qr=True):
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return []

    results = zxingcpp.read_barcodes(img)

    if ignore_qr:
        results = [r for r in results if r.format != zxingcpp.BarcodeFormat.QR_CODE]

    return [
        {
            "text": r.text,
            "format": str(r.format),
        }
        
        for r in results
    ]
