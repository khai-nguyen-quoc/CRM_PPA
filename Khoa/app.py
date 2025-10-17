from flask import Flask, request, jsonify, render_template, send_file
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os
import json
import datetime

app = Flask(__name__)

DATA_FILE = 'invoices.json'
# Save PDFs to the user's Downloads folder by default
PDF_DIR = os.path.join(os.path.expanduser('~'), 'Downloads')

# Ensure PDF directory exists
if not os.path.exists(PDF_DIR):
    os.makedirs(PDF_DIR)

# Register a Unicode font that supports Vietnamese (use Windows Arial)
try:
    arial_path = os.path.join(os.environ.get('WINDIR', 'C:\\Windows'), 'Fonts', 'arial.ttf')
    arial_bold_path = os.path.join(os.environ.get('WINDIR', 'C:\\Windows'), 'Fonts', 'arialbd.ttf')
    if os.path.exists(arial_path):
        pdfmetrics.registerFont(TTFont('Arial', arial_path))
    if os.path.exists(arial_bold_path):
        pdfmetrics.registerFont(TTFont('Arial-Bold', arial_bold_path))
except Exception:
    # Fall back silently if font registration fails; ReportLab will use default fonts
    pass


def to_float(value, default=0.0):
    try:
        if isinstance(value, str):
            # Normalize common thousand/decimal separators
            value = value.replace(',', '')
        return float(value)
    except Exception:
        return float(default)


def format_number(value, decimals=0):
    number = to_float(value, 0.0)
    # Use built-in format with dynamic precision and thousand separator
    return format(number, f",.{decimals}f")


def regular_font_name():
    return 'Arial' if 'Arial' in pdfmetrics.getRegisteredFontNames() else 'Helvetica'


def bold_font_name():
    return 'Arial-Bold' if 'Arial-Bold' in pdfmetrics.getRegisteredFontNames() else 'Helvetica-Bold'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/save_invoice', methods=['POST'])
def save_invoice():
    invoice_data = request.json
    if not invoice_data:
        return jsonify({'error': 'No data provided'}), 400

    # Load existing invoices or initialize an empty list
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            invoices = json.load(f)
    else:
        invoices = []

    invoices.append(invoice_data)

    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(invoices, f, ensure_ascii=False, indent=4)
    
    return jsonify({'message': 'Invoice saved successfully', 'invoice': invoice_data}), 200

def _generate_pdf_from_invoice(invoice: dict) -> str:
    invoice_number = invoice.get('invoiceNumber', datetime.datetime.now().strftime('%Y%m%d%H%M%S'))
    pdf_filename = os.path.join(PDF_DIR, f'{invoice_number}.pdf')
    c = canvas.Canvas(pdf_filename, pagesize=letter)
    width, height = letter

    # Title
    c.setFont(bold_font_name(), 24)
    c.drawString(50, height - 50, 'HÓA ĐƠN')

    c.setFont(regular_font_name(), 12)
    # Invoice Details
    y_position = height - 100
    c.drawString(50, y_position, f"Số hóa đơn: {invoice.get('invoiceNumber', '')}")
    c.drawString(300, y_position, f"Ngày lập: {invoice.get('invoiceDate', '')}")
    y_position -= 20
    c.drawString(50, y_position, f"Ngày đáo hạn: {invoice.get('dueDate', '')}")

    # Customer Details
    y_position -= 40
    c.setFont(bold_font_name(), 14)
    c.drawString(50, y_position, 'Thông tin khách hàng:')
    c.setFont(regular_font_name(), 12)
    y_position -= 20
    c.drawString(50, y_position, f"Tên khách hàng: {invoice.get('customerName', '')}")
    y_position -= 20
    c.drawString(50, y_position, f"Địa chỉ: {invoice.get('customerAddress', '')}")
    y_position -= 20
    c.drawString(50, y_position, f"Điện thoại: {invoice.get('customerPhone', '')}")
    y_position -= 20
    c.drawString(50, y_position, f"Email: {invoice.get('customerEmail', '')}")

    # Product Details Table Header
    y_position -= 40
    c.setFont(bold_font_name(), 12)
    c.drawString(50, y_position, 'Sản phẩm')
    c.drawString(250, y_position, 'Số lượng')
    c.drawString(350, y_position, 'Đơn giá')
    c.drawString(450, y_position, 'Thành tiền')
    y_position -= 10
    c.line(40, y_position, width - 40, y_position)
    y_position -= 15

    # Product Details Table Rows
    c.setFont(regular_font_name(), 12)
    products = invoice.get('products', [])
    for product in products:
        c.drawString(50, y_position, product.get('productName', ''))
        c.drawString(250, y_position, format_number(product.get('quantity', 0), 0))
        c.drawString(350, y_position, format_number(product.get('unitPrice', 0), 2))
        c.drawString(450, y_position, format_number(product.get('totalProduct', 0), 0))
        y_position -= 20

    # Summary
    y_position -= 30
    c.line(40, y_position, width - 40, y_position)
    y_position -= 20
    c.setFont(bold_font_name(), 12)
    c.drawString(350, y_position, 'Tổng tiền hàng:')
    c.drawString(450, y_position, format_number(invoice.get('subtotal', 0), 0))
    y_position -= 20
    c.drawString(350, y_position, f"Thuế ({invoice.get('taxRate', 0)}%):")
    # Calculate tax amount correctly if subtotal and grandTotal are numbers
    tax_amount = to_float(invoice.get('grandTotal', 0)) - to_float(invoice.get('subtotal', 0))
    c.drawString(450, y_position, format_number(tax_amount, 0))
    y_position -= 20
    c.drawString(350, y_position, 'Tổng thanh toán:')
    c.drawString(450, y_position, format_number(invoice.get('grandTotal', 0), 0))

    c.save()

    return pdf_filename


@app.route('/export_pdf/<invoice_number>', methods=['GET'])
def export_pdf(invoice_number):
    # Load invoices from saved file by invoice number
    if not os.path.exists(DATA_FILE):
        return jsonify({'error': 'No invoices found'}), 404

    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        invoices = json.load(f)

    invoice = next((inv for inv in invoices if inv.get('invoiceNumber') == invoice_number), None)
    if not invoice:
        return jsonify({'error': f'Invoice with number {invoice_number} not found'}), 404

    pdf_path = _generate_pdf_from_invoice(invoice)
    return send_file(pdf_path, as_attachment=True)


@app.route('/export_pdf_direct', methods=['POST'])
def export_pdf_direct():
    invoice = request.json
    if not invoice:
        return jsonify({'error': 'No data provided'}), 400

    pdf_path = _generate_pdf_from_invoice(invoice)
    return send_file(pdf_path, as_attachment=True)


if __name__ == '__main__':
    app.run(debug=True)

