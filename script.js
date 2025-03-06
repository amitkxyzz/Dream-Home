// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDZKjmib6_4O8lcIt4YX-5pkewrvCsVZro",
    authDomain: "dream-home-5f966.firebaseapp.com",
    projectId: "dream-home-5f966",
    storageBucket: "dream-home-5f966.firebasestorage.app",
    messagingSenderId: "884300567643",
    appId: "1:884300567643:web:8996af2bd116d1e23e1b7e",
    measurementId: "G-56V6KWH96D"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const expensesCollection = db.collection('expenses');

// Global expenses array
let expenses = [];

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';

    // Hide notification after 3 seconds
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Format date from ISO to readable format
function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString();
}

// Format date for datetime-local input
function formatDateForInput(dateStr) {
    if (!dateStr) return "";
    
    // If already in ISO format with seconds
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?$/)) {
        return dateStr.substring(0, 16); // Trim to YYYY-MM-DDTHH:MM
    }
    
    // If already in ISO format without seconds
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
        return dateStr;
    }
    
    // Try to parse as date
    try {
        const date = new Date(dateStr);
        return date.toISOString().substring(0, 16); // Format as YYYY-MM-DDTHH:MM
    } catch (e) {
        return dateStr;
    }
}

// Parse date for sorting
function parseDate(dateStr) {
    if (!dateStr) return new Date(0); // Default to epoch
    try {
        return new Date(dateStr);
    } catch (e) {
        return new Date(0);
    }
}

// Format number as currency
function formatCurrency(amount) {
    return "₹" + parseFloat(amount).toLocaleString('en-IN');
}

// Load expenses from Firestore
async function loadExpenses() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('expensesTable').style.display = 'none';

    try {
        const snapshot = await expensesCollection.orderBy('timestamp', 'desc').get();
        expenses = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            expenses.push({
                id: doc.id,
                ...data,
                spend: parseFloat(data.spend)
            });
        });

        // Sort expenses by date (newest first)
        expenses.sort((a, b) => parseDate(b.date) - parseDate(a.date));

        renderTable();
        updateLastUpdated();

        document.getElementById('loading').style.display = 'none';
        document.getElementById('expensesTable').style.display = 'table';
    } catch (error) {
        console.error("Error loading expenses:", error);
        showNotification("Error loading expenses: " + error.message, 'error');
        document.getElementById('loading').style.display = 'none';
    }
}

// Render expenses table
function renderTable(filteredExpenses = null) {
    const tableBody = document.getElementById('expensesBody');
    tableBody.innerHTML = '';

    const dataToRender = filteredExpenses || expenses;
    
    // Sort expenses by date (newest first)
    const sortedExpenses = [...dataToRender].sort((a, b) => parseDate(b.date) - parseDate(a.date));

    // Starting S.No
    let serialNumber = 1;

    sortedExpenses.forEach((expense) => {
        const row = document.createElement('tr');

        // Add data-label attributes for mobile view
        const cells = `
            <td data-label="S.No">${serialNumber}</td>
            <td data-label="Product">${expense.product}</td>
            <td data-label="Description">${expense.description || '-'}</td>
            <td data-label="Date & Time">${formatDate(expense.date)}</td>
            <td data-label="Rate">${expense.rate}</td>
            <td data-label="Spend">${formatCurrency(expense.spend)}</td>
            <td data-label="Name">${expense.name}</td>
            <td class="action-cell" data-label="Actions">
                <button class="btn" onclick="editExpense('${expense.id}')">Edit</button>
                <button class="btn btn-danger" onclick="deleteExpense('${expense.id}')">Delete</button>
            </td>
        `;

        row.innerHTML = cells;
        tableBody.appendChild(row);
        serialNumber++;
    });

    updateTotal();
}

// Update the total spent
function updateTotal() {
    const total = expenses.reduce((sum, expense) => sum + expense.spend, 0);
    document.getElementById('totalSpend').innerHTML = `<strong>${formatCurrency(total)}</strong>`;
}

// Update the last updated timestamp
function updateLastUpdated() {
    const now = new Date();
    const formattedDate = now.toLocaleString();
    document.getElementById('lastUpdated').textContent = `Last Updated: ${formattedDate}`;
}

// Add or update expense
async function saveExpense(e) {
    e.preventDefault();

    const editId = document.getElementById('editId').value;

    const expense = {
        product: document.getElementById('product').value,
        description: document.getElementById('description').value,
        date: document.getElementById('date').value,
        rate: document.getElementById('rate').value,
        spend: parseFloat(document.getElementById('spend').value),
        name: document.getElementById('name').value,
        timestamp: firebase.firestore.Timestamp.now()
    };

    try {
        if (editId) {
            // Update existing expense
            await expensesCollection.doc(editId).update(expense);
            showNotification("Expense updated successfully!");
        } else {
            // Add new expense
            await expensesCollection.add(expense);
            showNotification("Expense added successfully!");
        }

        // Reset form
        document.getElementById('expenseForm').reset();
        document.getElementById('editId').value = '';
        document.getElementById('saveBtn').textContent = 'Add Expense';
        document.getElementById('cancelBtn').style.display = 'none';

        // Reload data
        loadExpenses();
    } catch (error) {
        console.error("Error saving expense:", error);
        showNotification("Error saving expense: " + error.message, 'error');
    }
}

// Edit expense
function editExpense(id) {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return;

    document.getElementById('product').value = expense.product;
    document.getElementById('description').value = expense.description || '';
    document.getElementById('date').value = formatDateForInput(expense.date);
    document.getElementById('rate').value = expense.rate;
    document.getElementById('spend').value = expense.spend;
    document.getElementById('name').value = expense.name;
    document.getElementById('editId').value = id;

    document.getElementById('saveBtn').textContent = 'Update Expense';
    document.getElementById('cancelBtn').style.display = 'inline-block';

    // Scroll to form
    document.getElementById('expenseForm').scrollIntoView({ behavior: 'smooth' });
}

// Delete expense
async function deleteExpense(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
        try {
            await expensesCollection.doc(id).delete();
            showNotification("Expense deleted successfully!");
            loadExpenses();
        } catch (error) {
            console.error("Error deleting expense:", error);
            showNotification("Error deleting expense: " + error.message, 'error');
        }
    }
}

// Cancel edit
function cancelEdit() {
    document.getElementById('expenseForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('saveBtn').textContent = 'Add Expense';
    document.getElementById('cancelBtn').style.display = 'none';
    
    // Set current date and time in the date field
    setCurrentDateTime();
}

// Search functionality
function searchExpenses() {
    const query = document.getElementById('searchInput').value.toLowerCase();

    if (query.trim() === '') {
        renderTable();
        return;
    }

    const filteredExpenses = expenses.filter(expense =>
        expense.product.toLowerCase().includes(query) ||
        (expense.description && expense.description.toLowerCase().includes(query)) ||
        expense.name.toLowerCase().includes(query) ||
        expense.rate.toLowerCase().includes(query)
    );

    renderTable(filteredExpenses);
}

// Function to download table as CSV
function downloadCSV() {
    // Sort expenses by date (newest first)
    const sortedExpenses = [...expenses].sort((a, b) => parseDate(b.date) - parseDate(a.date));
    
    let csv = [
        ['S.No', 'Product', 'Product Description', 'Date & Time', 'Rate', 'Spend in Rupees', 'Name']
    ];

    // Add data rows
    sortedExpenses.forEach((expense, index) => {
        csv.push([
            index + 1,
            expense.product,
            expense.description || '',
            formatDate(expense.date),
            expense.rate,
            expense.spend,
            expense.name
        ]);
    });

    // Add total row
    const total = expenses.reduce((sum, expense) => sum + expense.spend, 0);
    csv.push(['', '', '', '', 'Total:', total, '']);

    // Convert to CSV string
    const csvContent = csv.map(row =>
        row.map(cell =>
            `"${(cell || '').toString().replace(/"/g, '""')}"`
        ).join(',')
    ).join('\n');

    // Create download link
    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'project_expenses.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Function to download table as Excel
function downloadExcel() {
    // Sort expenses by date (newest first)
    const sortedExpenses = [...expenses].sort((a, b) => parseDate(b.date) - parseDate(a.date));
    
    let html = '<table border="1">';

    // Header row
    html += '<tr>';
    ['S.No', 'Product', 'Product Description', 'Date & Time', 'Rate', 'Spend in Rupees', 'Name'].forEach(header => {
        html += `<th>${header}</th>`;
    });
    html += '</tr>';

    // Data rows
    sortedExpenses.forEach((expense, index) => {
        html += '<tr>';
        html += `<td>${index + 1}</td>`;
        html += `<td>${expense.product}</td>`;
        html += `<td>${expense.description || ''}</td>`;
        html += `<td>${formatDate(expense.date)}</td>`;
        html += `<td>${expense.rate}</td>`;
        html += `<td>${expense.spend}</td>`;
        html += `<td>${expense.name}</td>`;
        html += '</tr>';
    });

    // Total row
    const total = expenses.reduce((sum, expense) => sum + expense.spend, 0);
    html += '<tr>';
    html += '<td colspan="5" style="text-align:right;"><strong>Total:</strong></td>';
    html += `<td><strong>${total}</strong></td>`;
    html += '<td></td>';
    html += '</tr>';

    html += '</table>';

    // Create a blob
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);

    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = 'project_expenses.xls';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

// Function to print table
function printTable() {
    window.print();
}

// Set current date and time in the date field
function setCurrentDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
    document.getElementById('date').value = currentDateTime;
}

// Make functions available globally (for HTML onclick)
window.editExpense = editExpense;
window.deleteExpense = deleteExpense;

// Add event listeners
document.addEventListener('DOMContentLoaded', function () {
    // Load data
    loadExpenses();

    // Form submission
    document.getElementById('expenseForm').addEventListener('submit', saveExpense);

    // Cancel button
    document.getElementById('cancelBtn').addEventListener('click', cancelEdit);

    // Download buttons
    document.getElementById('downloadCSV').addEventListener('click', downloadCSV);
    document.getElementById('downloadExcel').addEventListener('click', downloadExcel);
    document.getElementById('printTable').addEventListener('click', printTable);

    // Search input
    document.getElementById('searchInput').addEventListener('input', searchExpenses);

    // Set current date and time in the date field
    setCurrentDateTime();
});
