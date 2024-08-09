document.addEventListener('DOMContentLoaded', () => {
    let tokenCounter = 1;
    const form = document.getElementById('appointment-form');
    const tableBody = document.querySelector('#appointments-table tbody');
    const printButton = document.getElementById('print-button');
    const deleteSelectedButton = document.getElementById('delete-selected');
    let dataTable;

    // Open IndexedDB
    const openDB = () => {
        const request = indexedDB.open('appointmentsDB', 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            db.createObjectStore('appointments', { keyPath: 'token' });
        };

        request.onsuccess = (event) => {
            const db = event.target.result;
            loadAppointments(db);
        };

        request.onerror = (event) => {
            console.error('Error opening IndexedDB:', event);
        };
    };

    // Load appointments from IndexedDB
    const loadAppointments = (db) => {
        const transaction = db.transaction('appointments', 'readonly');
        const store = transaction.objectStore('appointments');
        const request = store.getAll();

        request.onsuccess = (event) => {
            const appointments = event.target.result;
            tokenCounter = appointments.length + 1;
            appointments.forEach(appointment => {
                addRowToTable(appointment);
            });

            if (dataTable) {
                dataTable.destroy();
            }
            dataTable = $('#appointments-table').DataTable();
        };

        request.onerror = (event) => {
            console.error('Error loading appointments:', event);
        };
    };

    // Add a row to the table
    const addRowToTable = (appointment) => {
        const row = document.createElement('tr');
        row.dataset.token = appointment.token;
        row.innerHTML = `
            <td><input type="checkbox" class="select-row"></td>
            <td>${appointment.token}</td>
            <td>${appointment.name}</td>
            <td>${appointment.phone}</td>
            <td>${appointment.date}</td>
            <td>${appointment.time}</td>
            <td><input type="checkbox" ${appointment.approved ? 'checked' : ''}></td>
            <td><button class="delete-button" style="background-color: red;">Delete</button></td>
        `;

        // Add event listener to the checkbox to update approved status
        row.querySelector('input[type="checkbox"]:not(.select-row)').addEventListener('change', (event) => {
            appointment.approved = event.target.checked;
            saveAppointment(appointment);
        });

        // Add event listener to the delete button
        row.querySelector('.delete-button').addEventListener('click', () => {
            Swal.fire({
                title: 'Are you sure?',
                text: "You won't be able to revert this!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, delete it!'
            }).then((result) => {
                if (result.isConfirmed) {
                    deleteAppointment(appointment.token);
                }
            });
        });

        tableBody.appendChild(row);
    };

    // Save appointment to IndexedDB
    const saveAppointment = (appointment) => {
        const dbRequest = indexedDB.open('appointmentsDB', 1);
        dbRequest.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction('appointments', 'readwrite');
            const store = transaction.objectStore('appointments');
            store.put(appointment);
            transaction.oncomplete = () => {
                console.log('Appointment saved.');
            };
            transaction.onerror = (event) => {
                console.error('Error saving appointment:', event);
            };
        };
    };

    // Delete appointment from IndexedDB
    const deleteAppointment = (token) => {
        const dbRequest = indexedDB.open('appointmentsDB', 1);
        dbRequest.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction('appointments', 'readwrite');
            const store = transaction.objectStore('appointments');
            store.delete(token);
            transaction.oncomplete = () => {
                console.log('Appointment deleted.');
                removeRowFromTable(token);
                Swal.fire(
                    'Deleted!',
                    'The appointment has been deleted.',
                    'success'
                );
            };
            transaction.onerror = (event) => {
                console.error('Error deleting appointment:', event);
            };
        };
    };

    // Remove row from the table
    const removeRowFromTable = (token) => {
        const row = document.querySelector(`tr[data-token="${token}"]`);
        if (row) {
            row.remove();
        }
    };

    // Handle form submission
    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const name = document.getElementById('name').value;
        const phone = document.getElementById('phone').value;
        const date = document.getElementById('date').value;
        const time = document.getElementById('time').value;

        if (name && phone && date && time) {
            const dbRequest = indexedDB.open('appointmentsDB', 1);
            dbRequest.onsuccess = (event) => {
                const db = event.target.result;
                const appointment = {
                    token: tokenCounter,
                    name,
                    phone,
                    date,
                    time,
                    approved: false
                };

                addRowToTable(appointment);
                saveAppointment(appointment);
                tokenCounter++;
                form.reset();
            };
        }
    });

    // Handle delete selected button click
    deleteSelectedButton.addEventListener('click', () => {
        const selectedCheckboxes = document.querySelectorAll('#appointments-table .select-row:checked');
        const tokens = Array.from(selectedCheckboxes).map(checkbox => checkbox.closest('tr').dataset.token);

        if (tokens.length > 0) {
            Swal.fire({
                title: 'Are you sure?',
                text: "You won't be able to revert this!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, delete all selected!'
            }).then((result) => {
                if (result.isConfirmed) {
                    tokens.forEach(token => deleteAppointment(token));
                }
            });
        }
    });

    printButton.addEventListener('click', () => {
        window.print();
    });

    openDB();
});
