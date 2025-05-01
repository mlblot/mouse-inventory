// Google Sheets Integration for Mouse Inventory System
// This code should be added to the HTML file to enable Google Sheets integration

// 1. First, we need to load the Google API client library
function loadGoogleAPI() {
  const script = document.createElement('script');
  script.src = 'https://apis.google.com/js/api.js';
  script.onload = () => {
    gapi.load('client:auth2', initGoogleClient);
  };
  document.body.appendChild(script);
}

// 2. Initialize the Google API client
function initGoogleClient() {
  // Replace these with your own credentials from Google Cloud Console
  const API_KEY = 'YOUR_API_KEY';
  const CLIENT_ID = 'YOUR_CLIENT_ID';
  const DISCOVERY_DOCS = ['https://sheets.googleapis.com/$discovery/rest?version=v4'];
  const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
  
  // Your spreadsheet ID (from the URL of your Google Sheet)
  const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';
  
  gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: DISCOVERY_DOCS,
    scope: SCOPES
  }).then(() => {
    // Listen for sign-in state changes
    gapi.auth2.getAuthInstance().isSignedIn.listen(updateSignInStatus);
    
    // Handle the initial sign-in state
    updateSignInStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    
    // Setup sign in/out buttons
    document.getElementById('authorize_button').onclick = handleAuthClick;
    document.getElementById('signout_button').onclick = handleSignoutClick;
  });
}

// 3. Update UI based on sign-in status
function updateSignInStatus(isSignedIn) {
  if (isSignedIn) {
    document.getElementById('authorize_button').style.display = 'none';
    document.getElementById('signout_button').style.display = 'block';
    document.getElementById('content').style.display = 'block';
    // Load data from Google Sheets
    loadInventoryData();
  } else {
    document.getElementById('authorize_button').style.display = 'block';
    document.getElementById('signout_button').style.display = 'none';
    document.getElementById('content').style.display = 'none';
  }
}

// 4. Handle login/logout
function handleAuthClick() {
  gapi.auth2.getAuthInstance().signIn();
}

function handleSignoutClick() {
  gapi.auth2.getAuthInstance().signOut();
}

// 5. Load inventory data from Google Sheets
function loadInventoryData() {
  gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: 'YOUR_SPREADSHEET_ID',
    range: 'Inventory!A2:G', // Adjust range as needed
  }).then(response => {
    const values = response.result.values || [];
    
    // Clear current inventory
    mouseInventory = [];
    
    // Process data
    if (values.length > 0) {
      values.forEach(row => {
        // Convert spreadsheet row to inventory item
        // Assuming columns are: Room, Rack, Column, Row, Strain, Gender, Birthdate, Count
        const item = {
          room: row[0],
          rack: parseInt(row[1]),
          column: row[2],
          row: parseInt(row[3]),
          strain: row[4],
          gender: row[5],
          birthdate: row[6],
          count: parseInt(row[7])
        };
        mouseInventory.push(item);
      });
    }
    
    // Update UI
    displayInventory();
  });
  
  // Also load daily check data
  gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: 'YOUR_SPREADSHEET_ID',
    range: 'DailyChecks!A2:F', // Adjust range as needed
  }).then(response => {
    const values = response.result.values || [];
    
    // Clear current checks
    dailyChecks = [];
    
    // Process data
    if (values.length > 0) {
      values.forEach(row => {
        // Convert spreadsheet row to daily check item
        const check = {
          date: row[0],
          room: row[1],
          cageCount: parseInt(row[2]),
          temperature: parseFloat(row[3]),
          humidity: parseFloat(row[4]),
          notes: row[5] || ''
        };
        dailyChecks.push(check);
      });
    }
  });
}

// 6. Save mouse removal to Google Sheets
function saveMouseRemoval(room, rack, column, row, strain, gender, birthdate, quantity, researcher) {
  const timestamp = new Date().toISOString();
  
  // Add entry to removal log
  gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: 'YOUR_SPREADSHEET_ID',
    range: 'Removals!A:I',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: [
        [timestamp, room, rack, column, row, strain, gender, birthdate, quantity, researcher]
      ]
    }
  }).then(() => {
    console.log('Removal logged successfully');
    
    // Now update inventory by removing the mice
    updateInventory(room, rack, column, row, strain, gender, birthdate, -quantity);
    
    // Then sync the updated inventory to Google Sheets
    syncInventoryToSheet();
  });
}

// 7. Save daily check to Google Sheets
function saveDailyCheck(date, room, cageCount, temperature, humidity, notes) {
  const timestamp = new Date().toISOString();
  
  gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: 'YOUR_SPREADSHEET_ID',
    range: 'DailyChecks!A:G',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: [
        [timestamp, date, room, cageCount, temperature, humidity, notes]
      ]
    }
  }).then(() => {
    console.log('Daily check logged successfully');
  });
}

// 8. Sync inventory data to Google Sheets
function syncInventoryToSheet() {
  // First, clear the current inventory
  gapi.client.sheets.spreadsheets.values.clear({
    spreadsheetId: 'YOUR_SPREADSHEET_ID',
    range: 'Inventory!A2:H'
  }).then(() => {
    // Then add the current inventory data
    const values = mouseInventory.map(item => [
      item.room,
      item.rack,
      item.column,
      item.row,
      item.strain,
      item.gender,
      item.birthdate,
      item.count
    ]);
    
    gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: 'YOUR_SPREADSHEET_ID',
      range: 'Inventory!A2:H',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: values
      }
    }).then(() => {
      console.log('Inventory synced successfully');
    });
  });
}

// 9. Add authentication UI elements to HTML
// Add this to your HTML:
/*
<div id="auth-status">
  <button id="authorize_button" style="display: none;">Authorize</button>
  <button id="signout_button" style="display: none;">Sign Out</button>
</div>
<div id="content" style="display: none;">
  <!-- Your app content here -->
</div>
*/

// 10. Update the form submissions to use Google Sheets
// Replace the existing form submission handler with:
document.getElementById('removeMouseForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  // Get form values
  const room = document.getElementById('room').value;
  const rack = document.getElementById('rack').value;
  const column = document.getElementById('column').value;
  const row = document.getElementById('row').value;
  const gender = document.getElementById('gender').value;
  const birthdate = document.getElementById('birthdate').value;
  const strain = document.getElementById('strain').value;
  const quantity = parseInt(document.getElementById('quantity').value);
  const researcher = document.getElementById('researcher').value;
  
  // Update inventory through Google Sheets
  saveMouseRemoval(room, rack, column, row, strain, gender, birthdate, quantity, researcher);
  
  // Show success message
  const successMsg = document.getElementById('removeSuccess');
  successMsg.style.display = 'block';
  setTimeout(() => {
    successMsg.style.display = 'none';
  }, 3000);
  
  // Reset form
  this.reset();
});

document.getElementById('dailyCheckForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  // Get form values
  const checkDate = document.getElementById('checkDate').value;
  const room = document.getElementById('checkRoom').value;
  const cageCount = document.getElementById('cageCount').value;
  const temperature = document.getElementById('temperature').value;
  const humidity = document.getElementById('humidity').value;
  const notes = document.getElementById('notes').value;
  
  // Save the daily check to Google Sheets
  saveDailyCheck(checkDate, room, cageCount, temperature, humidity, notes);
  
  // Show success message
  const successMsg = document.getElementById('checkSuccess');
  successMsg.style.display = 'block';
  setTimeout(() => {
    successMsg.style.display = 'none';
  }, 3000);
  
  // Reset form
  this.reset();
});

// 11. Initialize Google API on page load
// Add this to your HTML:
// <body onload="loadGoogleAPI()">
