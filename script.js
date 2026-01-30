// Configuration - Auto-detect the base URL based on current location
// Works for both local (with /invoice-system/) and InfinityFree (without subfolder)
const currentPath = window.location.pathname;
const API_BASE_URL = currentPath.includes('/invoice-system/') 
  ? window.location.origin + '/invoice-system'
  : window.location.origin;

// Store original date for cancel functionality
let originalDate = '';
let isDateEditing = false;

// Track if we're editing an existing invoice
let isEditingMode = false;
let currentEditInvoiceNo = null;

// Function to fetch invoice data from the server
async function fetchInvoiceData() {
  const invoiceNoStatus = document.getElementById('invoice-no-status');
  const invoiceDateStatus = document.getElementById('invoice-date-status');
  
  try {
    // Show loading state
    invoiceNoStatus.textContent = 'Loading invoice number...';
    invoiceNoStatus.className = 'loading';
    invoiceDateStatus.textContent = 'Loading date...';
    invoiceDateStatus.className = 'loading';

    const response = await fetch(`${API_BASE_URL}/get_next_invoice.php`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      // Populate the fields
      document.getElementById('invoice-no').value = data.next_invoice_no.toString().padStart(2, '0');
      
      // Set date values
      const dateFromServer = data.today_date; // yyyy-mm-dd format
      setInvoiceDate(dateFromServer);

      // Show success status
      invoiceNoStatus.textContent = "Next invoice number loaded successfully";
      invoiceNoStatus.className = 'success';
      invoiceDateStatus.textContent = "Today's date loaded successfully";
      invoiceDateStatus.className = 'success';

      // Hide status messages after 3 seconds
      setTimeout(() => {
        invoiceNoStatus.style.display = 'none';
        invoiceDateStatus.style.display = 'none';
      }, 3000);

    } else {
      throw new Error(data.error || 'Failed to fetch invoice data');
    }

  } catch (error) {
    console.error('Error fetching invoice data:', error);
    
    // Show error and fallback to default values
    invoiceNoStatus.textContent = 'Error loading invoice number - using fallback';
    invoiceNoStatus.className = 'error';
    invoiceDateStatus.textContent = 'Error loading date - using today';
    invoiceDateStatus.className = 'error';

    // Fallback values
    document.getElementById('invoice-no').value = '01';
    const todayDate = new Date().toISOString().split('T')[0];
    setInvoiceDate(todayDate);

    // Hide error messages after 5 seconds
    setTimeout(() => {
      invoiceNoStatus.style.display = 'none';
      invoiceDateStatus.style.display = 'none';
    }, 5000);
  }
}

// Function to set the invoice date and update display
function setInvoiceDate(dateString) {
  const dateInput = document.getElementById('invoice-date');
  const dateText = document.getElementById('date-text');
  
  dateInput.value = dateString; // yyyy-mm-dd format for input
  
  // Convert to dd-mm-yyyy for display
  const [year, month, day] = dateString.split('-');
  const displayDate = `${day}-${month}-${year}`;
  dateText.textContent = displayDate;
  
  originalDate = dateString;
}

// Function to enable date editing
function enableDateEdit() {
  if (isDateEditing) return;
  
  isDateEditing = true;
  const dateDisplay = document.getElementById('invoice-date-display');
  const dateInput = document.getElementById('invoice-date');
  const dateActions = document.getElementById('date-actions');
  
  dateDisplay.classList.add('hidden');
  dateInput.classList.add('active');
  dateActions.classList.add('active');
  
  // Store current date as original for cancel
  originalDate = dateInput.value;
  
  // Focus on the input
  dateInput.focus();
}

// Function to save date edit
function saveDateEdit() {
  const dateInput = document.getElementById('invoice-date');
  const newDate = dateInput.value;
  
  if (!newDate) {
    alert('Please select a valid date');
    return;
  }
  
  // Update the display with new date
  setInvoiceDate(newDate);
  exitDateEdit();
}

// Function to cancel date edit
function cancelDateEdit() {
  const dateInput = document.getElementById('invoice-date');
  
  // Restore original date
  dateInput.value = originalDate;
  setInvoiceDate(originalDate);
  exitDateEdit();
}

// Function to exit date edit mode
function exitDateEdit() {
  isDateEditing = false;
  const dateDisplay = document.getElementById('invoice-date-display');
  const dateInput = document.getElementById('invoice-date');
  const dateActions = document.getElementById('date-actions');
  
  dateDisplay.classList.remove('hidden');
  dateInput.classList.remove('active');
  dateActions.classList.remove('active');
}

// Handle date input blur
function handleDateBlur() {
  // Small delay to allow button clicks to register
  setTimeout(() => {
    if (isDateEditing && !document.querySelector('.date-actions:hover')) {
      saveDateEdit();
    }
  }, 150);
}

// Handle keyboard shortcuts for date editing
function handleDateKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    saveDateEdit();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    cancelDateEdit();
  }
}

// Function to manually refresh invoice data
function refreshInvoiceData() {
  document.getElementById('invoice-no-status').style.display = 'block';
  document.getElementById('invoice-date-status').style.display = 'block';
  fetchInvoiceData();
}

function addItem() { 
  const tbody = document.getElementById('item-body');
  const row = document.createElement('tr');
  const rowCount = tbody.children.length + 1;
  row.innerHTML = `
  <td class="sno">${rowCount}</td>
  <td><input type="text" onchange="recalculate(this)" /></td>
  <td>18%</td>
  <td><input type="number" value="1" onchange="recalculate(this)" /></td>
  <td><input type="number" value="0" onchange="recalculate(this)" /></td>
  <td class="amount">0.00</td>
  <td class="cgst">0.00</td>
  <td class="sgst">0.00</td>
  <td class="igst">0.00</td>
  <td><input type="number" class="total-input" value="0.00" min="0" step="0.01" onchange="recalculate(this)" /></td>
  <td class="pdf-hide"><button onclick="deleteItem(this)" class="delete-btn">×</button></td>
`;
  tbody.appendChild(row);
  updateSerialNumbers();
  recalculate();
}

function deleteItem(button) {
  const row = button.closest('tr');
  row.remove();
  updateSerialNumbers();
  recalculate();
}

function updateSerialNumbers() {
  const rows = document.querySelectorAll('#item-body tr');
  rows.forEach((row, index) => {
    row.querySelector('.sno').textContent = index + 1;
  });
}

function recalculate(changedInput) {
  const rows = document.querySelectorAll('#item-body tr');
  let amountTotal = 0, cgstTotal = 0, sgstTotal = 0, igstTotal = 0, grandTotal = 0;

  // FIXED: Hardcode seller GSTIN for correct state code
  const sellerState = getStateCode('37GOMPS6036E1ZH');
  const customerGSTIN = document.getElementById('customer-gstin').value.trim();
  const customerState = getStateCode(customerGSTIN);

  const isInterState = (sellerState !== customerState) && customerState !== '';

  rows.forEach(row => {
    const qtyInput = row.children[3].children[0];
    const rateInput = row.children[4].children[0];
    const totalInput = row.children[9].children[0];
    const qty = parseFloat(qtyInput.value) || 0;
    let rate = parseFloat(rateInput.value) || 0;
    let total = parseFloat(totalInput.value) || 0;

    let amount, cgst = 0, sgst = 0, igst = 0;

    if (changedInput === totalInput) {
      // User edited Total: recalculate base amount, rate, and taxes
      let baseAmount = total / 1.18;
      amount = baseAmount;
      rate = qty ? baseAmount / qty : 0;
      rateInput.value = rate.toFixed(2);

      if (isInterState) {
        igst = baseAmount * 0.18;
        cgst = 0;
        sgst = 0;
      } else {
        cgst = baseAmount * 0.09;
        sgst = baseAmount * 0.09;
        igst = 0;
      }
    } else {
      // User edited Qty or Rate: calculate as usual
      amount = qty * rate;
      if (isInterState) {
        igst = amount * 0.18;
        cgst = 0;
        sgst = 0;
      } else {
        cgst = amount * 0.09;
        sgst = amount * 0.09;
        igst = 0;
      }
      total = amount + cgst + sgst + igst;
      totalInput.value = total.toFixed(2);
    }

    row.querySelector('.amount').textContent = amount.toFixed(2);
    row.querySelector('.cgst').textContent = cgst ? cgst.toFixed(2) : '0.00';
    row.querySelector('.sgst').textContent = sgst ? sgst.toFixed(2) : '0.00';
    row.querySelector('.igst').textContent = igst ? igst.toFixed(2) : '0.00';

    amountTotal += amount;
    cgstTotal += cgst;
    sgstTotal += sgst;
    igstTotal += igst;
    grandTotal += total;
  });

  // Calculate discount
  const discountValue = parseFloat(document.getElementById('discount-value').value) || 0;
  const discountType = document.getElementById('discount-type').value;
  let discountAmount = 0;
  
  if (discountType === 'percent') {
    discountAmount = (amountTotal * discountValue) / 100;
  } else {
    discountAmount = discountValue;
  }
  
  // Ensure discount doesn't exceed total
  if (discountAmount > amountTotal) {
    discountAmount = amountTotal;
    if (discountType === 'fixed') {
      document.getElementById('discount-value').value = amountTotal.toFixed(2);
    }
  }
  
  const amountAfterDiscount = amountTotal - discountAmount;
  
  // Recalculate taxes based on discounted amount
  const taxOnDiscountedAmount = (cgstTotal + sgstTotal + igstTotal) * (amountAfterDiscount / (amountTotal || 1));
  
  // Recalculate individual taxes proportionally
  let finalCgst = 0, finalSgst = 0, finalIgst = 0;
  if (isInterState) {
    finalIgst = taxOnDiscountedAmount;
  } else {
    finalCgst = taxOnDiscountedAmount / 2;
    finalSgst = taxOnDiscountedAmount / 2;
  }
  
  const finalGrandTotal = amountAfterDiscount + taxOnDiscountedAmount;
  
  document.getElementById('amount-total').textContent = amountTotal.toFixed(2);
  document.getElementById('discount-amount').textContent = discountAmount.toFixed(2);
  document.getElementById('amount-after-discount').textContent = amountAfterDiscount.toFixed(2);
  document.getElementById('cgst-total').textContent = finalCgst.toFixed(2);
  document.getElementById('sgst-total').textContent = finalSgst.toFixed(2);
  document.getElementById('igst-total').textContent = finalIgst.toFixed(2);
  document.getElementById('tax-total').textContent = taxOnDiscountedAmount.toFixed(2);
  document.getElementById('grand-total').textContent = finalGrandTotal.toFixed(2);
  document.getElementById('amount-words').textContent = numberToWords(finalGrandTotal);
  document.getElementById('grand-total-bold').textContent = finalGrandTotal.toFixed(2);
  document.getElementById('amount-words-bold').textContent = numberToWords(finalGrandTotal);
  
  // Update discount display for PDF
  const discountTypeText = discountType === 'percent' ? discountValue + '%' : '₹' + discountValue;
  document.getElementById('discount-type-text').textContent = discountTypeText;

  updateTaxColumns();
}
function generatePDF() {
  const invoiceBox = document.getElementById('invoice');
  syncBilledToDisplay(true);

  // Get all customer inputs
  const addressInput1 = document.getElementById('customer-address1');
  const addressInput2 = document.getElementById('customer-address2');
  const addressInput3 = document.getElementById('customer-address3');
  const addressInputs = [addressInput1, addressInput2, addressInput3];
  
  const invoiceNo = document.getElementById('invoice-no').value;
  const invoiceDate = document.getElementById('invoice-date').value;
  const dropdown = document.getElementById('customer-dropdown');
  const customerName = dropdown.value === 'new'
    ? document.getElementById('customer-name').value.trim()
    : dropdown.options[dropdown.selectedIndex].text;
  const grandTotal = document.getElementById('grand-total').textContent;
  const gstinInput = document.getElementById('customer-gstin');
  
  if (!invoiceNo || !invoiceDate || !customerName || grandTotal === "0.00") {
    alert("Please fill in invoice number, date, customer name, and at least one item.");
    return;
  }

  // --- PREPARE UI FOR PDF GENERATION ---

  // Hide action buttons and edit icons that shouldn't be in the PDF
  const elementsToHide = invoiceBox.querySelectorAll('.edit-icon, .date-actions, button, [class*="edit"], .pdf-hide');
  elementsToHide.forEach(el => el.style.display = 'none');
  
  // Explicitly hide status messages
  const invoiceNoStatus = document.getElementById('invoice-no-status');
  const invoiceDateStatus = document.getElementById('invoice-date-status');
  if (invoiceNoStatus) invoiceNoStatus.style.display = 'none';
  if (invoiceDateStatus) invoiceDateStatus.style.display = 'none';
  
  // Show discount display for PDF
  const discountDisplayPdf = document.getElementById('discount-display-pdf');
  if (discountDisplayPdf && parseFloat(document.getElementById('discount-value').value) > 0) {
    discountDisplayPdf.style.display = 'inline';
  }
  
  // Select the original "Billed To" section which contains the form
  const originalBilledToSection = document.querySelectorAll('.boxed-section')[1];

  // Create a new, clean "Billed To" box for the PDF
  const pdfBilledToBox = document.createElement('div');
  pdfBilledToBox.className = 'boxed-section'; // Use the same class for consistent styling

  // Gather all data for the new box
  const addressLines = addressInputs
    .map(input => input.value.trim())
    .filter(line => line)
    .join('<br>');
  const gstinValue = gstinInput.value.trim();

  // Populate the new box with clean HTML
  pdfBilledToBox.innerHTML = `
    <h3>Billed To</h3>
    <p style="margin: 0; font-weight: bold; font-size: 1.0em;">${customerName}</p>
    <p style="margin: 0; line-height: 1.4; margin-top: 4px;">${addressLines}</p>
    <p style="margin: 0; font-weight: bold; margin-top: 8px;">GSTIN: ${gstinValue}</p>
  `;
  
  // Temporarily replace the original form with the clean PDF version
  if (originalBilledToSection) {
    originalBilledToSection.parentNode.insertBefore(pdfBilledToBox, originalBilledToSection);
    originalBilledToSection.style.display = 'none';
  }

  const fileName = `${invoiceNo}_${customerName}.pdf`;
  const pdfOptions = {
    margin: [0, 0],
    filename: fileName,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, scrollY: 0, windowWidth: document.documentElement.clientWidth },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  // Temporarily render Item inputs as multi-line spans for better wrapping in PDF
  const itemReplacements = [];
  document.querySelectorAll('#item-body tr').forEach(row => {
    const itemCell = row.children[1];
    const input = itemCell && itemCell.querySelector('input[type="text"]');
    if (input) {
      const span = document.createElement('span');
      span.className = 'item-text-span';
      span.textContent = input.value;
      itemCell.appendChild(span);
      input.style.display = 'none';
      itemReplacements.push({ input, span });
    }
  });

  html2pdf().set(pdfOptions).from(invoiceBox).outputPdf('blob').then(function(pdfBlob) {
    // --- RESTORE UI AFTER PDF GENERATION ---
    
    // Hide discount display for PDF
    const discountDisplayPdf = document.getElementById('discount-display-pdf');
    if (discountDisplayPdf) {
      discountDisplayPdf.style.display = 'none';
    }
    
    // Remove the temporary PDF box and show the original form again
    pdfBilledToBox.remove();
    if (originalBilledToSection) {
        originalBilledToSection.style.display = '';
    }
    
    // Show the action buttons and icons again
    elementsToHide.forEach(el => el.style.display = '');

    // Restore item inputs
    itemReplacements.forEach(({ input, span }) => {
      if (span && span.parentNode) span.parentNode.removeChild(span);
      if (input) input.style.display = '';
    });

    const items = [];
    const rows = document.querySelectorAll('#item-body tr');
    rows.forEach(row => {
      const itemName = row.children[1].children[0].value;
      const gstRateText = row.children[2].textContent.trim(); // Get GST rate text like "18%"
      const gstRate = parseFloat(gstRateText.replace('%', '')) || 18; // Remove % and parse
      const qty = parseFloat(row.children[3].children[0].value) || 1;
      const rate = parseFloat(row.children[4].children[0].value) || 0;
      const total = parseFloat(row.children[9].children[0].value) || 0;
      if (itemName.trim()) {
        items.push({
          name: itemName,
          gst_rate: gstRate,
          qty: qty,
          rate: rate,
          amount: qty * rate,
          cgst: parseFloat(row.querySelector('.cgst').textContent) || 0,
          sgst: parseFloat(row.querySelector('.sgst').textContent) || 0,
          igst: parseFloat(row.querySelector('.igst').textContent) || 0,
          total: total
        });
      }
    });

    const invoiceData = {
      invoice_no: invoiceNo,
      invoice_date: invoiceDate,
      customer_name: customerName,
      customer_address1: document.getElementById('customer-address1').value,
      customer_address2: document.getElementById('customer-address2').value,
      customer_address3: document.getElementById('customer-address3').value,
      customer_gstin: gstinInput.value,
      amount_before_tax: parseFloat(document.getElementById('amount-total').textContent) || 0,
      discount_type: document.getElementById('discount-type').value,
      discount_value: parseFloat(document.getElementById('discount-value').value) || 0,
      discount_amount: parseFloat(document.getElementById('discount-amount').textContent) || 0,
      amount_after_discount: parseFloat(document.getElementById('amount-after-discount').textContent) || 0,
      cgst: parseFloat(document.getElementById('cgst-total').textContent) || 0,
      sgst: parseFloat(document.getElementById('sgst-total').textContent) || 0,
      igst: parseFloat(document.getElementById('igst-total').textContent) || 0,
      total_tax: parseFloat(document.getElementById('tax-total').textContent) || 0,
      total_after_tax: parseFloat(grandTotal) || 0,
      amount_in_words: document.getElementById('amount-words').textContent,
      items: items
    };

    const reader = new FileReader();
    reader.onloadend = function() {
      invoiceData.pdf_base64 = reader.result.split(',')[1];
      
      // Determine whether to insert or update
      const endpoint = isEditingMode ? 'update_invoice.php' : 'insert_invoice.php';
      const action = isEditingMode ? 'updated' : 'saved';
      
      // Debug logging
      console.log('=== SAVING INVOICE ===');
      console.log('Edit Mode:', isEditingMode);
      console.log('Endpoint:', endpoint);
      console.log('Invoice No:', invoiceData.invoice_no);
      console.log('Invoice Data:', invoiceData);
      
      fetch(`${API_BASE_URL}/${endpoint}`, {
        method: "POST",
        body: JSON.stringify(invoiceData),
        headers: { "Content-Type": "application/json" }
      })
      .then(res => {
        console.log('Response status:', res.status);
        return res.json();
      })
      .then(data => {
        console.log(`✅ Invoice ${action} response:`, data);
        if (!data.success) {
          throw new Error(data.error || 'Unknown error occurred');
        }
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        alert(`Invoice ${action} and PDF downloaded successfully!`);
        
        // If it was an update, ask if user wants to create a new invoice
        if (isEditingMode) {
          setTimeout(() => {
            if (confirm('Invoice updated! Do you want to create a new invoice?')) {
              resetToNewInvoice();
            }
          }, 500);
        } else {
          setTimeout(() => refreshInvoiceData(), 1000);
        }
      })
      .catch(err => {
        console.error("❌ Save Error:", err);
        alert("Failed to save invoice: " + err.message);
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    };
    reader.readAsDataURL(pdfBlob);
  });
}








// Copy Billed To inputs into display elements for PDF; when forPdf is true,
// temporarily show the display name element
function syncBilledToDisplay(forPdf = false) {
  const dropdown = document.getElementById('customer-dropdown');
  const nameInput = document.getElementById('customer-name');
  const nameDisplay = document.getElementById('customer-name-display');

  const customerName = dropdown.value === 'new'
    ? (nameInput.value || '').trim()
    : (dropdown.value || '').trim();

  if (nameDisplay) {
    nameDisplay.textContent = customerName;
    if (forPdf) nameDisplay.style.display = customerName ? 'block' : 'none';
  }



  // Address lines
  const a1 = document.getElementById('customer-address1').value || '';
  const a2 = document.getElementById('customer-address2').value || '';
  const a3 = document.getElementById('customer-address3').value || '';
  const d1 = document.getElementById('address1-display');
  const d2 = document.getElementById('address2-display');
  const d3 = document.getElementById('address3-display');
  if (d1) d1.textContent = a1;
  if (d2) d2.textContent = a2;
  if (d3) d3.textContent = a3;
}

// Initialize the page
window.onload = function() {
  fetchInvoiceData(); // Fetch invoice number and date from server
  updateTaxColumns();

  // Add event listeners
  document.getElementById('customer-gstin').addEventListener('input', function() {
    recalculate();
    updateTaxColumns();
  });

  // Add event listeners for form inputs
  document.querySelectorAll('input').forEach(input => {
    input.addEventListener('change', function() {
      // You can add any additional change handlers here if needed
    });
  });
};

function getStateCode(gst) {
  return gst && gst.length >= 2 ? gst.substring(0, 2) : null;
}

function updateTaxColumns() {
  const sellerState = getStateCode('37GOMPS6036E1ZH');
  const customerGSTIN = document.getElementById('customer-gstin').value.trim();
  const customerState = getStateCode(customerGSTIN);
  const isInterState = (sellerState !== customerState) && customerState !== '';

  // Show/hide tax columns in the invoice table
  document.querySelectorAll('.cgst, .sgst').forEach(el => {
    el.style.display = isInterState ? 'none' : '';
  });
  document.querySelectorAll('.igst').forEach(el => {
    el.style.display = isInterState ? '' : 'none';
  });

  // Show/hide tax headers in the table
  document.querySelectorAll('.invoice-table th').forEach(th => {
    if (th.textContent === 'CGST' || th.textContent === 'SGST') {
      th.style.display = isInterState ? 'none' : '';
    }
    if (th.textContent === 'IGST') {
      th.style.display = isInterState ? '' : 'none';
    }
  });

  // Show/hide totals section tax lines
  document.getElementById('cgst-row').style.display = isInterState ? 'none' : '';
  document.getElementById('sgst-row').style.display = isInterState ? 'none' : '';
  document.getElementById('igst-row').style.display = isInterState ? '' : 'none';
}

function numberToWords(num) {
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  if (typeof num === "string") num = parseFloat(num);
  if (isNaN(num)) return "Zero Rupees Only";

  let [rupees, paise] = num.toFixed(2).split(".");
  rupees = parseInt(rupees, 10);
  paise = parseInt(paise, 10);

  function inWords(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + inWords(n % 100) : "");
    if (n < 100000) return inWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + inWords(n % 1000) : "");
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + inWords(n % 100000) : "");
    return inWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + inWords(n % 10000000) : "");
  }

  let words = "";
  if (rupees > 0) words += inWords(rupees) + " Rupees";
  if (paise > 0) words += (words ? " and " : "") + inWords(paise) + " Paise";
  if (!words) words = "Zero Rupees";
  return words + " Only";
}

// Add API_BASE_URL constant
// Customer management
let customers = [];

// Load customers when page loads
async function loadCustomers() {
  const customerLoading = document.getElementById('customer-loading');
  const customerDropdown = document.getElementById('customer-dropdown');
  
  try {
    customerLoading.style.display = 'block';
    
    const response = await fetch(`${API_BASE_URL}/customers.php?action=get_all&_=${Date.now()}`, {
      cache: 'no-store'
    });
    const data = await response.json();
    
    if (data.success) {
      customers = data.customers;
      
      // Clear existing options except default ones
      customerDropdown.innerHTML = `
        <option value="">-- Select Customer --</option>
        <option value="new">+ Add New Customer</option>
      `;
      
      // Add customers to dropdown
      customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.customer_name;
        option.textContent = customer.customer_name;
        customerDropdown.appendChild(option);
      });
      
      customerLoading.style.display = 'none';
    } else {
      throw new Error(data.error || 'Failed to load customers');
    }
  } catch (error) {
    console.error('Error loading customers:', error);
    customerLoading.textContent = 'Error loading customers';
    customerLoading.className = 'error';
    
    setTimeout(() => {
      customerLoading.style.display = 'none';
    }, 3000);
  }
}

// Handle customer selection
function selectCustomer() {
  const dropdown = document.getElementById('customer-dropdown');
  const nameInput = document.getElementById('customer-name');
  const selectedValue = dropdown.value;
  
  if (selectedValue === 'new') {
    // Show name input for new customer
    nameInput.style.display = 'block';
    nameInput.focus();
    clearCustomerFields();
  } else if (selectedValue === '') {
    // No selection
    nameInput.style.display = 'none';
    clearCustomerFields();
  } else {
    // Existing customer selected
    nameInput.style.display = 'none';
    fillCustomerData(selectedValue);
  }
}

// Fill customer data from selection
function fillCustomerData(customerName) {
  const customer = customers.find(c => c.customer_name == customerName);
  
  if (customer) {
    // Set form values - handle both column name formats
    document.getElementById('customer-address1').value = customer.customer_address1 || customer.address_line1 || '';
    document.getElementById('customer-address2').value = customer.customer_address2 || customer.address_line2 || '';
    document.getElementById('customer-address3').value = customer.customer_address3 || customer.address_line3 || '';
    document.getElementById('customer-gstin').value = customer.customer_gstin || customer.gstin || '';
    
    // Set display values for PDF (with safety checks)
    const nameDisplay = document.getElementById('customer-name-display');
    if (nameDisplay) nameDisplay.textContent = customer.customer_name || '';
    
    const address1Display = document.getElementById('address1-display');
    if (address1Display) address1Display.textContent = customer.customer_address1 || customer.address_line1 || '';
    
    const address2Display = document.getElementById('address2-display');
    if (address2Display) address2Display.textContent = customer.customer_address2 || customer.address_line2 || '';
    
    const address3Display = document.getElementById('address3-display');
    if (address3Display) address3Display.textContent = customer.customer_address3 || customer.address_line3 || '';
    
    // Trigger recalculation for tax changes
    recalculate();
    updateTaxColumns();
    // Keep display values in sync for immediate PDF export
    syncBilledToDisplay(false);
  }
}

// Clear customer fields
function clearCustomerFields() {
  document.getElementById('customer-address1').value = '';
  document.getElementById('customer-address2').value = '';
  document.getElementById('customer-address3').value = '';
  document.getElementById('customer-gstin').value = '';
  
  // Trigger recalculation
  recalculate();
  updateTaxColumns();
}

// Save current customer data
async function saveCurrentCustomer() {
  const dropdown = document.getElementById('customer-dropdown');
  const nameInput = document.getElementById('customer-name');
  
  let customerName;
  if (dropdown.value === 'new') {
    customerName = nameInput.value.trim();
  } else if (dropdown.value) {
    customerName = dropdown.value;
  } else {
    alert('Please select or enter a customer name');
    return;
  }
  
  if (!customerName) {
    alert('Please enter a customer name');
    return;
  }
  
  const customerData = {
    customer_name: customerName,
    address_line1: document.getElementById('customer-address1').value,
    address_line2: document.getElementById('customer-address2').value,
    address_line3: document.getElementById('customer-address3').value,
    gstin: document.getElementById('customer-gstin').value
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}/customers.php?action=add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(customerData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('Customer saved successfully!');
      await refreshCustomers();
      
      // Select the saved customer
      dropdown.value = customerName;
      nameInput.style.display = 'none';
    } else {
      throw new Error(data.error || 'Failed to save customer');
    }
  } catch (error) {
    console.error('Error saving customer:', error);
    alert('Error saving customer: ' + error.message);
  }
}

// Refresh customer list
async function refreshCustomers() {
  await loadCustomers();
}

// Initialize when page loads
window.onload = async function() {
  try {
    // Load initial data in the correct order
    await fetchInvoiceData(); // This was missing!
    await loadCustomers();
    await loadInvoiceNumbers(); // Load invoice numbers for dropdown
    updateTaxColumns();

    // Add event listeners
    document.getElementById('customer-gstin').addEventListener('input', function() {
      recalculate();
      updateTaxColumns();
    });

    document.getElementById('customer-name').addEventListener('blur', function() {
      if (this.value.trim()) {
        // Auto-fill the current customer data when typing new name
      }
    });

    // Add one default item row
    addItem();

  } catch (error) {
    console.error('Error during initialization:', error);
  }
};

// Toggle load invoice section
function toggleLoadInvoice() {
  const section = document.getElementById('load-invoice-section');
  if (section.style.display === 'none') {
    section.style.display = 'block';
    loadInvoiceNumbers(); // Refresh the list when opening
  } else {
    section.style.display = 'none';
  }
}

// Load all invoice numbers
async function loadInvoiceNumbers() {
  const dropdown = document.getElementById('old-invoice-dropdown');
  const status = document.getElementById('load-invoice-status');
  
  try {
    status.textContent = 'Loading invoices...';
    status.className = 'loading';
    
    const response = await fetch(`${API_BASE_URL}/get_invoice.php?action=get_all_numbers`);
    const data = await response.json();
    
    if (data.success) {
      dropdown.innerHTML = '<option value="">-- Select Invoice --</option>';
      
      data.invoices.forEach(inv => {
        const option = document.createElement('option');
        option.value = inv.invoice_no;
        option.textContent = `Invoice #${inv.invoice_no} - ${inv.customer_name} (${inv.invoice_date})`;
        dropdown.appendChild(option);
      });
      
      status.textContent = `${data.invoices.length} invoices loaded`;
      status.className = 'success';
      setTimeout(() => status.textContent = '', 3000);
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error loading invoice numbers:', error);
    status.textContent = 'Error loading invoices';
    status.className = 'error';
  }
}

// Load selected invoice
async function loadSelectedInvoice() {
  const dropdown = document.getElementById('old-invoice-dropdown');
  const status = document.getElementById('load-invoice-status');
  const invoiceNo = dropdown.value;
  
  if (!invoiceNo) {
    alert('Please select an invoice');
    return;
  }
  
  try {
    status.textContent = 'Loading invoice data...';
    status.className = 'loading';
    
    const response = await fetch(`${API_BASE_URL}/get_invoice.php?action=get_by_number&invoice_no=${invoiceNo}`);
    const data = await response.json();
    
    if (data.success) {
      // Set editing mode
      isEditingMode = true;
      currentEditInvoiceNo = invoiceNo;
      
      // Load invoice header data
      const invoice = data.invoice;
      document.getElementById('invoice-no').value = invoice.invoice_no;
      document.getElementById('invoice-no').readOnly = true; // Make invoice number read-only
      
      // Set date
      setInvoiceDate(invoice.invoice_date);
      
      // Load customer data
      const customerDropdown = document.getElementById('customer-dropdown');
      const customerName = invoice.customer_name || '';
      
      if (customerName) {
        // Check if customer exists in dropdown
        const customerExists = Array.from(customerDropdown.options).some(opt => opt.value === customerName);
        if (customerExists) {
          customerDropdown.value = customerName;
        } else {
          customerDropdown.value = 'new';
          document.getElementById('customer-name').style.display = 'block';
          document.getElementById('customer-name').value = customerName;
        }
      }
      
      // Load customer details (handle both column name formats)
      if (data.customer) {
        document.getElementById('customer-address1').value = data.customer.address_line1 || data.customer.customer_address1 || '';
        document.getElementById('customer-address2').value = data.customer.address_line2 || data.customer.customer_address2 || '';
        document.getElementById('customer-address3').value = data.customer.address_line3 || data.customer.customer_address3 || '';
        document.getElementById('customer-gstin').value = data.customer.gstin || data.customer.customer_gstin || '';
      } else {
        document.getElementById('customer-gstin').value = invoice.customer_gstin || '';
      }
      
      // Load discount
      document.getElementById('discount-type').value = invoice.discount_type || 'fixed';
      document.getElementById('discount-value').value = invoice.discount_value || 0;
      
      // Clear existing items
      const tbody = document.getElementById('item-body');
      tbody.innerHTML = '';
      
      // Load invoice items
      data.items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="sno">${item.s_no}</td>
          <td><input type="text" value="${item.item_name}" onchange="recalculate(this)" /></td>
          <td>${parseInt(item.gst_rate)}%</td>
          <td><input type="number" value="${item.quantity}" onchange="recalculate(this)" /></td>
          <td><input type="number" value="${item.rate}" onchange="recalculate(this)" /></td>
          <td class="amount">${item.amount}</td>
          <td class="cgst">${item.cgst}</td>
          <td class="sgst">${item.sgst}</td>
          <td class="igst">${item.igst}</td>
          <td><input type="number" class="total-input" value="${item.total}" min="0" step="0.01" onchange="recalculate(this)" /></td>
          <td class="pdf-hide"><button onclick="deleteItem(this)" class="delete-btn">×</button></td>
        `;
        tbody.appendChild(row);
      });
      
      // Recalculate totals
      updateSerialNumbers();
      recalculate();
      updateTaxColumns();
      
      // Hide load section and show success message
      toggleLoadInvoice();
      alert(`Invoice #${invoiceNo} loaded successfully! You can now edit and save it.`);
      
      // Change invoice number status
      const invoiceNoStatus = document.getElementById('invoice-no-status');
      invoiceNoStatus.textContent = 'Editing existing invoice';
      invoiceNoStatus.className = 'warning';
      invoiceNoStatus.style.display = 'block';
      
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error loading invoice:', error);
    status.textContent = 'Error: ' + error.message;
    status.className = 'error';
    alert('Failed to load invoice: ' + error.message);
  }
}

// Clear form and reset to new invoice mode
function resetToNewInvoice() {
  isEditingMode = false;
  currentEditInvoiceNo = null;
  document.getElementById('invoice-no').readOnly = false;
  fetchInvoiceData();
  
  // Clear customer
  document.getElementById('customer-dropdown').value = '';
  document.getElementById('customer-name').value = '';
  document.getElementById('customer-address1').value = '';
  document.getElementById('customer-address2').value = '';
  document.getElementById('customer-address3').value = '';
  document.getElementById('customer-gstin').value = '';
  
  // Clear items
  document.getElementById('item-body').innerHTML = '';
  addItem();
  
  // Reset discount
  document.getElementById('discount-type').value = 'percent';
  document.getElementById('discount-value').value = 0;
  
  recalculate();
}


