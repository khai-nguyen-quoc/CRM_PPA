document.addEventListener('DOMContentLoaded', () => {
    const productTable = document.getElementById('productTable').getElementsByTagName('tbody')[0];
    const addRowBtn = document.getElementById('addRow');
    const taxRateInput = document.getElementById('taxRate');

    // Function to calculate total for a product row
    function calculateProductTotal(row) {
        const quantity = parseFloat(row.querySelector('input[name="quantity"]').value);
        const unitPrice = parseFloat(row.querySelector('input[name="unitPrice"]').value);
        const totalProductInput = row.querySelector('input[name="totalProduct"]');
        
        if (!isNaN(quantity) && !isNaN(unitPrice)) {
            totalProductInput.value = (quantity * unitPrice).toFixed(2);
        } else {
            totalProductInput.value = '0.00';
        }
        calculateSummary();
    }

    // Function to calculate invoice summary (subtotal, tax, grand total)
    function calculateSummary() {
        let subtotal = 0;
        productTable.querySelectorAll('tr').forEach(row => {
            const totalProduct = parseFloat(row.querySelector('input[name="totalProduct"]').value);
            if (!isNaN(totalProduct)) {
                subtotal += totalProduct;
            }
        });
        document.getElementById('subtotal').value = subtotal.toFixed(2);

        const taxRate = parseFloat(taxRateInput.value);
        const taxAmount = isNaN(taxRate) ? 0 : (subtotal * (taxRate / 100));
        const grandTotal = subtotal + taxAmount;

        document.getElementById('grandTotal').value = grandTotal.toFixed(2);
    }

    // Add new product row
    addRowBtn.addEventListener('click', () => {
        const newRow = productTable.insertRow();
        newRow.innerHTML = `
            <td><input type="text" name="productName" required></td>
            <td><input type="number" name="quantity" min="1" value="1" required></td>
            <td><input type="number" name="unitPrice" min="0" value="0" step="0.01" required></td>
            <td><input type="text" name="totalProduct" readonly></td>
            <td><button type="button" class="remove-row">Xóa</button></td>
        `;
        const newQuantityInput = newRow.querySelector('input[name="quantity"]');
        const newUnitPriceInput = newRow.querySelector('input[name="unitPrice"]');
        
        newQuantityInput.addEventListener('input', () => calculateProductTotal(newRow));
        newUnitPriceInput.addEventListener('input', () => calculateProductTotal(newRow));
        newRow.querySelector('.remove-row').addEventListener('click', (event) => {
            event.target.closest('tr').remove();
            calculateSummary();
        });
        calculateSummary();
    });

    // Event listeners for existing rows (on page load)
    productTable.querySelectorAll('tr').forEach(row => {
        row.querySelector('input[name="quantity"]').addEventListener('input', () => calculateProductTotal(row));
        row.querySelector('input[name="unitPrice"]').addEventListener('input', () => calculateProductTotal(row));
        row.querySelector('.remove-row').addEventListener('click', (event) => {
            event.target.closest('tr').remove();
            calculateSummary();
        });
    });

    // Event listener for tax rate changes
    taxRateInput.addEventListener('input', calculateSummary);

    // Initial calculation
    calculateSummary();

    // Handle form submission (Save Data - frontend part for now)
    document.getElementById('invoiceForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        const data = {};
        
        // Capture all simple form fields
        formData.forEach((value, key) => {
            // Exclude product-related fields from initial direct capture
            if (!key.startsWith('productName') && !key.startsWith('quantity') && !key.startsWith('unitPrice')) {
                data[key] = value;
            }
        });

        // Special handling for product rows to group them into an array of objects
        const productRows = [];
        const tableRows = productTable.querySelectorAll('tr');
        tableRows.forEach(row => {
            const productNameInput = row.querySelector('input[name="productName"]');
            const quantityInput = row.querySelector('input[name="quantity"]');
            const unitPriceInput = row.querySelector('input[name="unitPrice"]');
            const totalProductInput = row.querySelector('input[name="totalProduct"]');

            if (productNameInput && quantityInput && unitPriceInput && totalProductInput) {
                productRows.push({
                    productName: productNameInput.value,
                    quantity: parseFloat(quantityInput.value),
                    unitPrice: parseFloat(unitPriceInput.value),
                    totalProduct: parseFloat(totalProductInput.value)
                });
            }
        });
        data['products'] = productRows;
        
        // Add summary totals
        data['subtotal'] = parseFloat(document.getElementById('subtotal').value);
        data['taxRate'] = parseFloat(document.getElementById('taxRate').value);
        data['grandTotal'] = parseFloat(document.getElementById('grandTotal').value);

        console.log('Invoice Data to send:', data);

        try {
            const response = await fetch('/save_invoice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (response.ok) {
                alert(result.message);
            } else {
                alert('Lỗi khi lưu hóa đơn: ' + result.error);
            }
        } catch (error) {
            console.error('Error saving invoice:', error);
            alert('Có lỗi xảy ra khi gửi dữ liệu.');
        }
    });

    // Handle export PDF button (frontend part for now)
    document.getElementById('exportPdf').addEventListener('click', async () => {
        const invoiceNumber = document.getElementById('invoiceNumber').value;
        if (!invoiceNumber) {
            alert('Vui lòng nhập số hóa đơn trước khi xuất PDF.');
            return;
        }

        try {
            const response = await fetch(`/export_pdf/${invoiceNumber}`, {
                method: 'GET'
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `invoice_${invoiceNumber}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                alert('Đã tạo và tải xuống PDF thành công!');
            } else {
                const errorResult = await response.json();
                alert('Lỗi khi xuất PDF: ' + errorResult.error);
            }
        } catch (error) {
            console.error('Error exporting PDF:', error);
            alert('Có lỗi xảy ra khi xuất PDF.');
        }
    });
});

