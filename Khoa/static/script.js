document.addEventListener('DOMContentLoaded', () => {
    const productTable = document.getElementById('productTable').getElementsByTagName('tbody')[0];
    const addProductBtn = document.getElementById('addProductButton'); // New button to add single product
    const productNameInput = document.getElementById('newProductNameInput');
    const quantityInput = document.getElementById('newQuantityInput');
    const unitPriceInput = document.getElementById('newUnitPriceInput');
    const taxRateInput = document.getElementById('taxRateInput'); // Updated ID

    // Function to reset the entire form
    function resetForm() {
        // Clear Invoice Details
        document.getElementById('invoiceNumberInput').value = '';
        document.getElementById('invoiceDateInput').value = '';
        document.getElementById('dueDateInput').value = '';

        // Clear Customer Details
        document.getElementById('customerNameInput').value = '';
        document.getElementById('customerAddressInput').value = '';
        document.getElementById('customerPhoneInput').value = '';
        document.getElementById('customerEmailInput').value = '';

        // Clear New Product Input Fields
        productNameInput.value = '';
        quantityInput.value = '';
        unitPriceInput.value = '';

        // Clear Product Table
        while (productTable.firstChild) {
            productTable.removeChild(productTable.firstChild);
        }

        // Reset Summary
        taxRateInput.value = '8'; // Reset to default 8%
        calculateSummary(); // Recalculate summary which will set subtotal and grandTotal to 0.00
    }

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
        document.getElementById('subtotalInput').value = subtotal.toFixed(2); // Updated ID

        const taxRate = parseFloat(taxRateInput.value);
        const taxAmount = isNaN(taxRate) ? 0 : (subtotal * (taxRate / 100));
        const grandTotal = subtotal + taxAmount;

        document.getElementById('grandTotalInput').value = grandTotal.toFixed(2); // Updated ID
    }

    // Function to add a product to the table from the input fields
    function addProductToTable() {
        const productName = productNameInput.value.trim();
        const quantity = parseFloat(quantityInput.value);
        const unitPrice = parseFloat(unitPriceInput.value);

        if (!productName || isNaN(quantity) || quantity <= 0 || isNaN(unitPrice) || unitPrice < 0) {
            alert('Vui lòng nhập đầy đủ và chính xác thông tin sản phẩm (Tên sản phẩm, Số lượng, Đơn giá).');
            return;
        }

        const newRow = productTable.insertRow();
        const totalProduct = (quantity * unitPrice).toFixed(2);
        newRow.innerHTML = `
            <td><input type="text" name="productName" value="${productName}" required readonly class="product-name-display"></td>
            <td><input type="number" name="quantity" value="${quantity}" min="1" required readonly class="quantity-display"></td>
            <td><input type="number" name="unitPrice" value="${unitPrice}" min="0" step="0.01" required readonly class="unit-price-display"></td>
            <td><input type="text" name="totalProduct" value="${totalProduct}" readonly class="total-product-display"></td>
            <td><button type="button" class="remove-row">Xóa</button></td>
        `;

        // Clear input fields after adding
        productNameInput.value = '';
        quantityInput.value = '';
        unitPriceInput.value = '';

        // Add event listener for remove button
        newRow.querySelector('.remove-row').addEventListener('click', (event) => {
            event.target.closest('tr').remove();
            calculateSummary();
        });

        calculateSummary();
    }

    // Add new product row via the dedicated input fields
    addProductBtn.addEventListener('click', addProductToTable);

    // Remove the old addRowBtn listener since we have new logic
    // addRowBtn.addEventListener('click', () => {
    //     const newRow = productTable.insertRow();
    //     newRow.innerHTML = `
    //         <td><input type="text" name="productName" required></td>
    //         <td><input type="number" name="quantity" min="1" placeholder="" required></td>
    //         <td><input type="number" name="unitPrice" min="0" step="0.01" placeholder="" required></td>
    //         <td><input type="text" name="totalProduct" readonly placeholder=""></td>
    //         <td><button type="button" class="remove-row">Xóa</button></td>
    //     `;
    //     const newQuantityInput = newRow.querySelector('input[name="quantity"]');
    //     const newUnitPriceInput = newRow.querySelector('input[name="unitPrice"]');
    //     
    //     newQuantityInput.addEventListener('input', () => calculateProductTotal(newRow));
    //     newUnitPriceInput.addEventListener('input', () => calculateProductTotal(newRow));
    //     newRow.querySelector('.remove-row').addEventListener('click', (event) => {
    //         event.target.closest('tr').remove();
    //         calculateSummary();
    //     });
    //     calculateSummary();
    // });

    // Comment out or remove event listeners for existing rows because products are now added via `addProductToTable`
    productTable.querySelectorAll('tr').forEach(row => {
        // row.querySelector('input[name="quantity"]').addEventListener('input', () => calculateProductTotal(row));
        // row.querySelector('input[name="unitPrice"]').addEventListener('input', () => calculateProductTotal(row));
        row.querySelector('.remove-row').addEventListener('click', (event) => {
            event.target.closest('tr').remove();
            calculateSummary();
        });
    });

    // Event listener for tax rate changes
    taxRateInput.addEventListener('input', calculateSummary);

    // Initial calculation (only if there are pre-existing rows from server-side rendering)
    calculateSummary();

    // Handle form submission (Save Data - frontend part for now)
    document.getElementById('invoiceForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        const data = {};
        
        // Capture all simple form fields
        data['invoiceNumber'] = document.getElementById('invoiceNumberInput').value;
        data['invoiceDate'] = document.getElementById('invoiceDateInput').value;
        data['dueDate'] = document.getElementById('dueDateInput').value;
        data['customerName'] = document.getElementById('customerNameInput').value;
        data['customerAddress'] = document.getElementById('customerAddressInput').value;
        data['customerPhone'] = document.getElementById('customerPhoneInput').value;
        data['customerEmail'] = document.getElementById('customerEmailInput').value;

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
        data['subtotal'] = parseFloat(document.getElementById('subtotalInput').value);
        data['taxRate'] = parseFloat(document.getElementById('taxRateInput').value);
        data['grandTotal'] = parseFloat(document.getElementById('grandTotalInput').value);

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
                resetForm(); // Reset form after successful save
            } else {
                alert('Lỗi khi lưu hóa đơn: ' + result.error);
            }
        } catch (error) {
            console.error('Error saving invoice:', error);
            alert('Có lỗi xảy ra khi gửi dữ liệu.');
        }
    });

    // Handle export PDF button - export directly from current form data (no saving)
    document.getElementById('exportPdfButton').addEventListener('click', async () => {
        const form = document.getElementById('invoiceForm');
        const formData = new FormData(form);
        const data = {};

        // Capture all simple form fields using new IDs
        data['invoiceNumber'] = document.getElementById('invoiceNumberInput').value;
        data['invoiceDate'] = document.getElementById('invoiceDateInput').value;
        data['dueDate'] = document.getElementById('dueDateInput').value;
        data['customerName'] = document.getElementById('customerNameInput').value;
        data['customerAddress'] = document.getElementById('customerAddressInput').value;
        data['customerPhone'] = document.getElementById('customerPhoneInput').value;
        data['customerEmail'] = document.getElementById('customerEmailInput').value;

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
        data['subtotal'] = parseFloat(document.getElementById('subtotalInput').value);
        data['taxRate'] = parseFloat(document.getElementById('taxRateInput').value);
        data['grandTotal'] = parseFloat(document.getElementById('grandTotalInput').value);

        const invoiceNumber = document.getElementById('invoiceNumberInput').value || 'tmp';

        try {
            const response = await fetch('/export_pdf_direct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Export failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `${invoiceNumber}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            alert('Đã tạo và tải xuống PDF thành công!');
        } catch (error) {
            console.error('Error exporting PDF:', error);
            alert('Có lỗi xảy ra khi xuất PDF: ' + error.message);
        }
    });
});
