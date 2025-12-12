// Dashboard JavaScript
document.addEventListener('DOMContentLoaded', () => {
  console.log('Dashboard loaded');

  // Example: Fetch data from API
  fetch('/api/dashboard')
    .then(response => response.json())
    .then(data => {
      document.getElementById('content').innerHTML = `<p>${data.message}</p>`;
    })
    .catch(error => console.error('Error:', error));
});
