import cv2
import numpy as np
import zxingcpp


def decode_barcodes(image_bytes):
   
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return []

    results = zxingcpp.read_barcodes(img)

    results = [r for r in results if r.format != zxingcpp.BarcodeFormat.QR_CODE]

    return results
