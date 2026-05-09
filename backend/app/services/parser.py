import fitz


def extract_text_from_pdf(pdf_bytes):
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    full_text = ""

    for page in doc:
        full_text += page.get_text()

    return full_text