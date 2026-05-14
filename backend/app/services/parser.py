import fitz
import pytesseract
from PIL import Image
import io

# Windows path — change if Tesseract installed elsewhere
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


def extract_text_from_pdf(pdf_bytes):
    pages = extract_pages_from_pdf(pdf_bytes)
    return "\n".join(page["text"] for page in pages)


def extract_pages_from_pdf(pdf_bytes):
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    pages = []

    for index, page in enumerate(doc):
        text = page.get_text()

        # if page is empty/scanned → use OCR
        if len(text.strip()) < 30:
            text = _ocr_page(page)

        pages.append({
            "page": index + 1,
            "text": text
        })

    doc.close()
    return pages


def _ocr_page(page) -> str:
    try:
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        return pytesseract.image_to_string(img, lang="eng")
    except Exception as e:
        print(f"OCR failed on page: {e}")
        return ""