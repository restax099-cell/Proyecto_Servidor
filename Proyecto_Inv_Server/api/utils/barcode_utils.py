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
        results = [r for r in results if r.format != zxingcpp.BarcodeFormat.QRCode]

    return results[0].text