import fitz


def extract_text_from_pdf(pdf_bytes):
    pages = extract_pages_from_pdf(pdf_bytes)

    return "\n".join(page["text"] for page in pages)


def extract_pages_from_pdf(pdf_bytes):
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    pages = []

    for index, page in enumerate(doc):
        pages.append({
            "page": index + 1,
            "text": page.get_text()
        })

    return pages
